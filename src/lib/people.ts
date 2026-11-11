import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useAuth } from './auth';
import { listProfiles, type Profile } from './profiles';
import { supabase } from './supabase';

/**
 * Whose closet you're working in, and whose closets you can manage.
 * "People" = you + everyone who has granted you access to their closet.
 */
export type Person = { id: string; name: string; isMe: boolean };

type State = { activeId: string | null; people: Person[]; grantedTo: string[]; profiles: Profile[]; loadedFor: string | null };
let state: State = { activeId: null, people: [], grantedTo: [], profiles: [], loadedFor: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export async function loadPeople(me: string) {
  const [profiles, { data, error }] = await Promise.all([
    listProfiles(),
    supabase.from('closet_managers').select('owner_id, manager_id'),
  ]);
  if (error) throw error;
  const rows = (data ?? []) as { owner_id: string; manager_id: string }[];
  const name = (id: string) => profiles.find((p) => p.id === id)?.display_name || 'Partner';
  const managed = rows.filter((r) => r.manager_id === me).map((r) => r.owner_id);
  const people: Person[] = [
    { id: me, name: name(me), isMe: true },
    ...managed.map((id) => ({ id, name: name(id), isMe: false })),
  ];
  const activeStillValid = state.activeId && people.some((p) => p.id === state.activeId);
  set({
    people,
    profiles,
    grantedTo: rows.filter((r) => r.owner_id === me).map((r) => r.manager_id),
    activeId: activeStillValid ? state.activeId : me,
    loadedFor: me,
  });
}

export function clearPeople() {
  set({ activeId: null, people: [], grantedTo: [], profiles: [], loadedFor: null });
}

/** Give or take away someone's access to manage MY closet. */
export async function setManager(me: string, managerId: string, allowed: boolean) {
  const { error } = allowed
    ? await supabase.from('closet_managers').insert({ owner_id: me, manager_id: managerId })
    : await supabase.from('closet_managers').delete().eq('owner_id', me).eq('manager_id', managerId);
  if (error) throw error;
  await loadPeople(me);
}

/** Stop managing someone else's closet. */
export async function stepDown(me: string, ownerId: string) {
  const { error } = await supabase.from('closet_managers').delete().eq('owner_id', ownerId).eq('manager_id', me);
  if (error) throw error;
  await loadPeople(me);
}

export function usePeople() {
  const { session } = useAuth();
  const me = session?.user.id;
  const snap = useSyncExternalStore(subscribe, () => state);

  useEffect(() => {
    if (me && snap.loadedFor !== me) loadPeople(me).catch(() => {});
  }, [me, snap.loadedFor]);

  const activeId = snap.activeId ?? me ?? null;
  const active = snap.people.find((p) => p.id === activeId) ?? (me ? { id: me, name: 'Me', isMe: true } : null);
  const setActive = useCallback((id: string) => set({ activeId: id }), []);
  const nameOf = useCallback(
    (id: string | null | undefined) =>
      !id ? '' : id === me ? 'You' : snap.profiles.find((p) => p.id === id)?.display_name || 'Partner',
    [me, snap.profiles],
  );
  const canManage = useCallback((id: string | null | undefined) => !!id && snap.people.some((p) => p.id === id) , [snap.people]);

  return {
    me,
    people: snap.people.length ? snap.people : me ? [{ id: me, name: 'Me', isMe: true }] : [],
    active,
    activeId,
    setActive,
    grantedTo: snap.grantedTo,
    profiles: snap.profiles,
    nameOf,
    canManage: (id: string | null | undefined) => (id && id === me) || canManage(id),
    reload: () => (me ? loadPeople(me) : Promise.resolve()),
  };
}
