import { isDmsError } from '@/lib/dms/errors';
import { newUuidV7 } from './uuid-v7';

/**
 * The key sent with a new cycle, so a save repeated after a lost reply does not
 * store the cycle twice: the service returns the cycle already stored under
 * that key instead of adding a second one.
 *
 * One key per open Add form, kept across every retry from that form. A NEW key
 * is minted when the form is opened, after a successful save, and when the
 * service says the key itself cannot be used (taken elsewhere, or not a valid
 * UUIDv7). Any other failure, including no answer at all, keeps the key,
 * because the earlier attempt may have been saved and the retry must find it.
 *
 * No automatic second request is made on a refused key: the operator sees a
 * message asking to press Save again, and that press carries the new key.
 */
export type CreateKeyEvent = { type: 'open' } | { type: 'saved' } | { type: 'failed'; error: unknown };

/** True when the service refused the KEY, not the cycle. */
export function isKeyRefusal(error: unknown): boolean {
  if (!isDmsError(error)) return false;
  if (error.message === 'CYCLE_ID_CONFLICT') return true;
  const fields = error.details ? Object.keys(error.details) : [];
  return error.code === 'Validation' && fields.length === 1 && fields[0] === 'id';
}

export function nextCreateKey(
  current: string | null,
  event: CreateKeyEvent,
  mint: () => string = newUuidV7,
): string {
  switch (event.type) {
    case 'open':
    case 'saved':
      return mint();
    case 'failed':
      return current === null || isKeyRefusal(event.error) ? mint() : current;
  }
}
