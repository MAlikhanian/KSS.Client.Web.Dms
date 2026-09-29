'use client';

import { useSession } from 'next-auth/react';
import { canActAs, resolveDmsAccess } from '@/lib/dms/access';
import type { DmsActor, DmsRole } from '@/lib/dms/types';

/**
 * The person using this screen, acting in the screen's own DMS role.
 *
 * From the signed-in Auth session — the same role and permission claims the
 * route guard and the service check (lib/dms/access.ts). A person may hold more
 * than one DMS role; on a given screen they act in THAT screen's role, and only
 * if they hold it (or have full access). Otherwise the actor is null and the
 * screen shows its refusal.
 *
 * `ready` is false while the session is still loading, so a screen does not
 * flash a refusal at someone who is signed in.
 *
 * The service records the actor as the `personId`, from the token itself; this
 * value is for display and for the screens' own button states only.
 *
 * Folder is `_lib`, which the app router excludes from routing.
 */
export function useDmsActor(role: DmsRole): { actor: DmsActor | null; ready: boolean } {
  const { data: session, status } = useSession();
  if (status === 'loading') return { actor: null, ready: false };

  const user = session?.user;
  const access = resolveDmsAccess({ roles: user?.roles, permissions: user?.permissions });
  if (!user || !canActAs(access, role)) return { actor: null, ready: true };

  return {
    actor: {
      userId: user.personId ?? user.id ?? '',
      userName: user.name ?? '',
      role,
    },
    ready: true,
  };
}
