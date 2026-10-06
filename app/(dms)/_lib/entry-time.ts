import { toEnglishDigits } from './digits';

/**
 * A time of day as the DMS service accepts it for cycle phases and stoppages:
 * H:mm or HH:mm, hours 0–23, minutes 00–59, after Persian digits are
 * converted and surrounding spaces are trimmed. It is the service's own rule,
 * checked here so Save does not turn on for a time the service will refuse.
 *
 * An end earlier than its start is NOT refused: the phase crossed midnight.
 * This reads one time on its own and never compares two.
 */
const CLOCK = /^(\d{1,2}):(\d{2})$/;

export type TimeReading =
  | { status: 'empty' }
  | { status: 'invalid' }
  | { status: 'ok'; value: string };

export function readEntryTime(text: string): TimeReading {
  const value = toEnglishDigits(text).trim();
  if (value.length === 0) return { status: 'empty' };
  const match = CLOCK.exec(value);
  if (!match) return { status: 'invalid' };
  if (Number(match[1]) > 23 || Number(match[2]) > 59) return { status: 'invalid' };
  return { status: 'ok', value };
}
