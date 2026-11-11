import type { Item } from './items';

export type ClosetFilter = {
  query: string;
  types: string[];
  colours: string[];
  occasions: string[];
  seasons: string[];
};

export const emptyFilter: ClosetFilter = { query: '', types: [], colours: [], occasions: [], seasons: [] };

export const activeFilterCount = (f: ClosetFilter) =>
  f.types.length + f.colours.length + f.occasions.length + f.seasons.length;

const hasAny = (have: string[], want: string[]) =>
  want.length === 0 || want.some((w) => have.some((h) => h.toLowerCase() === w.toLowerCase()));

/** Text search matches name, type, colours, tags, occasions and notes. Filters match any selected value. */
export function filterItems(items: Item[], f: ClosetFilter): Item[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((i) => {
    if (f.types.length && !(i.type && f.types.includes(i.type))) return false;
    if (!hasAny(i.colours, f.colours)) return false;
    if (!hasAny(i.occasions, f.occasions)) return false;
    if (!hasAny(i.seasons, f.seasons)) return false;
    if (!words.length) return true;
    const hay = [i.name, i.type, i.notes, i.formality, ...i.colours, ...i.tags, ...i.occasions]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/** Distinct values used across the closet, most common first (for filter chips). */
export function distinctValues(items: Item[], pick: (i: Item) => string[]): string[] {
  const counts = new Map<string, number>();
  for (const i of items) for (const v of pick(i)) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
}
