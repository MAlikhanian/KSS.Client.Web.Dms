import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError } from '@/lib/dms/errors';

/**
 * A refused save, as readable text: each refused field by its own label with
 * the reason in words, or one sentence for a refusal that names no field.
 *
 * The service's machine code (STOPPAGE_INVALID, CONCURRENT_UPDATE…) is never
 * shown. It says nothing to the person entering the data, and a reason that
 * cannot be read is the same as no reason. A field, reason or code this does
 * not know still gets a readable sentence.
 *
 * Used by the cycle and stoppage forms. The field and reason words are the
 * service's: the reasons are the values it puts in `details`, keyed by the
 * camelCase field name.
 */
type Translate = (key: string, options: { defaultValue: string }) => string;

function fieldLabel(field: string, t: Translate): string {
  const start = t('timeStartWord', { defaultValue: 'start' });
  const end = t('timeEndWord', { defaultValue: 'end' });
  switch (field) {
    case 'stoppageDate':
      return t('stoppageDate', { defaultValue: 'Date' });
    case 'stoppageCode':
      return t('downtimeType', { defaultValue: 'Downtime type' });
    case 'startTime':
      return t('startTime', { defaultValue: 'Start (HH:mm)' });
    case 'endTime':
      return t('endTime', { defaultValue: 'End (HH:mm)' });
    case 'durationHours':
      return t('durationHours', { defaultValue: 'Duration (hours)' });
    case 'responsibleParty':
      return t('responsibleParty', { defaultValue: 'Responsible' });
    case 'cycleDate':
      return t('cycleDate', { defaultValue: 'Date' });
    case 'dredgedVolumeM3':
      return t('volumeM3', { defaultValue: 'Volume (m³)' });
    case 'dredgingStart':
      return `${t('phaseDredging', { defaultValue: 'Dredging' })} (${start})`;
    case 'dredgingEnd':
      return `${t('phaseDredging', { defaultValue: 'Dredging' })} (${end})`;
    case 'transportStart':
      return `${t('phaseTransport', { defaultValue: 'Transport' })} (${start})`;
    case 'transportEnd':
      return `${t('phaseTransport', { defaultValue: 'Transport' })} (${end})`;
    case 'dischargeStart':
      return `${t('phaseDischarge', { defaultValue: 'Discharge' })} (${start})`;
    case 'dischargeEnd':
      return `${t('phaseDischarge', { defaultValue: 'Discharge' })} (${end})`;
    case 'returnStart':
      return `${t('phaseReturn', { defaultValue: 'Return' })} (${start})`;
    case 'returnEnd':
      return `${t('phaseReturn', { defaultValue: 'Return' })} (${end})`;
    default:
      return t('refusalSomeField', { defaultValue: 'One of the values' });
  }
}

function reasonText(field: string, reason: string, t: Translate): string {
  switch (reason) {
    case 'required':
      return t('reasonRequired', { defaultValue: 'is missing' });
    case 'must be HH:mm':
      return t('reasonNotATime', { defaultValue: 'must be hours:minutes, for example 08:30' });
    case 'not a valid time':
      return t('reasonInvalidTime', {
        defaultValue: 'is not a valid time (hours 0–23, minutes 00–59)',
      });
    case 'must be greater than zero':
      return t('reasonMustBePositive', { defaultValue: 'must be greater than zero' });
    case 'too large':
      return t('reasonTooLarge', { defaultValue: 'is too large' });
    case 'cannot be negative':
      return t('reasonNegative', { defaultValue: 'cannot be negative' });
    case 'not a responsible party':
      return t('reasonNotAParty', { defaultValue: 'is not one of the listed parties' });
  }
  // These two words are the downtime-type reasons; on any other field they
  // would mean something else, so they fall through to the general sentence.
  if (field === 'stoppageCode' && reason === 'unknown') {
    return t('reasonUnknownType', { defaultValue: 'is not in the downtime type list' });
  }
  if (field === 'stoppageCode' && reason === 'inactive') {
    return t('reasonInactiveType', { defaultValue: 'has been deactivated and can no longer be chosen' });
  }
  return t('reasonGeneric', { defaultValue: 'was not accepted' });
}

/** Pure: the readable text for one refused save. Exported for the tests. */
export function describeRefusal(error: unknown, t: Translate): string {
  if (!isDmsError(error)) {
    return t('refusalGeneric', {
      defaultValue: 'It could not be saved. Try again; if it happens again, tell support.',
    });
  }

  const details = error.details ? Object.entries(error.details) : [];
  if (error.code === 'Validation' && details.length > 0) {
    const lines = details.map(([field, reason]) => `${fieldLabel(field, t)}: ${reasonText(field, reason, t)}`);
    return `${t('refusalLead', { defaultValue: 'Not saved:' })} ${lines.join(' · ')}`;
  }

  // The service's code is in `message`; `code` is the kind of refusal.
  switch (error.message) {
    case 'REPORT_APPROVED_LOCKED':
      return t('refusalApprovedLocked', {
        defaultValue: 'This report has been approved and can no longer be changed.',
      });
    case 'REPORT_LOCKED':
      return t('refusalReportLocked', {
        defaultValue: 'This report has been sent for approval and cannot be changed unless it is sent back.',
      });
    case 'REPORT_EDIT_FORBIDDEN':
      return t('refusalEditForbidden', {
        defaultValue: "Only an operator can change this report's data.",
      });
    case 'REPORT_STATE_CHANGED':
      return t('refusalStateChanged', {
        defaultValue: "This report's status changed in the meantime. Reload the page and try again.",
      });
    case 'CONCURRENT_UPDATE':
      return t('refusalConcurrent', {
        defaultValue: 'Someone else changed this at the same time. Reload the page and try again.',
      });
  }

  switch (error.code) {
    case 'NotFound':
      return t('refusalNotFound', {
        defaultValue: 'This no longer exists. Reload the page.',
      });
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
      return t('refusalGeneric', {
        defaultValue: 'It could not be saved. Try again; if it happens again, tell support.',
      });
  }
}

/** The readable text for a refused save, or undefined when nothing was refused. */
export function useRefusalText(): (error: unknown) => string | undefined {
  const { t } = useTranslation('dms');
  const translate: Translate = (key, options) => t(key, options);
  return (error) => (error ? describeRefusal(error, translate) : undefined);
}
