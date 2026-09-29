import { gregorianToJalali } from '@/lib/jalali';

/**
 * Display a stored date in the Persian (Jalali) calendar, e.g. «۱۴۰۵/۰۷/۰۷».
 *
 * The customer asked for every date in the system to be shown and entered in the
 * Persian calendar. The STORE keeps Gregorian `YYYY-MM-DD` — the shape the
 * eventual API returns — so the conversion happens only at the edge, here for
 * display and in `DmsDateInput` for entry.
 *
 * Zone-local on purpose, like `digits.ts`: `lib/format-utils.ts` is a template
 * file, and its `formatDate` follows the UI language, which would show Gregorian
 * dates to anyone using the English UI.
 *
 * ⚠ ARITHMETIC ON THE STRING, NEVER `new Date(value)`. A date-only string parses
 * as UTC midnight, and rendering it in a local timezone west of UTC shifts it to
 * the previous day. Splitting the three numbers cannot shift anything.
 *
 * Anything that is not a `YYYY-MM-DD` date is returned UNCHANGED rather than
 * blanked: a value we cannot convert is still data, and hiding it would look
 * like a date nobody entered.
 */
export function formatJalaliDate(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const [gy, gm, gd] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (gm < 1 || gm > 12 || gd < 1 || gd > 31) return value;
  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
  return toPersianDigits(
    `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`,
  );
}

function toPersianDigits(text: string): string {
  return text.replace(/\d/g, (d) => String.fromCharCode(0x06f0 + Number(d)));
}

/**
 * Today's date in Tehran, as the store's Gregorian `YYYY-MM-DD`.
 *
 * ⚠ NOT `new Date().toISOString().slice(0, 10)`. That is the UTC date, and
 * Tehran is UTC+3:30, so from 00:00 to 03:30 local time it names YESTERDAY — a
 * report started just after midnight would be pre-filled with the wrong day.
 * The operators work in Tehran time whatever the browser's own zone is set to.
 */
export function todayIsoInTehran(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
