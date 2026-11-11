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

export class AiBusyError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Retries when the free AI tier says it's busy (rate limit), waiting longer each time. */
export async function withRetry<T>(fn: () => Promise<T>, tries = 3, waitMs = 20_000): Promise<T> {
  for (let n = 1; ; n++) {
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof AiBusyError) || n >= tries) throw e;
      await sleep(waitMs * n);
    }
  }
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(AI_FUNCTION, { body });
  if (error) {
    // Surface the function's own message (e.g. "AI is busy") when there is one.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      const msg = await ctx.json().then((j: { error?: string }) => j?.error).catch(() => null);
      if (ctx.status === 429) throw new AiBusyError(msg || 'AI is busy, try again in a minute');
      if (msg) throw new Error(msg);
    }
    throw error;
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/** Only the fields the AI needs, to keep requests small. `who` labels whose closet it is. */
const compact = (items: Item[], whoOf?: (ownerId: string) => string) =>
  items.map(({ id, owner_id, name, type, colours, tags, occasions, seasons, formality }) => ({
    id,
    who: whoOf ? whoOf(owner_id) : undefined,
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

/**
 * Up to 3 outfit ideas for an occasion, using only the given closet items.
 * With `together`, the closet holds two people's items (labelled by whoOf) and each idea is a coordinated pair.
 */
export async function suggestOutfits(
  occasion: string,
  closet: Item[],
  opts: { date?: string; weather?: string; together?: boolean; whoOf?: (ownerId: string) => string } = {},
): Promise<OutfitIdea[]> {
  const { whoOf, ...rest } = opts;
  const data = await withRetry(() =>
    call<{ outfits?: OutfitIdea[] }>({
      action: 'outfits',
      occasion,
      ...rest,
      closet: compact(closet, whoOf),
    }),
  );
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

export type OrderLine = {
  name: string;
  brand: string;
  retailer: string;
  type: string;
  colours: string[];
  size: string;
  quantity: number;
  order_date: string | null;
  formality: string;
  seasons: string[];
  occasions: string[];
  tags: string[];
  photo_image: number;
  photo_box: number[] | null;
};

/** Reads an order (screenshots, a PDF and/or pasted text) and lists the clothing items in it. */
export async function readOrder(input: {
  text?: string;
  images?: { data: string; mimeType: string }[];
  pdf?: { data: string };
}): Promise<OrderLine[]> {
  const data = await withRetry(() =>
    call<{ items?: OrderLine[] }>({
      action: 'order',
      ...input,
      types: CLOTHING_TYPES,
      formalities: FORMALITY_LEVELS,
      seasons: SEASONS,
    }),
  );
  return data.items ?? [];
}

