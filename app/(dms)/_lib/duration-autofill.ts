import { minutesBetween } from '@/lib/dms/kpi';
import { readEntryTime } from './entry-time';

/**
 * The stoppage duration worked out from the start and end times, as HH:MM, or
 * null when it cannot be: either time unreadable, or the two equal (a duration
 * of zero is not a valid one). An end earlier than the start crosses midnight,
 * the same rule the KPI engine uses.
 */
export function autoDuration(startText: string, endText: string): string | null {
  const start = readEntryTime(startText);
  const end = readEntryTime(endText);
  if (start.status !== 'ok' || end.status !== 'ok') return null;
  const minutes = minutesBetween(start.value, end.value);
  if (minutes === null || minutes === 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * What the duration field holds. A duration the operator typed is never
 * replaced; until one is typed, the field follows the two times. A saved
 * stoppage opened for editing counts as typed, because a stored duration
 * cannot be told apart from a typed one. Clearing the field hands it back to
 * the times.
 */
export function durationFieldValue(
  typed: boolean,
  typedValue: string,
  startText: string,
  endText: string,
): string {
  return typed ? typedValue : (autoDuration(startText, endText) ?? '');
}

/** True when an edit to the duration field means the operator has typed one. */
export function isTypedDuration(value: string): boolean {
  return value.trim().length > 0;
}
