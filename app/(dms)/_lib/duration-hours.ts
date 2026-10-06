import { parseOptionalNumber, toEnglishDigits } from './digits';

/**
 * A stoppage duration, typed in HOURS either as a decimal (0.92, ۰٫۹۲) or as
 * hours and minutes, H:MM or HH:MM (00:55).
 *
 * Hours and minutes are converted to decimal hours rounded to 2 places,
 * because that is what the stored column holds: 00:55 is 0.92 h, 1:30 is
 * 1.5 h. Minutes must be 00–59. Decimal input is read exactly as before.
 *
 * Only the typed duration is read. It is NOT derived from the start and end
 * times: the two are recorded separately, and deriving one would overwrite
 * what the operator entered.
 *
 * A duration must be greater than zero, so 00:00, 0 and anything that cannot
 * be read are all 'unreadable' — which is what lets the form say why it cannot
 * be saved instead of leaving Save grey with no reason.
 */
export type DurationReading =
  | { status: 'empty' }
  | { status: 'unreadable' }
  | { status: 'ok'; hours: number; fromClock: boolean };

const HOURS_AND_MINUTES = /^(\d{1,2}):(\d{2})$/;

export function readDurationHours(text: string): DurationReading {
  const value = toEnglishDigits(text).trim();
  if (value.length === 0) return { status: 'empty' };

  const clock = HOURS_AND_MINUTES.exec(value);
  if (clock) {
    const minutes = Number(clock[2]);
    if (minutes > 59) return { status: 'unreadable' };
    // In whole hundredths of an hour, so 55 minutes is exactly 0.92 and not a
    // float that prints as 0.9166666666666666.
    const totalMinutes = Number(clock[1]) * 60 + minutes;
    const hours = Math.round((totalMinutes * 100) / 60) / 100;
    return hours > 0 ? { status: 'ok', hours, fromClock: true } : { status: 'unreadable' };
  }

  const hours = parseOptionalNumber(value);
  return hours !== undefined && hours > 0
    ? { status: 'ok', hours, fromClock: false }
    : { status: 'unreadable' };
}

/**
 * The inverse, for showing stored hours as hours and minutes: 0.92 is "00:55".
 * Minutes are rounded to the nearest whole minute, so any duration typed as
 * H:MM and stored to 2 decimal places reads back exactly as it was typed.
 * Not used on screen yet.
 */
export function hoursAsClock(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
