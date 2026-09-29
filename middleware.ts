/**
 * DMS route guard — FAILS CLOSED, decided from the real Auth session.
 *
 * Every DMS page and every zone API route requires:
 *   - a signed-in session, decoded and verified here (the estate NextAuth JWT,
 *     signed with NEXTAUTH_SECRET). No session, a forged one, or an Auth token
 *     past its expiry → sign-in (pages) or 401 (API).
 *   - access to THAT route, decided by `decideRoute` from the session's own
 *     role and permission claims (lib/dms/access.ts): SuperAdmin or Developer
 *     reach every screen; anyone else needs `Dms.Read` plus a DMS role code
 *     whose screens include this one. Anything else → /forbidden (pages) or
 *     403 (API).
 *
 * The same claims are what the DMS service checks on every call, so the zone
 * shows exactly what the service will serve. The service stays the authority —
 * it re-checks role, permission and company on each request.
 *
 * ⛔ NOTHING THE BROWSER CAN SET DECIDES ACCESS. The old demo role cookie and
 * its picker are gone; a cookie with that name is simply ignored.
 *
 * Why this zone has a guard at all when most do not: the DMS roles see
 * genuinely different screens, and hiding a menu entry is not a control.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { resolveDmsAccess } from '@/lib/dms/access';
import { decideRoute, normaliseDmsPath } from '@/lib/dms/route-access';
import { normalizeHost, resolveTenant } from '@/lib/tenants';

function isApi(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

const LOOPBACK = /^(localhost|127\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d{1,5})?$/;

/**
 * The origin the VISITOR is on. Behind the Shell's rewrite this zone's own
 * request URL carries the cluster Service DNS, not the visitor's host, so a
 * redirect built from `req.nextUrl` would send the browser to an internal name.
 * The Shell stamps the visitor's Host as `x-kss-host`.
 *
 * ⛔ THE HEADER IS NOT TRUSTED AS A DESTINATION. Only a host that is a key of
 * this zone's TENANTS (the tenant hosts the ingress serves) is used, rebuilt
 * from that key rather than copied from the header — otherwise anything able to
 * set the header on a request reaching the zone could send a visitor to a
 * sign-in page on a host of its choosing (an open redirect). A loopback host is
 * also accepted, for local development. Anything else falls back to the
 * request's own origin, which is also the right answer with no Shell in front.
 * Public hosts are HTTPS only (the ingress enforces ssl-redirect); loopback is http.
 */
function visitorOrigin(req: NextRequest): string {
  const header = req.headers.get('x-kss-host') ?? '';
  if (LOOPBACK.test(header)) return `http://${header}`;
  if (resolveTenant(header)) return `https://${normalizeHost(header)}`;
  return req.nextUrl.origin;
}

/**
 * Sign-in lives at the HOST ROOT (the Shell's /signin), outside this zone's
 * basePath. The Location MUST be absolute: Next's middleware runtime parses a
 * redirect's Location as a URL with no base, and a relative one throws
 * (ERR_INVALID_URL) — the visitor would get a 500 instead of the sign-in page.
 */
function toSignIn(req: NextRequest, pathname: string): NextResponse {
  if (isApi(pathname)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const back = `${req.nextUrl.basePath}${pathname}${req.nextUrl.search}`;
  const target = new URL('/signin', visitorOrigin(req));
  target.searchParams.set('callbackUrl', back);
  return new NextResponse(null, { status: 307, headers: { Location: target.toString() } });
}

/** True when the Auth token inside the session has passed its stated expiry. */
function authTokenExpired(tokenExpires: unknown, now: number): boolean {
  if (typeof tokenExpires !== 'string') return false;
  const at = Date.parse(tokenExpires);
  return Number.isFinite(at) && at <= now;
}

export async function middleware(req: NextRequest) {
  const pathname = normaliseDmsPath(req.nextUrl.pathname);

  // getToken verifies the signature: a token signed with any other secret, or
  // none at all, decodes to null. A missing secret also gives null — refused.
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !token.accessToken || authTokenExpired(token.tokenExpires, Date.now())) {
    return toSignIn(req, pathname);
  }

  // /forbidden explains a refusal, so a signed-in person may always see it.
  if (pathname === '/forbidden') return NextResponse.next();

  const decision = decideRoute(
    resolveDmsAccess({ roles: token.roles, permissions: token.permissions }),
    pathname,
  );
  if (decision === 'allow') return NextResponse.next();

  if (isApi(pathname)) return NextResponse.json({ message: 'DMS_NO_ROLE' }, { status: 403 });
  const url = req.nextUrl.clone();
  url.pathname = '/forbidden';
  url.search = '';
  url.searchParams.set('from', pathname);
  return NextResponse.rewrite(url);
}

export const config = {
  // Framework assets, the auth endpoints and the health probe are not DMS
  // routes. The probe in particular must answer without a session, or the
  // cluster would see a redirect and restart a healthy pod.
  // '/' is listed on its own: with a basePath, the pattern below compiles to
  // /dms/(...) and does not match the bare zone root /dms, which would then
  // be served with no guard at all.
  matcher: ['/', '/((?!_next/static|_next/image|api/auth|api/health|favicon.ico).*)'],
};
