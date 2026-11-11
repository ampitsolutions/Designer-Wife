import { REPEAT_WINDOW_DAYS } from '@/config';
import { daysBetween } from './dates';

type EventLike = { id: string; title: string; event_date: string; outfit_id: string | null };

export type Repeat = { event: EventLike; days: number };

/**
 * Other events using the same outfit within REPEAT_WINDOW_DAYS of this date (before or after).
 * Closest first.
 */
export function findRepeats(
  all: EventLike[],
  outfitId: string | null,
  date: string,
  excludeId?: string,
): Repeat[] {
  if (!outfitId) return [];
  return all
    .filter((e) => e.id !== excludeId && e.outfit_id === outfitId)
    .map((e) => ({ event: e, days: daysBetween(e.event_date, date) }))
    .filter((r) => Math.abs(r.days) <= REPEAT_WINDOW_DAYS)
    .sort((a, b) => Math.abs(a.days) - Math.abs(b.days));
}

export const repeatText = (r: Repeat) => {
  const n = Math.abs(r.days);
  if (n === 0) return `Also used for "${r.event.title}" the same day`;
  return r.days > 0
    ? `Worn ${n} day${n === 1 ? '' : 's'} earlier for "${r.event.title}"`
    : `Planned ${n} day${n === 1 ? '' : 's'} later for "${r.event.title}"`;
};
