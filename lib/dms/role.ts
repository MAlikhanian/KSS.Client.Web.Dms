/**
 * The role cookie's name and its validator — the only two things the CLIENT
 * session module and the EDGE route guard both need.
 *
 * They live here, in a module with no `'use client'` directive and no browser
 * API, because middleware.ts runs in the Edge runtime and importing a client
 * module into it is a boundary error. Splitting them out means there is still
 * exactly ONE definition of what counts as a valid role: if the guard and the
 * UI each had their own, they would eventually disagree, and the failure would
 * be a page the guard admits and the UI refuses to render — or the reverse,
 * which is worse.
 */

import type { DmsRole } from './types';
import { ALL_DMS_ROLES } from './types';

export const DMS_ROLE_COOKIE = 'dms.role';

/** Validate an untrusted cookie value into a role, or null. */
export function parseDmsRole(value: string | undefined | null): DmsRole | null {
  if (!value) return null;
  return (ALL_DMS_ROLES as readonly string[]).includes(value)
    ? (value as DmsRole)
    : null;
}
