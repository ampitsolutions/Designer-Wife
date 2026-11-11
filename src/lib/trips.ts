import type { TripPlan } from './ai';
import { dateRange } from './dates';
import { supabase } from './supabase';
import type { DayWeather } from './weather';

export type Trip = {
  id: string;
  owner_id: string;
  name: string;
  destination: string | null;
  place_label: string | null;
  latitude: number | null;
  longitude: number | null;
  start_date: string | null;
  end_date: string | null;
  itinerary: string | null;
  created_at: string;
};

export type TripFields = Pick<
  Trip,
  'name' | 'destination' | 'place_label' | 'latitude' | 'longitude' | 'start_date' | 'end_date' | 'itinerary'
>;

export type TripDay = {
  id: string;
  trip_id: string;
  day_date: string;
  activities: string | null;
  plan: string | null;
  weather: DayWeather | null;
};

export type DayItem = { trip_day_id: string; user_id: string; item_id: string };

export type PackingItem = {
  id: string;
  trip_id: string;
  owner_id: string;
  item_id: string | null;
  label: string;
  quantity: number;
  packed: boolean;
  from_ai: boolean;
};

const TRIP_COLS =
  'id, owner_id, name, destination, place_label, latitude, longitude, start_date, end_date, itinerary, created_at';

export async function listTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_COLS)
    .order('start_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data as Trip[];
}

export async function getTrip(id: string): Promise<Trip> {
  const { data, error } = await supabase.from('trips').select(TRIP_COLS).eq('id', id).single();
  if (error) throw error;
  return data as Trip;
}

export async function createTrip(fields: TripFields): Promise<string> {
  const { data, error } = await supabase.from('trips').insert(fields).select('id').single();
  if (error) throw error;
  await syncDays(data.id, fields.start_date, fields.end_date);
  return data.id;
}

export async function updateTrip(id: string, fields: TripFields) {
  const { error } = await supabase.from('trips').update(fields).eq('id', id);
  if (error) throw error;
  await syncDays(id, fields.start_date, fields.end_date);
}

export async function deleteTrip(id: string) {
  const { error } = await supabase.from('trips').delete().eq('id', id);
  if (error) throw error;
}

/** Makes trip_days match the date range: adds missing days, removes days outside it. */
async function syncDays(tripId: string, start: string | null, end: string | null) {
  const { data, error } = await supabase.from('trip_days').select('id, day_date').eq('trip_id', tripId);
  if (error) throw error;
  const wanted = new Set(start && end ? dateRange(start, end) : []);
  const have = new Set((data ?? []).map((d) => d.day_date as string));

  const stale = (data ?? []).filter((d) => !wanted.has(d.day_date)).map((d) => d.id);
  if (stale.length) {
    const { error: e } = await supabase.from('trip_days').delete().in('id', stale);
    if (e) throw e;
  }
  const missing = [...wanted].filter((d) => !have.has(d)).map((day_date) => ({ trip_id: tripId, day_date }));
  if (missing.length) {
    const { error: e } = await supabase.from('trip_days').insert(missing);
    if (e) throw e;
  }
}

export async function listDays(tripId: string): Promise<TripDay[]> {
  const { data, error } = await supabase
    .from('trip_days')
    .select('id, trip_id, day_date, activities, plan, weather')
    .eq('trip_id', tripId)
    .order('day_date');
  if (error) throw error;
  return data as TripDay[];
}

export async function updateDay(id: string, patch: Partial<Pick<TripDay, 'activities' | 'plan' | 'weather'>>) {
  const { error } = await supabase.from('trip_days').update(patch).eq('id', id);
  if (error) throw error;
}

export async function saveWeather(days: TripDay[], weather: DayWeather[]) {
  const byDate = new Map(weather.map((w) => [w.date, w]));
  await Promise.all(
    days.filter((d) => byDate.has(d.day_date)).map((d) => updateDay(d.id, { weather: byDate.get(d.day_date)! })),
  );
}

export async function listDayItems(dayIds: string[]): Promise<DayItem[]> {
  if (!dayIds.length) return [];
  const { data, error } = await supabase
    .from('trip_day_items')
    .select('trip_day_id, user_id, item_id')
    .in('trip_day_id', dayIds);
  if (error) throw error;
  return data as DayItem[];
}

/** Replaces my items for one day. */
export async function setMyDayItems(dayId: string, userId: string, itemIds: string[]) {
  const { error } = await supabase.from('trip_day_items').delete().eq('trip_day_id', dayId).eq('user_id', userId);
  if (error) throw error;
  if (!itemIds.length) return;
  const { error: e } = await supabase
    .from('trip_day_items')
    .insert(itemIds.map((item_id) => ({ trip_day_id: dayId, item_id, user_id: userId })));
  if (e) throw e;
}

export async function listPacking(tripId: string): Promise<PackingItem[]> {
  const { data, error } = await supabase
    .from('packing_items')
    .select('id, trip_id, owner_id, item_id, label, quantity, packed, from_ai')
    .eq('trip_id', tripId)
    .order('created_at');
  if (error) throw error;
  return data as PackingItem[];
}

export async function addPacking(tripId: string, label: string, quantity = 1, itemId: string | null = null) {
  const { error } = await supabase
    .from('packing_items')
    .insert({ trip_id: tripId, label, quantity, item_id: itemId });
  if (error) throw error;
}

export async function setPacked(id: string, packed: boolean) {
  const { error } = await supabase.from('packing_items').update({ packed }).eq('id', id);
  if (error) throw error;
}

export async function deletePacking(id: string) {
  const { error } = await supabase.from('packing_items').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Saves an AI plan for me: replaces my outfits for each day, and replaces my
 * not-yet-packed AI packing lines (anything I added myself or already packed is kept).
 */
export async function applyPlan(tripId: string, userId: string, days: TripDay[], plan: TripPlan) {
  const dayByDate = new Map(days.map((d) => [d.day_date, d]));
  for (const p of plan.days) {
    const day = dayByDate.get(p.date);
    if (!day) continue;
    await setMyDayItems(day.id, userId, p.item_ids);
    await updateDay(day.id, { plan: p.note || null });
  }

  const { data: existing, error } = await supabase
    .from('packing_items')
    .select('id, item_id, label, packed, from_ai')
    .eq('trip_id', tripId)
    .eq('owner_id', userId);
  if (error) throw error;

  const replaceable = (existing ?? []).filter((p) => p.from_ai && !p.packed).map((p) => p.id);
  if (replaceable.length) {
    const { error: e } = await supabase.from('packing_items').delete().in('id', replaceable);
    if (e) throw e;
  }
  const kept = (existing ?? []).filter((p) => !replaceable.includes(p.id));
  const keptKeys = new Set(kept.map((p) => p.item_id ?? `label:${p.label.toLowerCase()}`));
  const rows = plan.packing
    .filter((p) => !keptKeys.has(p.item_id ?? `label:${p.label.toLowerCase()}`))
    .map((p) => ({ trip_id: tripId, item_id: p.item_id, label: p.label, quantity: p.quantity, from_ai: true }));
  if (rows.length) {
    const { error: e } = await supabase.from('packing_items').insert(rows);
    if (e) throw e;
  }
}

export async function listMembers(tripId: string): Promise<string[]> {
  const { data, error } = await supabase.from('trip_members').select('user_id').eq('trip_id', tripId);
  if (error) throw error;
  return (data ?? []).map((m) => m.user_id as string);
}

export async function addMember(tripId: string, userId: string) {
  const { error } = await supabase.from('trip_members').insert({ trip_id: tripId, user_id: userId });
  if (error) throw error;
}

export async function removeMember(tripId: string, userId: string) {
  const { error } = await supabase.from('trip_members').delete().eq('trip_id', tripId).eq('user_id', userId);
  if (error) throw error;
}
