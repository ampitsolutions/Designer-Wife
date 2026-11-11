import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Item } from './items';
import { listMyItems } from './items';
import { photoUrls } from './photos';

/**
 * One shared copy of the signed-in user's closet, used by every screen
 * (closet grid, outfit builder, trip planner). Call refreshCloset() after changes.
 */
type State = {
  userId: string | null;
  items: Item[];
  urls: Record<string, string>;
  loading: boolean;
  error: string | null;
  loadedAt: number;
};

let state: State = { userId: null, items: [], urls: {}, loading: false, error: null, loadedAt: 0 };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

let inflight: Promise<void> | null = null;

export function refreshCloset(userId: string): Promise<void> {
  if (inflight && state.userId === userId) return inflight;
  if (state.userId !== userId) set({ userId, items: [], urls: {}, loadedAt: 0 });
  set({ loading: true });
  inflight = (async () => {
    try {
      const items = await listMyItems(userId);
      const missing = items
        .map((i) => i.photo_key)
        .filter((k): k is string => !!k && !state.urls[k]);
      const fresh = await photoUrls(missing);
      set({ items, urls: { ...state.urls, ...fresh }, error: null, loadedAt: Date.now() });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      set({ loading: false });
      inflight = null;
    }
  })();
  return inflight;
}

/** Signed URLs for photos not in this user's closet (e.g. partner's items in a shared outfit). */
export async function ensureUrls(keys: (string | null | undefined)[]) {
  const missing = [...new Set(keys.filter((k): k is string => !!k && !state.urls[k]))];
  if (!missing.length) return;
  const fresh = await photoUrls(missing);
  set({ urls: { ...state.urls, ...fresh } });
}

export function clearCloset() {
  set({ userId: null, items: [], urls: {}, loading: false, error: null, loadedAt: 0 });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useCloset(userId: string | undefined) {
  const snap = useSyncExternalStore(subscribe, () => state);

  useEffect(() => {
    if (userId && (snap.userId !== userId || !snap.loadedAt)) refreshCloset(userId);
  }, [userId, snap.userId, snap.loadedAt]);

  const refresh = useCallback(() => (userId ? refreshCloset(userId) : Promise.resolve()), [userId]);
  const byId = useCallback((id: string) => snap.items.find((i) => i.id === id), [snap.items]);
  // `items` = what's in the closet now; `all` also includes things set aside to donate or sell.
  const active = useMemo(() => snap.items.filter((i) => i.status === 'active'), [snap.items]);

  return { ...snap, all: snap.items, items: active, refresh, byId };
}

/** Just the photo URL map, for screens that show items from elsewhere. */
export const usePhotoUrls = () => useSyncExternalStore(subscribe, () => state.urls);
