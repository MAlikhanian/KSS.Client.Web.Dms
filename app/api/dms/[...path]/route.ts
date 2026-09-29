import type { NextRequest } from 'next/server';
import { forwardToDms, refuse, ZoneRefusal, type ForwardMethod } from '@/services/dms-api';

/**
 * /dms/api/dms/<path> → the DMS service's /api/dms/<path>, as the signed-in user.
 *
 * One forwarding route rather than one file per endpoint: the service is the
 * authority on every route (role, permission and company are checked there), so
 * the zone adds nothing per endpoint and a list here would only drift from it.
 *
 * ⛔ EVERY PATH SEGMENT IS CHECKED. Letters, digits and hyphens only — the shape
 * of every service route and id. That rules out `..`, encoded slashes and any
 * other way of steering the upstream URL somewhere the service did not intend.
 */
const SEGMENT = /^[A-Za-z0-9-]{1,64}$/;

async function forward(
  method: ForwardMethod,
  request: NextRequest,
  params: Promise<{ path: string[] }>,
) {
  const { path } = await params;
  if (!Array.isArray(path) || path.length === 0 || path.length > 6 || !path.every((s) => SEGMENT.test(s))) {
    return refuse(404, ZoneRefusal.InvalidPath);
  }
  const target = `/${path.join('/')}${request.nextUrl.search}`;

  if (method === 'GET' || method === 'DELETE') return forwardToDms(method, target);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refuse(400, ZoneRefusal.InvalidRequest);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return refuse(400, ZoneRefusal.InvalidRequest);
  }
  return forwardToDms(method, target, body);
}

type Ctx = { params: Promise<{ path: string[] }> };

export function GET(request: NextRequest, { params }: Ctx) {
  return forward('GET', request, params);
}
export function POST(request: NextRequest, { params }: Ctx) {
  return forward('POST', request, params);
}
export function PATCH(request: NextRequest, { params }: Ctx) {
  return forward('PATCH', request, params);
}
export function DELETE(request: NextRequest, { params }: Ctx) {
  return forward('DELETE', request, params);
}
