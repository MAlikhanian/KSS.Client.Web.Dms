import type { DmsRole } from './types';
import type { DmsMenuEntry } from './menu';
import { parseDmsRole } from './role';

/**
 * The DMS menu, filtered to what one role may see.
 *
 * Pure: entries in, entries out. No document, no cookie, no React. The caller
 * reads the cookie — `getCurrentRole()` in ./session already owns that — and
 * passes the result in, so this function is testable without a browser and
 * cannot acquire a hidden dependency on one.
 *
 * ⛔ NAMED `filterDmsMenuByRole`, NOT `filterMenuByRole`. The estate already
 * exports `filterMenuByRole` from lib/menu-translation-utils.ts and it is a
 * different function on different data — it compares `item.roles` against the
 * auth session's estate roles, which is why it cannot carry `dmsRoles` (see
 * the note at the `dmsRoles` declaration). Reusing the name would also destroy
 * the deployment discriminator: "the name appears 0 times in the predecessor
 * bundle" is only evidence if the name is ours alone.
 */
export function filterDmsMenuByRole(
  entries: readonly DmsMenuEntry[],
  role: DmsRole | string | null | undefined,
): readonly DmsMenuEntry[] {
  const known = parseDmsRole(typeof role === 'string' ? role : null);

  // ⛔ FAIL OPEN, DELIBERATELY. No role chosen, or a value we do not recognise,
  // shows the whole menu. This is a demo affordance, not an access control:
  // the routes are gated in middleware.ts, and a menu that hid itself whenever
  // the cookie was missing would render an empty sidebar on the server, where
  // document — and therefore the cookie — does not exist.
  if (known === null) return entries;

  return entries.filter((entry) => isVisibleTo(entry, known));
}

function isVisibleTo(entry: DmsMenuEntry, role: DmsRole): boolean {
  // ⛔ EMPTY MEANS UNRESTRICTED, AND IT IS AN EXPLICIT EARLY RETURN.
  // `[].includes(anything)` is false, so the obvious one-liner deletes every
  // unrestricted entry for every role — today that is DMS Home, and a missing
  // home link is more conspicuous than the entries being removed. Written as a
  // separate statement so that deleting it changes behaviour visibly rather
  // than collapsing into the filter expression where it reads as redundant.
  if (entry.dmsRoles.length === 0) return true;

  return entry.dmsRoles.includes(role);
}
