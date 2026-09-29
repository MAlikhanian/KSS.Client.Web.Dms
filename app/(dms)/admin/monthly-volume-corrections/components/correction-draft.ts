import { isDmsError } from '@/lib/dms/errors';

/**
 * The correction form's rules, kept free of React so they run in a plain test.
 */

/** The whole project, in the subproject select. A real id is a UUID, so it cannot collide. */
export const WHOLE_PROJECT = 'whole-project';

export interface CorrectionDraft {
  /** WHOLE_PROJECT or a subproject id. */
  subprojectId: string;
  jalaliYear: string;
  jalaliMonth: string;
  volume: string;
  notes: string;
}

export type DraftProblems = { year?: true; month?: true; volume?: true };

/** The service's own rules, checked first so most mistakes never make the round trip. */
export function draftProblems(
  draft: CorrectionDraft,
  parseNumber: (text: string) => number | undefined,
): DraftProblems {
  const year = parseNumber(draft.jalaliYear);
  const month = parseNumber(draft.jalaliMonth);
  const volume = parseNumber(draft.volume);
  return {
    ...(year === undefined || !Number.isInteger(year) || year < 1300 || year > 1500 ? { year: true as const } : {}),
    ...(month === undefined || !Number.isInteger(month) || month < 1 || month > 12 ? { month: true as const } : {}),
    ...(volume === undefined || volume < 0 ? { volume: true as const } : {}),
  };
}

/** Which of the refusals this screen explains in its own words. */
export type CorrectionErrorKind =
  | { kind: 'duplicate-month' }
  | { kind: 'invalid'; fields: string }
  | { kind: 'service'; text: string }
  | { kind: 'unknown' };

export function classifyCorrectionError(error: unknown): CorrectionErrorKind {
  if (!isDmsError(error)) return { kind: 'unknown' };
  if (error.code === 'Conflict' && error.message === 'DUPLICATE_MONTH') return { kind: 'duplicate-month' };
  if (error.code === 'Validation' && error.details && Object.keys(error.details).length > 0) {
    return {
      kind: 'invalid',
      fields: Object.entries(error.details)
        .map(([field, problem]) => `${field}: ${problem}`)
        .join(' · '),
    };
  }
  return { kind: 'service', text: `${error.message} (${error.code})` };
}
