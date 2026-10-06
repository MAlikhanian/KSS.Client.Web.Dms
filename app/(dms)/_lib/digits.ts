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

/** ASCII digits to Persian, for display. The inverse of toEnglishDigits. */
export function toPersianDigits(value: string): string {
  return value.replace(/[0-9]/g, (d) => String.fromCharCode(PERSIAN_ZERO + Number(d)));
}

export function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (ch) => {
    const code = ch.charCodeAt(0);
    const base = code >= PERSIAN_ZERO ? PERSIAN_ZERO : ARABIC_ZERO;
    return String(code - base);
  });
}

/**
 * The Persian decimal mark (U+066B), which a Persian keyboard types for the
 * decimal point. Only this one is read as a decimal point: "," and «٬» (U+066C)
 * are thousands separators in other conventions, so reading either as a decimal
 * would turn 1,500 into 1.5.
 */
export const PERSIAN_DECIMAL_MARK = String.fromCharCode(0x066b);

/**
 * Parse a user-typed number, returning undefined for empty input.
 *
 * Returns undefined rather than 0 for unparseable text: 0 is a measurement and
 * would be stored as one — a vessel with a draft of zero rather than a vessel
 * whose draft nobody entered.
 *
 * «٫» is read exactly as "." is, so ۰٫۹۲ parses like 0.92. Nothing else
 * changes: text without «٫» parses as before.
 */
export function parseOptionalNumber(value: string): number | undefined {
  const normalised = toEnglishDigits(value).trim().split(PERSIAN_DECIMAL_MARK).join('.');
  if (normalised.length === 0) return undefined;
  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : undefined;
}
