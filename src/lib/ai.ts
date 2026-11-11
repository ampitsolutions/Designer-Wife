import { AI_FUNCTION, CLOTHING_TYPES, FORMALITY_LEVELS, SEASONS } from '@/config';
import type { Item } from './items';
import type { PreparedPhoto } from './photos';
import { supabase } from './supabase';

export type TagSuggestion = {
  name?: string;
  type?: string;
  colours?: string[];
  formality?: string;
  seasons?: string[];
  occasions?: string[];
  tags?: string[];
};

export type OutfitIdea = { name: string; item_ids: string[]; reason: string };

export type TripPlan = {
  days: { date: string; item_ids: string[]; note: string }[];
  packing: { item_id: string | null; label: string; quantity: number }[];
};

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(AI_FUNCTION, { body });
  if (error) {
    // Surface the function's own message (e.g. "AI is busy") when there is one.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      const msg = await ctx.json().then((j: { error?: string }) => j?.error).catch(() => null);
      if (msg) throw new Error(msg);
    }
    throw error;
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/** Only the fields the AI needs, to keep requests small. */
const compact = (items: Item[]) =>
  items.map(({ id, name, type, colours, tags, occasions, seasons, formality }) => ({
    id,
    name,
    type,
    colours,
    tags,
    occasions,
    seasons,
    formality,
  }));

/** Asks the AI to describe the item in the photo. */
export async function suggestTags(photo: PreparedPhoto): Promise<TagSuggestion> {
  const data = await call<{ suggestion?: TagSuggestion }>({
    action: 'tag',
    image: photo.base64,
    mimeType: 'image/jpeg',
    types: CLOTHING_TYPES,
    formalities: FORMALITY_LEVELS,
    seasons: SEASONS,
  });
  return data.suggestion ?? {};
}

/** Up to 3 outfit ideas for an occasion, using only the given closet items. */
export async function suggestOutfits(
  occasion: string,
  closet: Item[],
  opts: { date?: string; weather?: string } = {},
): Promise<OutfitIdea[]> {
  const data = await call<{ outfits?: OutfitIdea[] }>({
    action: 'outfits',
    occasion,
    ...opts,
    closet: compact(closet),
  });
  return data.outfits ?? [];
}

/** Day-by-day outfits and a packing list for a trip. */
export async function planTrip(input: {
  destination?: string;
  itinerary?: string;
  days: { date: string; weather?: string; activities?: string }[];
  closet: Item[];
}): Promise<TripPlan> {
  return call<TripPlan>({ action: 'trip', ...input, closet: compact(input.closet) });
}
