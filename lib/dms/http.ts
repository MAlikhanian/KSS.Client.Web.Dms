/**
 * The one place a DMS data call becomes HTTP.
 *
 * Every function in store.ts is one call to `dmsHttp`, so a refusal reaches
 * every screen in the same shape the screens were written against: a `DmsError`
 * whose code comes from the HTTP status (`codeForStatus`) and whose `details`
 * are the service's field-level messages. No catch block in a component had to
 * change for the move off the mock.
 *
 * Calls go to this zone's own proxy (`/dms/api/dms/...`), never to the service:
 * the browser holds neither the service URL nor the token.
 */

import { codeForStatus, DmsError } from './errors';

const BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || '/dms'}/api/dms`;

/** Longer than the proxy's own upstream timeout, so the proxy answers first. */
const REQUEST_TIMEOUT_MS = 50_000;

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export async function dmsHttp<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    throw new DmsError('Unavailable', timedOut ? 'DMS_REQUEST_TIMEOUT' : 'DMS_NETWORK_ERROR');
  }

  // No session (expired, or signed out elsewhere): the same response the rest of
  // the estate gives — back to sign-in — rather than an error on every screen.
  if (res.status === 401 && typeof window !== 'undefined') {
    const { signOutToTenant } = await import('@/lib/auth-signout');
    void signOutToTenant();
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text().catch(() => '');
  if (res.ok) {
    if (text === '') return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new DmsError('Unavailable', 'DMS_BAD_RESPONSE');
    }
  }

  let message = `DMS_HTTP_${res.status}`;
  let details: Record<string, string> | undefined;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.message === 'string' && parsed.message) message = parsed.message;
    if (parsed && parsed.details && typeof parsed.details === 'object') details = parsed.details;
  } catch {
    /* not JSON: the status-derived message stands */
  }
  throw new DmsError(codeForStatus(res.status), message, details);
}

/** A query string from the defined, non-empty values only. */
export function query(params: Record<string, string | undefined | null>): string {
  const entries = Object.entries(params).filter(
    (e): e is [string, string] => typeof e[1] === 'string' && e[1] !== '',
  );
  return entries.length === 0 ? '' : `?${new URLSearchParams(entries).toString()}`;
}

/** Encode one path segment (an id). */
export function seg(value: string): string {
  return encodeURIComponent(value);
}

/**
 * A patch as the service reads it: a key ABSENT means "unchanged", `null` means
 * "clear". The forms mark a cleared field as a present key holding `undefined`,
 * which JSON would silently drop — the clear would never reach the service.
 * So every present-but-undefined key becomes `null` here, in the one place a
 * patch leaves the browser.
 */
export function toPatchBody(patch: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    out[key] = value === undefined ? null : value;
  }
  return out;
}
