import type { Item } from './items';
import { supabase } from './supabase';

export type Outfit = {
  id: string;
  owner_id: string;
  name: string | null;
  occasion: string | null;
  is_favourite: boolean;
  shared: boolean;
  created_at: string;
  items: Item[];
};

export type OutfitFields = {
  name: string | null;
  occasion: string | null;
  is_favourite: boolean;
  shared: boolean;
};

const SELECT =
  'id, owner_id, name, occasion, is_favourite, shared, created_at, ' +
  'outfit_items ( items ( id, owner_id, name, photo_key, type, colours, tags, occasions, seasons, formality, notes, status, keep_until, brand, size, retailer, purchased_on, source, created_at ) )';

type Row = Omit<Outfit, 'items'> & { outfit_items: { items: Item | null }[] };

const toOutfit = (r: Row): Outfit => {
  const { outfit_items, ...rest } = r;
  return { ...rest, items: outfit_items.map((oi) => oi.items).filter((i): i is Item => !!i) };
};

/** My outfits plus outfits my partner shared (row level security decides what is visible). */
export async function listOutfits(): Promise<Outfit[]> {
  const { data, error } = await supabase
    .from('outfits')
    .select(SELECT)
    .order('is_favourite', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as Row[]).map(toOutfit);
}

export async function getOutfit(id: string): Promise<Outfit> {
  const { data, error } = await supabase.from('outfits').select(SELECT).eq('id', id).single();
  if (error) throw error;
  return toOutfit(data as unknown as Row);
}

async function setItems(outfitId: string, itemIds: string[]) {
  const { error: delErr } = await supabase.from('outfit_items').delete().eq('outfit_id', outfitId);
  if (delErr) throw delErr;
  if (!itemIds.length) return;
  const { error } = await supabase
    .from('outfit_items')
    .insert(itemIds.map((item_id) => ({ outfit_id: outfitId, item_id })));
  if (error) throw error;
}

export async function createOutfit(fields: OutfitFields, itemIds: string[]): Promise<string> {
  const { data, error } = await supabase.from('outfits').insert(fields).select('id').single();
  if (error) throw error;
  await setItems(data.id, itemIds);
  return data.id;
}

export async function updateOutfit(id: string, fields: OutfitFields, itemIds: string[]) {
  const { error } = await supabase.from('outfits').update(fields).eq('id', id);
  if (error) throw error;
  await setItems(id, itemIds);
}

export async function setFavourite(id: string, is_favourite: boolean) {
  const { error } = await supabase.from('outfits').update({ is_favourite }).eq('id', id);
  if (error) throw error;
}

export async function deleteOutfit(id: string) {
  const { error } = await supabase.from('outfits').delete().eq('id', id);
  if (error) throw error;
}
