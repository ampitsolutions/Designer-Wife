import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Item } from './items';
import { listMyItems } from './items';
import { photoUrls } from './photos';

/**
 * Shared copies of closets (yours and any you manage), used by every screen.
 * Call refreshCloset(personId) after changes. Photo links are shared across closets.
 */
type Closet = { items: Item[]; loading: boolean; error: string | null; loadedAt: number };
type State = { closets: Record<string, Closet>; urls: Record<string, string> };

const emptyCloset: Closet = { items: [], loading: false, error: null, loadedAt: 0 };
let state: State = { closets: {}, urls: {} };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const setCloset = (id: string, patch: Partial<Closet>) => {
  state = { ...state, closets: { ...state.closets, [id]: { ...(state.closets[id] ?? emptyCloset), ...patch } } };
  emit();
};
const addUrls = (fresh: Record<string, string>) => {
  if (!Object.keys(fresh).length) return;
  state = { ...state, urls: { ...state.urls, ...fresh } };
  emit();
};

const inflight = new Map<string, Promise<void>>();

export function refreshCloset(personId: string): Promise<void> {
  const running = inflight.get(personId);
  if (running) return running;
  setCloset(personId, { loading: true });
  const p = (async () => {
    try {
      const items = await listMyItems(personId);
      const missing = items.map((i) => i.photo_key).filter((k): k is string => !!k && !state.urls[k]);
      addUrls(await photoUrls(missing));
      setCloset(personId, { items, error: null, loadedAt: Date.now() });
    } catch (e) {
      setCloset(personId, { error: e instanceof Error ? e.message : String(e) });
    } finally {
      setCloset(personId, { loading: false });
      inflight.delete(personId);
    }
  })();
  inflight.set(personId, p);
  return p;
}

/** Loads a closet if it isn't loaded yet; returns its active items. */
export async function loadCloset(personId: string): Promise<Item[]> {
  if (!state.closets[personId]?.loadedAt) await refreshCloset(personId);
  return (state.closets[personId]?.items ?? []).filter((i) => i.status === 'active');
}

/** Signed URLs for photos not loaded yet (e.g. partner's items in a shared outfit). */
export async function ensureUrls(keys: (string | null | undefined)[]) {
  const missing = [...new Set(keys.filter((k): k is string => !!k && !state.urls[k]))];
  if (!missing.length) return;
  addUrls(await photoUrls(missing));
}

export function clearCloset() {
  state = { closets: {}, urls: {} };
  emit();
}

/** Finds an item in any loaded closet. */
export const findItem = (id: string): Item | undefined => {
  for (const c of Object.values(state.closets)) {
    const hit = c.items.find((i) => i.id === id);
    if (hit) return hit;
  }
  return undefined;
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** One person's closet. `items` = in the closet now; `all` also includes things set aside to donate or sell. */
export function useCloset(personId: string | null | undefined) {
  const snap = useSyncExternalStore(subscribe, () => state);
  const closet = (personId && snap.closets[personId]) || emptyCloset;

  useEffect(() => {
    if (personId && !closet.loadedAt && !closet.loading && !closet.error) refreshCloset(personId);
  }, [personId, closet.loadedAt, closet.loading, closet.error]);

  const refresh = useCallback(() => (personId ? refreshCloset(personId) : Promise.resolve()), [personId]);
  // Look up across all loaded closets so mixed outfits (e.g. a couple look) resolve.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const byId = useCallback((id: string) => findItem(id), [snap]);
  const active = useMemo(() => closet.items.filter((i) => i.status === 'active'), [closet.items]);

  return { ...closet, all: closet.items, items: active, refresh, byId };
}

/** Just the photo URL map, for screens that show items from anywhere. */
export const usePhotoUrls = () => useSyncExternalStore(subscribe, () => state.urls);
