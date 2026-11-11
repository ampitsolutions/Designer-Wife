import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ItemThumb } from '@/components/ItemThumb';
import { Banner, Button } from '@/components/ui';
import { planTrip } from '@/lib/ai';
import { useAuth } from '@/lib/auth';
import { useCloset } from '@/lib/closet';
import { formatDate, formatRange } from '@/lib/dates';
import { listProfiles, profileName, type Profile } from '@/lib/profiles';
import {
  addMember,
  applyPlan,
  getTrip,
  listDayItems,
  listDays,
  listMembers,
  listPacking,
  removeMember,
  saveWeather,
  type DayItem,
  type PackingItem,
  type Trip,
  type TripDay,
} from '@/lib/trips';
import { describe, tripWeather, weatherLine } from '@/lib/weather';

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const me = session?.user.id;
  const closet = useCloset(me);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<TripDay[]>([]);
  const [dayItems, setDayItems] = useState<DayItem[]>([]);
  const [packing, setPacking] = useState<PackingItem[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [weatherState, setWeatherState] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, d, p, m, pr] = await Promise.all([getTrip(id), listDays(id), listPacking(id), listMembers(id), listProfiles()]);
      setTrip(t);
      setDays(d);
      setPacking(p);
      setMembers(m);
      setProfiles(pr);
      setDayItems(await listDayItems(d.map((x) => x.id)));
      return { t, d };
    } catch (e) {
      Alert.alert('Could not load trip', e instanceof Error ? e.message : String(e));
      router.back();
      return null;
    }
  }, [id]);

  const refreshWeather = useCallback(async (t: Trip, d: TripDay[]) => {
    if (t.latitude == null || t.longitude == null || !t.start_date || !t.end_date || !d.length) return;
    setWeatherState('loading');
    try {
      const w = await tripWeather(
        { label: t.place_label ?? '', latitude: t.latitude, longitude: t.longitude },
        t.start_date,
        t.end_date,
      );
      await saveWeather(d, w);
      setDays(await listDays(t.id));
      setWeatherState('idle');
    } catch {
      setWeatherState('failed');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().then((r) => {
        // Fetch weather once if any day is missing it.
        if (r && r.d.some((x) => !x.weather)) refreshWeather(r.t, r.d);
      });
    }, [load, refreshWeather]),
  );

  async function runPlan() {
    if (!trip || !me) return;
    if (!closet.items.length) return Alert.alert('Your closet is empty', 'Add some clothes first.');
    setPlanning(true);
    setPlanError(null);
    try {
      const plan = await planTrip({
        destination: trip.place_label ?? trip.destination ?? undefined,
        itinerary: trip.itinerary ?? undefined,
        days: days.map((d) => ({
          date: d.day_date,
          weather: d.weather ? weatherLine(d.weather) : undefined,
          activities: d.activities ?? undefined,
        })),
        closet: closet.items,
      });
      await applyPlan(trip.id, me, days, plan);
      await load();
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : String(e));
    } finally {
      setPlanning(false);
    }
  }

  function confirmPlan() {
    const hasPlan = dayItems.some((d) => d.user_id === me);
    if (!hasPlan) return runPlan();
    Alert.alert(
      'Replace your plan?',
      'The AI will re-pick your outfits for every day. Packing lines you added yourself or already ticked are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', onPress: runPlan },
      ],
    );
  }

  async function toggleShare(p: Profile) {
    if (!trip) return;
    const on = members.includes(p.id);
    try {
      if (on) await removeMember(trip.id, p.id);
      else await addMember(trip.id, p.id);
      setMembers(await listMembers(trip.id));
    } catch (e) {
      Alert.alert('Could not update sharing', e instanceof Error ? e.message : String(e));
    }
  }

  if (!trip) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  const isOwner = trip.owner_id === me;
  const others = profiles.filter((p) => p.id !== me);
  const packed = packing.filter((p) => p.packed).length;
  const myPlanned = new Set(dayItems.filter((d) => d.user_id === me).map((d) => d.trip_day_id));

  return (
    <>
      <Stack.Screen
        options={{
          title: trip.name,
          headerRight: () => (
            <Pressable onPress={() => router.push({ pathname: '/trip/edit', params: { id: trip.id } })} hitSlop={12}>
              <Text style={styles.headerBtn}>Edit</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.meta}>
          {[trip.place_label || trip.destination, formatRange(trip.start_date, trip.end_date)].filter(Boolean).join(' · ')}
        </Text>

        {/* Sharing */}
        {isOwner ? (
          others.map((p) => {
            const on = members.includes(p.id);
            return (
              <Pressable key={p.id} style={styles.shareRow} onPress={() => toggleShare(p)}>
                <Text style={styles.shareText}>
                  {on ? `Shared with ${profileName(p)}` : `Share with ${profileName(p)}`}
                </Text>
                <Text style={styles.shareAction}>{on ? 'Stop sharing' : 'Share'}</Text>
              </Pressable>
            );
          })
        ) : (
          <Text style={styles.meta}>
            Shared with you by {profileName(profiles.find((p) => p.id === trip.owner_id))}. Your outfit plan and packing lines are your own.
          </Text>
        )}

        {/* Main actions */}
        <View style={styles.row}>
          <Button title={planning ? 'Planning…' : '✨ Plan outfits & packing'} onPress={confirmPlan} busy={planning} disabled={!days.length} />
        </View>
        <View style={styles.row}>
          <Button
            title={`Packing list${packing.length ? ` (${packed}/${packing.length})` : ''}`}
            variant="secondary"
            onPress={() => router.push(`/trip/packing/${trip.id}`)}
          />
        </View>
        {planning && (
          <Banner>
            <ActivityIndicator size="small" />
            <Text style={{ flexShrink: 1 }}>Picking outfits for {days.length} days from {closet.items.length} items. This can take up to a minute.</Text>
          </Banner>
        )}
        {planError && (
          <Banner tone="warn">
            <Text style={{ flexShrink: 1 }}>{planError}</Text>
          </Banner>
        )}
        {!days.length && (
          <Banner tone="warn">
            <Text style={{ flexShrink: 1 }}>Add start and end dates (Edit) to plan each day.</Text>
          </Banner>
        )}
        {trip.latitude == null && days.length > 0 && (
          <Banner tone="warn">
            <Text style={{ flexShrink: 1 }}>No weather: add a destination city (Edit).</Text>
          </Banner>
        )}
        {weatherState === 'loading' && (
          <Banner>
            <ActivityIndicator size="small" />
            <Text>Checking the weather…</Text>
          </Banner>
        )}
        {weatherState === 'failed' && (
          <Pressable onPress={() => refreshWeather(trip, days)}>
            <Banner tone="warn">
              <Text>Couldn't get the weather. Tap to retry.</Text>
            </Banner>
          </Pressable>
        )}

        {/* Days */}
        {days.map((d) => {
          const mine = dayItems
            .filter((x) => x.trip_day_id === d.id && x.user_id === me)
            .map((x) => closet.byId(x.item_id))
            .filter((i) => !!i);
          const partnerCount = dayItems.filter((x) => x.trip_day_id === d.id && x.user_id !== me).length;
          const w = d.weather;
          return (
            <Pressable key={d.id} style={styles.day} onPress={() => router.push(`/trip/day/${d.id}`)}>
              <View style={styles.dayHead}>
                <Text style={styles.dayDate}>{formatDate(d.day_date)}</Text>
                {w && (
                  <Text style={styles.weather}>
                    {describe(w.code).icon} {w.min}–{w.max}°C{w.typical ? ' (typical)' : ''}
                  </Text>
                )}
              </View>
              {d.activities ? <Text style={styles.activities}>{d.activities}</Text> : null}
              {d.plan ? <Text style={styles.note}>{d.plan}</Text> : null}
              {mine.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {mine.map((it) => (
                    <ItemThumb key={it!.id} item={it!} size={64} />
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.hint}>{myPlanned.has(d.id) ? '' : 'Tap to choose what to wear'}</Text>
              )}
              {partnerCount > 0 && <Text style={styles.hint}>Partner has {partnerCount} item{partnerCount === 1 ? '' : 's'} planned</Text>}
            </Pressable>
          );
        })}

        {trip.latitude != null && days.length > 0 && weatherState === 'idle' && (
          <Pressable onPress={() => refreshWeather(trip, days)} style={styles.refresh}>
            <Text style={styles.refreshText}>Refresh weather</Text>
          </Pressable>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 12, paddingBottom: 48 },
  headerBtn: { fontSize: 17, color: '#0a7aff' },
  meta: { color: '#555' },
  row: { flexDirection: 'row', gap: 12 },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 12,
  },
  shareText: { fontSize: 15 },
  shareAction: { color: '#0a7aff', fontWeight: '600' },
  day: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, gap: 6 },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayDate: { fontSize: 16, fontWeight: '700' },
  weather: { color: '#333' },
  activities: { color: '#333' },
  note: { color: '#6b5b2e', fontStyle: 'italic' },
  hint: { color: '#888' },
  refresh: { alignSelf: 'center', padding: 8 },
  refreshText: { color: '#0a7aff' },
});
