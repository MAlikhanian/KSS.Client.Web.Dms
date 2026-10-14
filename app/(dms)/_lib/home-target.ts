import type { DmsAccess } from '@/lib/dms/access';
import { decideRoute } from '@/lib/dms/route-access';

/** The dashboard, as a zone path (Next adds the basePath). */
export const DASHBOARD_PATH = '/dashboard';

/**
 * Where the DMS home sends this person straight away, or null to stay on the
 * home page.
 *
 * The dashboard is the DMS home for everyone who may open it. Whether they may
 * is asked of the route guard's own table (decideRoute), so the home page can
 * never send someone to a screen the guard would refuse: a person without
 * dashboard access stays on the home page and keeps its links.
 */
export function homeTarget(access: DmsAccess): string | null {
  return decideRoute(access, DASHBOARD_PATH) === 'allow' ? DASHBOARD_PATH : null;
}
