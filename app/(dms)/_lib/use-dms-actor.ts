'use client';

import { useEffect, useState } from 'react';
import { getCurrentActor } from '@/lib/dms/session';
import type { DmsActor } from '@/lib/dms/types';

/**
 * The current DMS actor, resolved on the client after mount.
 *
 * The role lives in a cookie, so reading it during render would differ between
 * the server pass and the client pass and produce a hydration mismatch.
 * `ready` distinguishes "not resolved yet" from "resolved, and there is no
 * role" — those are different states and a screen that conflates them shows a
 * sign-in prompt for a fraction of a second to someone who is already signed
 * in.
 *
 * Folder is `_lib`, which the app router excludes from routing — it is inside
 * app/(dms)/ so it stays within the guarded tree, and a leading underscore
 * keeps it from becoming a route.
 */
export function useDmsActor(): { actor: DmsActor | null; ready: boolean } {
  const [actor, setActor] = useState<DmsActor | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setActor(getCurrentActor());
    setReady(true);
  }, []);

  return { actor, ready };
}
