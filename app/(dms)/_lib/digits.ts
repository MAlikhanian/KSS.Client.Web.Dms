/**
 * Persian/Arabic-Indic digits to ASCII.
 *
 * Zone-local on purpose. `lib/format-utils.ts` is a TEMPLATE file — Platform's,
 * and overwritten by any sync-kit run — so adding to it would be both out of
 * lane and impermanent. `Person` keeps its own copy under `app/` for the same
 * reason, so this follows an existing precedent rather than inventing one.
 *
 * Needed because a numeric field typed on a Persian keyboard arrives as
 * '۱۹۹۸', which `Number()` turns into NaN — and NaN written to the store is a
 * value that looks like a missing one.
 */
const PERSIAN_ZERO = 0x06f0;
const ARABIC_ZERO = 0x0660;

export function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (ch) => {
    const code = ch.charCodeAt(0);
    const base = code >= PERSIAN_ZERO ? PERSIAN_ZERO : ARABIC_ZERO;
    return String(code - base);
  });
}

/**
 * Parse a user-typed number, returning undefined for empty input.
 *
 * Returns undefined rather than 0 for unparseable text: 0 is a measurement and
 * would be stored as one — a vessel with a draft of zero rather than a vessel
 * whose draft nobody entered.
 */
export function parseOptionalNumber(value: string): number | undefined {
  const normalised = toEnglishDigits(value).trim();
  if (normalised.length === 0) return undefined;
  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : undefined;
}
