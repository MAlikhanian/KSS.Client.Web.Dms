import { isDmsError } from '@/lib/dms/errors';

/**
 * A refused vessel removal, as readable text, and whether the list should be
 * read again. The service keeps any vessel that something uses and names what
 * uses it in the refusal's details, one key per kind of use, each holding
 * "in use". The machine code is never shown.
 */
type Translate = (key: string, options: { defaultValue: string }) => string;

/** The kinds of use the service names, in the order they are listed. */
export const VESSEL_USES = ['assignments', 'subprojects', 'dailyReports'] as const;
export type VesselUse = (typeof VESSEL_USES)[number];

export function isVesselInUse(error: unknown): boolean {
  return isDmsError(error) && error.code === 'Conflict' && error.message === 'VESSEL_IN_USE';
}

/** Which uses an in-use refusal names. Keys it does not know are left out. */
export function vesselUsesNamed(error: unknown): VesselUse[] {
  if (!isVesselInUse(error) || !isDmsError(error)) return [];
  const details = error.details ?? {};
  return VESSEL_USES.filter((use) => details[use] === 'in use');
}

/**
 * True when the list no longer matches the service: the vessel was not found
 * (already removed, or never this company's), or it was changed meanwhile.
 */
export function refreshAfter(error: unknown): boolean {
  return isDmsError(error) && (error.code === 'NotFound' || error.message === 'CONCURRENT_UPDATE');
}

function useLabel(use: VesselUse, t: Translate): string {
  switch (use) {
    case 'assignments':
      return t('vesselUseAssignments', { defaultValue: 'vessel assignments' });
    case 'subprojects':
      return t('vesselUseSubprojects', { defaultValue: 'subprojects' });
    case 'dailyReports':
      return t('vesselUseDailyReports', { defaultValue: 'daily reports' });
  }
}

export function describeVesselDeleteRefusal(error: unknown, t: Translate): string {
  if (isVesselInUse(error)) {
    const uses = vesselUsesNamed(error);
    if (uses.length === 0) {
      return t('vesselInUse', { defaultValue: 'This vessel is in use and was not removed.' });
    }
    const lead = t('vesselInUseLead', {
      defaultValue: 'This vessel is in use and was not removed. It is used in:',
    });
    return `${lead} ${uses.map((use) => useLabel(use, t)).join(' · ')}`;
  }
  if (!isDmsError(error)) {
    return t('vesselDeleteFailed', { defaultValue: 'The vessel could not be removed. Try again.' });
  }
  if (error.message === 'CONCURRENT_UPDATE') {
    return t('refusalConcurrent', {
      defaultValue: 'Someone else changed this at the same time. Reload the page and try again.',
    });
  }
  switch (error.code) {
    case 'NotFound':
      return t('vesselDeleteNotFound', {
        defaultValue: 'This vessel was not found; it may already have been removed. The list has been refreshed.',
      });
    case 'Forbidden':
      return t('refusalForbidden', { defaultValue: 'Your account is not allowed to do this.' });
    case 'Unavailable':
      return t('refusalUnavailable', {
        defaultValue: 'The service could not be reached. Try again in a moment.',
      });
    default:
      return t('vesselDeleteFailed', { defaultValue: 'The vessel could not be removed. Try again.' });
  }
}
