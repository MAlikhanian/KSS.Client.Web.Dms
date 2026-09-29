/**
 * Which DMS roles may reach which route — the table the route guard applies,
 * kept here, pure, so the guard and its tests read ONE table.
 *
 * ⛔ FAILS CLOSED. A route with no rule is NOT let through: it needs at least one
 * DMS role (or full access). A new route that nobody classified is therefore
 * reachable by DMS users only, never by everyone.
 *
 * Longest prefix wins, so a more specific rule can be added without reordering.
 */

import type { DmsAccess } from './access';
import type { DmsRole } from './types';

export const ROUTE_ROLES: ReadonlyArray<{ prefix: string; roles: readonly DmsRole[] }> = [
  // The operator enters the day.
  { prefix: '/daily-report', roles: ['Operator'] },
  // The vessel supervisor reviews.
  { prefix: '/approvals', roles: ['VesselSupervisor'] },
  // Project control sees the dashboard.
  { prefix: '/dashboard', roles: ['ProjectControl'] },
  // Head office's READ-ONLY view of the daily reports — its own route, so the
  // operator's entry screen stays Operator-only rather than being widened.
  { prefix: '/reports', roles: ['ProjectControl'] },
  // The definition tables.
  { prefix: '/admin', roles: ['ProjectControl'] },
];

export type RouteDecision = 'allow' | 'forbidden';

/**
 * With `basePath: '/dms'` Next strips the prefix before middleware sees the
 * path, but a request may arrive either way depending on how the Shell
 * rewrote it. Normalising both removes a guard-silently-matches-nothing bug.
 */
export function normaliseDmsPath(pathname: string): string {
  return pathname.startsWith('/dms/') ? pathname.slice('/dms'.length) : pathname === '/dms' ? '/' : pathname;
}

export function ruleFor(pathname: string) {
  return ROUTE_ROLES.filter((rule) => pathname.startsWith(rule.prefix)).sort(
    (a, b) => b.prefix.length - a.prefix.length,
  )[0];
}

export function decideRoute(access: DmsAccess, pathname: string): RouteDecision {
  if (access.full) return 'allow';
  const rule = ruleFor(normaliseDmsPath(pathname));
  if (!rule) return access.roles.length > 0 ? 'allow' : 'forbidden';
  return access.roles.some((r) => rule.roles.includes(r)) ? 'allow' : 'forbidden';
}
