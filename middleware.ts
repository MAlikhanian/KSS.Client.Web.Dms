/**
 * DMS route guard.
 *
 * ─── WHY THIS FILE EXISTS AT ALL ────────────────────────────────────────────
 * No zone in this estate has a middleware.ts — only the Shell does.
 * `CustomerRisk` is the closest precedent to DMS (frontend-only, mock store)
 * and it gates its MENU by role with no route guard whatsoever, so any
 * authenticated user reaching the URL gets the page. Nobody-can-find-it is not
 * a control. DMS has three roles that see genuinely different things, so the
 * routes are gated and not only the navigation.
 *
 * ─── AND THE HONEST SIZE OF IT ──────────────────────────────────────────────
 * THIS GATES THE THREE-ROLE DEMO DETERMINISTICALLY. IT AUTHENTICATES NOTHING.
 * The role is a cookie the browser owns and anyone can set. `_Kit`'s
 * use-permission hook can say "UI convenience only; the backend enforces the
 * same permissions on every request" because for those apps there IS a backend
 * — for DMS there is not, so this is the only line rather than the second one,
 * and a line the visitor can move is what "only line" amounts to here.
 *
 * That is not an argument for leaving it out. Menu-gating alone would be the
 * CustomerRisk gap rebuilt knowingly. It is an argument against anybody
 * reading a passing check as an access-control guarantee.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { DMS_ROLE_COOKIE, parseDmsRole } from '@/lib/dms/role';
import type { DmsRole } from '@/lib/dms/types';

/**
 * Which roles may reach which route, from §1.
 *
 * Longest prefix wins, so a more specific rule can be added without reordering
 * anything. A route that appears here and grants no role is unreachable, which
 * is the safe direction.
 */
const ROUTE_ROLES: ReadonlyArray<{ prefix: string; roles: readonly DmsRole[] }> = [
  // اپراتور enters the day. §1: «ثبت گزارش روزانه، چرخه‌های عملیاتی و توقفات».
  { prefix: '/daily-report', roles: ['Operator'] },
  // سرپرست شناور reviews. §1: «تایید نهایی گزارش یا رد آن جهت اصلاح».
  { prefix: '/approvals', roles: ['VesselSupervisor'] },
  // کنترل پروژه sees the dashboard. §1: «مشاهده داشبورد کلان مدیریتی».
  { prefix: '/dashboard', roles: ['ProjectControl'] },
  // The definition tables — §1 scopes head office's CRUD to exactly these.
  { prefix: '/admin', roles: ['ProjectControl'] },
];

/**
 * With `basePath: '/dms'` Next strips the prefix before middleware sees the
 * path — but a request can also arrive already-stripped or not, depending on
 * how it was rewritten by the Shell. Normalising both ways costs nothing and
 * removes a class of guard-silently-matches-nothing bug, which is the failure
 * mode that makes a guard look present and do nothing.
 */
function normalisePath(pathname: string): string {
  return pathname.startsWith('/dms/')
    ? pathname.slice('/dms'.length)
    : pathname === '/dms'
      ? '/'
      : pathname;
}

function ruleFor(pathname: string) {
  return ROUTE_ROLES.filter((rule) => pathname.startsWith(rule.prefix)).sort(
    (a, b) => b.prefix.length - a.prefix.length,
  )[0];
}

export function middleware(req: NextRequest) {
  const pathname = normalisePath(req.nextUrl.pathname);
  const rule = ruleFor(pathname);

  // An unguarded route is one nobody has classified yet. Let it through rather
  // than inventing a policy here: the guard's job is to enforce the rules that
  // exist, and a rule invented in middleware is one nobody reviewed.
  if (!rule) return NextResponse.next();

  const role = parseDmsRole(req.cookies.get(DMS_ROLE_COOKIE)?.value);

  // No role chosen: send to the role picker rather than 403, because with no
  // real auth "not signed in" is the ordinary first visit, not an intrusion.
  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  if (!rule.roles.includes(role)) {
    const url = req.nextUrl.clone();
    url.pathname = '/forbidden';
    url.searchParams.set('from', pathname);
    url.searchParams.set('role', role);
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // Framework assets and the auth endpoints are not DMS routes.
  matcher: ['/((?!_next/static|_next/image|api/auth|favicon.ico).*)'],
};
