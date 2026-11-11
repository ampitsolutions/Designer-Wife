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
  status: ItemStatus;
  keep_until: string | null;
  brand: string | null;
  size: string | null;
  retailer: string | null;
  purchased_on: string | null;
  source: string;
  created_at: string;
};

export type ItemStatus = 'active' | 'donate' | 'sell';

export type ItemFields = Pick<
  Item,
  'name' | 'type' | 'colours' | 'tags' | 'occasions' | 'seasons' | 'formality' | 'notes'
>;

const COLUMNS =
  'id, owner_id, name, photo_key, type, colours, tags, occasions, seasons, formality, notes, ' +
  'status, keep_until, brand, size, retailer, purchased_on, source, created_at';

/** Extra fields that can be set when creating an item (e.g. from an order). */
export type ItemExtras = Partial<Pick<Item, 'brand' | 'size' | 'retailer' | 'purchased_on' | 'source'>>;

/** Whose closet a new item goes into (yours, or one you manage). */
export type ItemOwner = { owner_id: string };

export async function listMyItems(userId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select(COLUMNS)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as Item[];
}

export async function getItem(id: string): Promise<Item> {
  const { data, error } = await supabase.from('items').select(COLUMNS).eq('id', id).single();
  if (error) throw error;
  return data as unknown as Item;
}

export async function createItem(
  fields: ItemFields & ItemExtras & ItemOwner & { photo_key: string | null },
): Promise<string> {
  const { data, error } = await supabase.from('items').insert(fields).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function setItemPhoto(id: string, photo_key: string) {
  const { error } = await supabase.from('items').update({ photo_key }).eq('id', id);
  if (error) throw error;
}

export async function setItemStatus(id: string, status: ItemStatus, keep_until: string | null = null) {
  const { error } = await supabase.from('items').update({ status, keep_until }).eq('id', id);
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
