import { isDmsError } from '@/lib/dms/errors';
import { parseOptionalNumber, toEnglishDigits } from './digits';
import type { VesselFieldDef } from './vessel-fields';

type Translate = (key: string, options: { defaultValue: string }) => string;

/** Thousands separators a person may type or see: "," and the Persian «٬». */
export function stripThousands(value: string): string {
  return toEnglishDigits(value).split(',').join('').split('\u066C').join('');
}

/** The value with thousands separators, for display. Decimals are kept as typed. */
export function groupThousands(value: string): string {
  const plain = stripThousands(value);
  const [whole, ...rest] = plain.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return rest.length > 0 ? `${grouped}.${rest.join('.')}` : grouped;
}

/** The number a field's text holds, or undefined when it is empty or not a number. */
export function parseFieldNumber(field: VesselFieldDef, raw: string): number | undefined {
  return parseOptionalNumber(field.thousands ? stripThousands(raw) : raw);
}

export type VesselFieldProblem = 'notANumber' | 'negative' | 'notWhole' | 'futureDate' | 'tooLarge' | 'tooManyDecimals';

/**
 * The digits the service's columns hold before the decimal point, for the
 * type-scoped fields; each holds at most two after it.
 */
const INTEGER_DIGITS: Readonly<Record<string, number>> = { hullDepthM: 6, craneCapacityT: 8, tankCapacityM3: 12 };
const DEFAULT_INTEGER_DIGITS = 10;
const MAX_DECIMALS = 2;

/**
 * What stops a save, field by field. Years are left to the service, as before;
 * every other number must be a number, not negative, and a count whole; a date
 * may not be after today (Tehran). The type-scoped fields also keep within the
 * service's column sizes, so the form refuses what the service would.
 */
export function vesselFieldProblems(
  shown: readonly VesselFieldDef[],
  values: Record<string, string>,
  todayIso: string,
): { field: VesselFieldDef; problem: VesselFieldProblem }[] {
  const out: { field: VesselFieldDef; problem: VesselFieldProblem }[] = [];
  for (const field of shown) {
    const raw = (values[field.key] ?? '').trim();
    if (raw.length === 0) continue;
    if (field.kind === 'date') {
      if (raw > todayIso) out.push({ field, problem: 'futureDate' });
      continue;
    }
    if (field.kind !== 'number' || field.key === 'buildYear' || field.key === 'refitYear') continue;
    const value = parseFieldNumber(field, raw);
    if (value === undefined) out.push({ field, problem: 'notANumber' });
    else if (value < 0) out.push({ field, problem: 'negative' });
    else if (field.integer && !Number.isInteger(value)) out.push({ field, problem: 'notWhole' });
    else if (field.typeScoped) {
      const plain = field.thousands ? stripThousands(raw) : toEnglishDigits(raw);
      const [whole, decimals = ''] = plain.split(/[.\u066B]/);
      const limit = INTEGER_DIGITS[field.key] ?? DEFAULT_INTEGER_DIGITS;
      if (whole.replace(/^0+(?=\d)/, '').length > limit) out.push({ field, problem: 'tooLarge' });
      else if (decimals.length > MAX_DECIMALS) out.push({ field, problem: 'tooManyDecimals' });
    }
  }
  return out;
}

export function problemText(problem: VesselFieldProblem, t: Translate): string {
  switch (problem) {
    case 'notANumber':
      return t('vesselNotANumber', { defaultValue: 'is not a number' });
    case 'negative':
      return t('reasonNegative', { defaultValue: 'cannot be negative' });
    case 'notWhole':
      return t('vesselNotWhole', { defaultValue: 'must be a whole number' });
    case 'futureDate':
      return t('vesselDateFuture', { defaultValue: 'cannot be after today' });
    case 'tooLarge':
      return t('reasonTooLarge', { defaultValue: 'is too large' });
    case 'tooManyDecimals':
      return t('vesselTwoDecimals', { defaultValue: 'may have at most two decimal places' });
  }
}

/**
 * The service's per-field reason, in words: its exact reasons, and the one
 * that names a type by its prefix. An unknown reason gets a general one.
 */
function reasonText(reason: string, t: Translate): string {
  if (reason.startsWith('not used for vessel type ') || reason === 'not used for this vessel type') {
    return t('vesselNotForType', { defaultValue: 'is not used for this vessel type' });
  }
  switch (reason) {
    case 'set for the old type; send null to change the type':
      return t('vesselOldTypeValue', {
        defaultValue: 'still holds a value of the previous type; clear it and save again',
      });
    case 'cannot be negative':
      return t('reasonNegative', { defaultValue: 'cannot be negative' });
    case 'must be a whole number':
      return t('vesselNotWhole', { defaultValue: 'must be a whole number' });
    case 'cannot be in the future':
      return t('vesselDateFuture', { defaultValue: 'cannot be after today' });
    case 'at most 2 decimal places':
      return t('vesselTwoDecimals', { defaultValue: 'may have at most two decimal places' });
    case 'too large':
      return t('reasonTooLarge', { defaultValue: 'is too large' });
    case 'must be a number':
      return t('vesselNotANumber', { defaultValue: 'is not a number' });
    case 'must be a date in YYYY-MM-DD form':
      return t('vesselNotADate', { defaultValue: 'is not a valid date' });
    case 'unknown':
      return t('vesselTypeUnknown', { defaultValue: 'is not in the vessel type list' });
    case 'required':
      return t('reasonRequired', { defaultValue: 'is missing' });
    default:
      return t('reasonGeneric', { defaultValue: 'was not accepted' });
  }
}

/**
 * A refused save, as readable text: each refused field by its own label with
 * the reason in words. The machine code is never shown.
 */
export function describeVesselSaveRefusal(
  error: unknown,
  t: Translate,
  labelFor: (key: string) => string,
): string {
  if (!isDmsError(error)) {
    return t('vesselSaveFailed', { defaultValue: 'The vessel could not be saved.' });
  }
  const details = error.details ? Object.entries(error.details) : [];
  if (error.code === 'Validation' && details.length > 0) {
    const lines = details.map(([key, reason]) => `${labelFor(key)}: ${reasonText(String(reason), t)}`);
    return `${t('refusalLead', { defaultValue: 'Not saved:' })} ${lines.join(' · ')}`;
  }
  if (error.message === 'CONCURRENT_UPDATE') {
    return t('refusalConcurrent', {
      defaultValue: 'Someone else changed this at the same time. Reload the page and try again.',
    });
  }
  switch (error.code) {
    case 'NotFound':
      return t('refusalNotFound', { defaultValue: 'This no longer exists. Reload the page.' });
    case 'Forbidden':
      return t('refusalForbidden', { defaultValue: 'Your account is not allowed to do this.' });
    case 'Unavailable':
      return t('refusalUnavailable', {
        defaultValue: 'The service could not be reached. Try again in a moment.',
      });
    case 'Validation':
      return t('refusalValidationGeneric', {
        defaultValue: 'Some of the values were not accepted. Check them and try again.',
      });
    default:
      return t('vesselSaveFailed', { defaultValue: 'The vessel could not be saved.' });
  }
}
