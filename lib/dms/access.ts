/**
 * Who may reach which DMS screen: ONE decision, used by the route guard
 * (middleware.ts, from the verified session token) and by the menu (from the
 * same session). Two separate rules would one day disagree, and the failure
 * would be a menu offering a screen the guard refuses, or the reverse.
 *
 * ⛔ FAILS CLOSED. Anything not positively recognised grants nothing: no
 * session, no `Dms.Read`, an unknown role code, an empty list. There is no
 * default role and no "show everything" branch.
 *
 * The inputs are the Auth claims the service itself checks (a DMS role code plus
 * the `Dms.Read` permission), so the zone agrees with the service instead of
 * showing what the service would refuse. The service stays the authority: it
 * re-checks every data call, including the company.
 *
 * No browser, no Next, no network — pure, so every branch is testable.
 */

import type { DmsRole } from './types';

/** Full access to every project, DMS included, by the principal's ruling. */
const FULL_ACCESS_ROLES: readonly string[] = ['SuperAdmin', 'Developer'];

/** Auth role code → DMS role. Only these three codes mean anything here. */
const DMS_ROLE_CODES: Readonly<Record<string, DmsRole>> = {
  DmsOperator: 'Operator',
  DmsVesselSupervisor: 'VesselSupervisor',
  DmsProjectControl: 'ProjectControl',
};

/** The permission every DMS role carries in Auth; without it a DMS role code grants nothing. */
export const DMS_READ_PERMISSION = 'Dms.Read';

export interface DmsAccess {
  /** SuperAdmin or Developer: every DMS screen. Decided by ROLE, because these roles do not hold Dms.Read. */
  full: boolean;
  /** The DMS roles held — possibly several; a person may hold more than one. */
  roles: DmsRole[];
}

export const NO_ACCESS: DmsAccess = { full: false, roles: [] };

export function resolveDmsAccess(
  claims: { roles?: unknown; permissions?: unknown } | null | undefined,
): DmsAccess {
  if (!claims) return NO_ACCESS;
  const roleCodes = stringList(claims.roles);
  const permissions = stringList(claims.permissions);

  const full = roleCodes.some((r) => FULL_ACCESS_ROLES.includes(r));
  const roles = permissions.includes(DMS_READ_PERMISSION)
    ? unique(
        roleCodes
          .filter((r) => Object.prototype.hasOwnProperty.call(DMS_ROLE_CODES, r))
          .map((r) => DMS_ROLE_CODES[r]),
      )
    : [];
  return { full, roles };
}

/** True when the person may use DMS at all. */
export function hasAnyDmsAccess(access: DmsAccess): boolean {
  return access.full || access.roles.length > 0;
}

/** True when the person may act in `role` (full access may act in any). */
export function canActAs(access: DmsAccess, role: DmsRole): boolean {
  return access.full || access.roles.includes(role);
}

/**
 * The Auth role codes that open a DMS menu entry meant for `roles` (an empty
 * list means every DMS role), plus the full-access roles. The sidebar's estate
 * filter matches these against the session, so the menu reads the SAME claims
 * as the route guard.
 */
export function authRoleCodesFor(roles: readonly DmsRole[]): string[] {
  const wanted = roles.length === 0 ? (Object.values(DMS_ROLE_CODES) as DmsRole[]) : roles;
  const codes = Object.entries(DMS_ROLE_CODES)
    .filter(([, role]) => wanted.includes(role))
    .map(([code]) => code);
  return [...codes, ...FULL_ACCESS_ROLES];
}

/** Only arrays of strings count; anything else is treated as empty. */
function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
