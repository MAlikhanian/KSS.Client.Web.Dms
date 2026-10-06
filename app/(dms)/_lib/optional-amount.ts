import { parseOptionalNumber } from './digits';

/**
 * An optional amount that cannot be negative, such as a cycle's volume.
 *
 * Empty is allowed and means "not given". Text that cannot be read as a number
 * is NOT empty: it is 'unreadable', so the form keeps Save off and says why,
 * instead of saving the field as if nothing had been typed. Zero is a real
 * value, not an empty one.
 */
export type AmountReading =
  | { status: 'empty' }
  | { status: 'unreadable' }
  | { status: 'negative' }
  | { status: 'ok'; value: number };

export function readOptionalAmount(text: string): AmountReading {
  if (text.trim().length === 0) return { status: 'empty' };
  const value = parseOptionalNumber(text);
  if (value === undefined) return { status: 'unreadable' };
  return value < 0 ? { status: 'negative' } : { status: 'ok', value };
}
