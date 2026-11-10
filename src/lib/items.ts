import { supabase } from './supabase';

export type Item = {
  id: string;
  owner_id: string;
  name: string | null;
  photo_key: string | null;
  type: string | null;
  colours: string[];
  tags: string[];
  occasions: string[];
  seasons: string[];
  formality: string | null;
  notes: string | null;
  created_at: string;
};

export type ItemFields = Pick<
  Item,
  'name' | 'type' | 'colours' | 'tags' | 'occasions' | 'seasons' | 'formality' | 'notes'
>;

const COLUMNS =
  'id, owner_id, name, photo_key, type, colours, tags, occasions, seasons, formality, notes, created_at';

export async function listMyItems(userId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select(COLUMNS)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Item[];
}

export async function getItem(id: string): Promise<Item> {
  const { data, error } = await supabase.from('items').select(COLUMNS).eq('id', id).single();
  if (error) throw error;
  return data as Item;
}

export async function createItem(fields: ItemFields & { photo_key: string }) {
  const { error } = await supabase.from('items').insert(fields);
  if (error) throw error;
}

export async function updateItem(id: string, fields: ItemFields) {
  const { error } = await supabase.from('items').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteItem(id: string) {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
}
