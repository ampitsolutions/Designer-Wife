import { supabase } from './supabase';

export type CalendarEvent = {
  id: string;
  title: string;
  event_date: string;
  outfit_id: string | null;
  notes: string | null;
};

export type EventFields = Omit<CalendarEvent, 'id'>;

const COLS = 'id, title, event_date, outfit_id, notes';

export async function listEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await supabase.from('events').select(COLS).order('event_date');
  if (error) throw error;
  return data as CalendarEvent[];
}

export async function getEvent(id: string): Promise<CalendarEvent> {
  const { data, error } = await supabase.from('events').select(COLS).eq('id', id).single();
  if (error) throw error;
  return data as CalendarEvent;
}

export async function createEvent(fields: EventFields) {
  const { error } = await supabase.from('events').insert(fields);
  if (error) throw error;
}

export async function updateEvent(id: string, fields: EventFields) {
  const { error } = await supabase.from('events').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

export { findRepeats, repeatText, type Repeat } from './repeats';
