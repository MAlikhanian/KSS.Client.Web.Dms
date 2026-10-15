import type { DmsStoppage } from '@/lib/dms/types';

/**
 * The root-cause system / area is no longer entered on the stoppage form, but
 * stoppages saved earlier still hold one. An edit sends the whole form as its
 * patch, and a present key holding nothing reaches the service as `null`, which
 * clears it. So the stored value goes back exactly as it was read; with nothing
 * stored, the key is left out, which the service reads as "unchanged".
 */
export function carriedRootCause(
  initial?: Pick<DmsStoppage, 'rootCauseSystem'> | null,
): Pick<DmsStoppage, 'rootCauseSystem'> {
  const stored: unknown = initial?.rootCauseSystem;
  return typeof stored === 'string' ? { rootCauseSystem: stored } : {};
}
