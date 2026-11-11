import { useCallback, useEffect, useState } from 'react';
import { today } from './dates';
import { supabase } from './supabase';

export type Wear = { last_worn: string; times_worn: number };

/** Records that these items were worn on a date (default today). Re-logging the same day is ignored. */
export async function logWear(itemIds: string[], date = today()) {
  if (!itemIds.length) return;
  const { error } = await supabase
    .from('wear_logs')
    .upsert(
      itemIds.map((item_id) => ({ item_id, worn_on: date })),
      { onConflict: 'item_id,worn_on', ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function unlogWear(itemId: string, date = today()) {
  const { error } = await supabase.from('wear_logs').delete().eq('item_id', itemId).eq('worn_on', date);
  if (error) throw error;
}

/** item id → last worn date and count, for all my items. */
export async function listWear(): Promise<Record<string, Wear>> {
  const { data, error } = await supabase.from('item_wear').select('item_id, last_worn, times_worn');
  if (error) throw error;
  const map: Record<string, Wear> = {};
  for (const r of data ?? []) map[r.item_id as string] = { last_worn: r.last_worn as string, times_worn: r.times_worn as number };
  return map;
}

export function useWear() {
  const [wear, setWear] = useState<Record<string, Wear>>({});
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setWear(await listWear());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);
  return { wear, loading, reload };
}

export function wornText(w: Wear | undefined) {
  if (!w) return 'Not worn yet';
  const t = today();
  const when = w.last_worn === t ? 'today' : w.last_worn;
  return `Worn ${w.times_worn} time${w.times_worn === 1 ? '' : 's'} · last ${when}`;
}
