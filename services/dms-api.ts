/**
 * The DMS service (KSS.Service.SEBA_ERP_Dms), called server-side only.
 *
 * Every browser call reaches the service through app/api/dms/[...path] and
 * this function; nothing in the browser holds the service URL or the token.
 *
 * Base URL from DMS_API_BASE_URL (the zone's deployment ConfigMap). The service
 * runs in its own namespace, so the value is the FULL cluster name; the Service
 * listens on port 80, so the URL carries no port.
 *
 * Every call carries, and neither is optional:
 *   - Authorization: the caller's own token from the session. The service
 *     decides the actor, role and company from it.
 *   - X-Company-Id: the active company. THE HOST DECIDES WHEN IT CAN: on a host
 *     bound to a company (TENANTS, resolved from `x-kss-host`), that company is
 *     sent, whatever the cookie says — exactly as the Shell itself does. Only on
 *     an unbound host does the `x-company-id` cookie decide. A request with no
 *     valid company either way is refused HERE rather than sent without it.
 *
 *     Why the host first: the Shell writes the cookie only when one of ITS
 *     protected pages renders. A person who signs in through a DMS link in a
 *     fresh browser comes straight back here with no cookie at all, and every
 *     call would fail. The host is already known on every request.
 *
 * Refusals pass through with the upstream status and its `message` code. On a
 * 422, the field-level `details` pass through too: the forms show them per
 * field, and the service keys them by the camelCase field name. Nothing else in
 * an error body travels, so no server text reaches the page.
 */
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { resolveTenant } from '@/lib/tenants';

/** Longer than any single upstream call the service makes, so its own timeout answers first. */
const UPSTREAM_TIMEOUT_MS = 45_000;

const COMPANY_COOKIE = 'x-company-id';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Refusal codes this zone issues itself, before or instead of calling the service. */
export const ZoneRefusal = {
  /** No usable `x-company-id` cookie: the same code the service uses for a missing header. */
  NoActiveCompany: 'DMS_NO_ACTIVE_COMPANY',
  /** DMS_API_BASE_URL is not set in this deployment. */
  ServiceNotConfigured: 'DMS_SERVICE_NOT_CONFIGURED',
  /** The service did not answer (DNS, connection or timeout). */
  ServiceUnreachable: 'DMS_SERVICE_UNREACHABLE',
  /** The request body was not a JSON object. */
  InvalidRequest: 'DMS_INVALID_REQUEST',
  /** The request path is not one this proxy forwards. */
  InvalidPath: 'DMS_INVALID_PATH',
  /** The service answered 401 to a session the zone holds as valid. */
  TokenRefused: 'DMS_TOKEN_REFUSED',
} as const;

export function refuse(status: number, code: string): NextResponse {
  return NextResponse.json({ message: code }, { status });
}

export type ForwardMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/**
 * The company to send as X-Company-Id, or null when there is none.
 *
 * ⛔ THE HOST COMES FROM `x-kss-host` AND NOTHING ELSE. The Shell stamps it from
 * the request's Host on every rewrite, overwriting any value a client sent, and
 * this zone is reachable only through the Shell. `X-Forwarded-Host` is
 * client-controlled at this cluster's ingress and is never read.
 *
 * The service still checks that the caller belongs to the company sent.
 */
async function activeCompany(): Promise<string | null> {
  const bound = resolveTenant((await headers()).get('x-kss-host'))?.companyId;
  if (bound && GUID.test(bound)) return bound;
  // Unbound host: the user's choice, from the cookie the Shell writes. It is
  // written client-side, so it is checked for shape before it becomes a header.
  const chosen = (await cookies()).get(COMPANY_COOKIE)?.value;
  return chosen && GUID.test(chosen) ? chosen : null;
}

/**
 * Call the DMS service as the signed-in user and answer with what it said.
 *
 * `path` is the part after `/api/dms` (already validated by the caller) plus its
 * query string. Neither the path nor a body is ever logged.
 */
export async function forwardToDms(
  method: ForwardMethod,
  path: string,
  body?: unknown,
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return refuse(401, 'Unauthorized');

  const companyId = await activeCompany();
  if (!companyId) return refuse(400, ZoneRefusal.NoActiveCompany);

  const baseUrl = process.env.DMS_API_BASE_URL;
  if (!baseUrl) {
    console.error('[DMS API] DMS_API_BASE_URL is not set');
    return refuse(503, ZoneRefusal.ServiceNotConfigured);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/dms${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${session.accessToken}`,
        'X-Company-Id': companyId,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(`[DMS API] ${method}: the service did not answer`, error instanceof Error ? error.name : error);
    return refuse(502, ZoneRefusal.ServiceUnreachable);
  }

  if (upstream.status === 204) return new NextResponse(null, { status: 204 });

  const text = await upstream.text().catch(() => '');

  if (upstream.ok) {
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let code = `DMS_HTTP_${upstream.status}`;
  let details: Record<string, string> | undefined;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.message === 'string' && parsed.message) code = parsed.message;
    if (upstream.status === 422) details = fieldDetails(parsed?.details);
  } catch {
    /* not JSON; keep the status-derived code */
  }
  if (upstream.status >= 500) {
    console.error(`[DMS API] ${method}: upstream ${upstream.status} ${code}`);
  }

  // The session was valid a moment ago (checked above), so a 401 here means
  // the SERVICE refused the token: a configuration fault between the two, not
  // an expired sign-in. Passed on as a 401 it would sign the user out on every
  // page. It goes back as a service fault instead.
  if (upstream.status === 401) {
    console.error(`[DMS API] ${method}: the service refused the session token`);
    return refuse(502, ZoneRefusal.TokenRefused);
  }

  return NextResponse.json(
    details ? { message: code, details } : { message: code },
    { status: upstream.status },
  );
}

/**
 * Keep only a flat map of field name to short string. Anything else — nested
 * objects, arrays, long text — is dropped rather than passed to the page.
 */
function fieldDetails(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (/^[A-Za-z][A-Za-z0-9]{0,63}$/.test(key) && typeof v === 'string' && v.length <= 200) out[key] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
