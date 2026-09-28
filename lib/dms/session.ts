/**
 * The single module that answers "who is using DMS, and in which role".
 *
 * ─── WHAT THIS IS, AND WHAT IT IS NOT ───────────────────────────────────────
 * IT IS: a deterministic way to put the app into one of §1's three roles, so
 * that the three-role behaviour — who may enter a day, who may approve it —
 * can be built and demonstrated.
 *
 * IT IS NOT AUTHENTICATION. The role lives in a cookie the browser owns, so
 * anyone can set it. With no backend, nothing here can be more than that: the
 * layer that would enforce it does not exist for DMS. `_Kit`'s own
 * use-permission hook says "UI convenience only; the backend enforces the same
 * permissions on every request" — for us there is no such backend, so the
 * route guard is not a second line of defence, it is the only line, and this
 * is the honest size of it.
 *
 * Nobody should read a passing role check here as an access-control guarantee.
 *
 * ─── WHY A COOKIE AND NOT localStorage ──────────────────────────────────────
 * middleware.ts runs in the Edge runtime, where there is no `window` and no
 * localStorage. A role kept there would be invisible to the route guard, which
 * would then pass everyone while looking like a gate — worse than no guard,
 * because it reads as coverage. A cookie is visible to both sides.
 *
 * ─── THE USER IS A REFERENCE, NOT AN ENTITY ─────────────────────────────────
 * ۲-۷'s `registered_by` and `approved_by` are `FK (Users.id)`, and the FRD
 * defines no Users table among its nine. Whatever that id turns out to be, DMS
 * should not define its own user entity — so what is held here is an id plus a
 * display name and nothing else. When the real source arrives, it changes
 * inside this module.
 */

'use client';

import { DMS_ROLE_COOKIE, parseDmsRole } from './role';
import type { DmsActor, DmsRole } from './types';

// The cookie name and the validator live in ./role — a module with no
// 'use client' directive — so middleware.ts can import them on the Edge
// runtime and there is still one definition of a valid role. Re-exported here
// so callers have one place to look.
export { DMS_ROLE_COOKIE, parseDmsRole };

/** Not a real session lifetime — a dev convenience. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * The demo identities, one per role. `userId` is what would land in ۲-۷'s
 * `registered_by` / `approved_by`.
 */
const DEMO_USERS: Readonly<Record<DmsRole, { userId: string; userName: string }>> =
  {
    // PROPOSED — not in FRD (Users is referenced by ۲-۷ and never defined)
    ProjectControl: { userId: 'dms-usr-pc', userName: 'کاربر کنترل پروژه' },
    Operator: { userId: 'dms-usr-op', userName: 'اپراتور شناور' },
    VesselSupervisor: { userId: 'dms-usr-sup', userName: 'سرپرست شناور' },
  };

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/** The current role, or null when none has been chosen. */
export function getCurrentRole(): DmsRole | null {
  return parseDmsRole(readCookie(DMS_ROLE_COOKIE));
}

/**
 * The current actor, or null when no role is set.
 *
 * Returns null rather than defaulting to a role: a default here would mean a
 * page silently rendering as somebody, and "who am I acting as" is the one
 * question this module exists to answer explicitly.
 */
export function getCurrentActor(): DmsActor | null {
  const role = getCurrentRole();
  if (!role) return null;
  const user = DEMO_USERS[role];
  return { userId: user.userId, userName: user.userName, role };
}

/**
 * The dev role switcher. `SameSite=Lax` and no `Secure`, because this is a
 * local development affordance and not a credential — see the header.
 */
export function setCurrentRole(role: DmsRole): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${DMS_ROLE_COOKIE}=${encodeURIComponent(role)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearCurrentRole(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${DMS_ROLE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
