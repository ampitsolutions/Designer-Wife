import { DECLUTTER_NEVER_WORN_MONTHS, DECLUTTER_UNWORN_MONTHS } from '@/config';

type ItemLike = { id: string; status: string; keep_until: string | null; created_at: string };
type WearLike = { last_worn: string };

export type Suggestion<T> = { item: T; reason: string; months: number };

/** Months between two "YYYY-MM-DD" dates, rounded down. */
export function monthsBetween(from: string, to: string) {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/**
 * Items worth reconsidering: not worn in DECLUTTER_UNWORN_MONTHS, or never worn and in the
 * closet for DECLUTTER_NEVER_WORN_MONTHS. Skips items set aside or snoozed with "Keep".
 * Longest-unworn first.
 */
export function declutterSuggestions<T extends ItemLike>(
  items: T[],
  wear: Record<string, WearLike | undefined>,
  today: string,
): Suggestion<T>[] {
  const out: Suggestion<T>[] = [];
  for (const item of items) {
    if (item.status !== 'active') continue;
    if (item.keep_until && item.keep_until > today) continue;
    const w = wear[item.id];
    if (w) {
      const m = monthsBetween(w.last_worn, today);
      if (m >= DECLUTTER_UNWORN_MONTHS) out.push({ item, months: m, reason: `Not worn in ${plural(m, 'month')}` });
    } else {
      const m = monthsBetween(item.created_at.slice(0, 10), today);
      if (m >= DECLUTTER_NEVER_WORN_MONTHS)
        out.push({ item, months: m, reason: `Never worn · added ${plural(m, 'month')} ago` });
    }
  }
  return out.sort((a, b) => b.months - a.months);
}
