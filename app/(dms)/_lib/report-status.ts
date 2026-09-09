import type { ReportStatus } from '@/lib/dms/types';

/**
 * One mapping from workflow status to how it is shown, shared by the operator
 * and supervisor screens. Two copies would drift, and the drift would be a
 * report that reads Approved on one screen and Submitted on the other.
 */
export const STATUS_BADGE: Record<
  ReportStatus,
  { variant: 'secondary' | 'warning' | 'success' | 'destructive'; key: string; fallback: string }
> = {
  Draft: { variant: 'secondary', key: 'statusDraft', fallback: 'Draft' },
  Submitted: { variant: 'warning', key: 'statusSubmitted', fallback: 'Submitted' },
  Approved: { variant: 'success', key: 'statusApproved', fallback: 'Approved' },
  Rejected: { variant: 'destructive', key: 'statusRejected', fallback: 'Rejected' },
};

/**
 * Minutes as `H:MM`.
 *
 * ⛔ ROUND THE TOTAL, NEVER THE REMAINDER. `%` preserves a fractional part, and
 * `padStart(2)` is a no-op on a string already longer than two characters, so a
 * non-integer input rendered raw: **`214.8` became `3:34.800000000000001` on the
 * customer's dashboard.**
 *
 * Rounding `m` alone would be the obvious fix and is wrong: `59.6` rounds to
 * `60` and yields `0:60`. Rounding the total cannot produce that, because the
 * division and the modulo then both operate on an integer.
 *
 * ⚠ AND THE ORIGINAL WAS NOT CARELESS — it was correct for its population.
 * The old doc comment read "for a per-row duration shown beside the times it
 * came from", and per-row durations are whole minutes. It was later called on
 * aggregated KPI totals, which are sums of decimal-hour conversions. **A
 * function correct for the population it was written for, reused on a different
 * one** — so the fix belongs here, where every caller gets it, rather than at
 * the call sites that happen to pass floats today.
 */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—';
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}
