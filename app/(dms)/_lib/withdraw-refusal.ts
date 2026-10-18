import { isDmsError } from '@/lib/dms/errors';

/**
 * A refused withdraw, as readable text, and whether the report should be read
 * again. The service's code is in `message`; `code` is the kind of refusal.
 * The machine code is never shown.
 */
type Translate = (key: string, options: { defaultValue: string }) => string;

/**
 * True when the report on screen no longer matches the service: its status
 * moved (approved, rejected, already withdrawn) or it is gone.
 */
export function withdrawRefreshes(error: unknown): boolean {
  return isDmsError(error) && (error.code === 'Conflict' || error.code === 'NotFound');
}

export function describeWithdrawRefusal(error: unknown, t: Translate): string {
  const failed = () =>
    t('withdrawFailed', {
      defaultValue: 'The report was not withdrawn. Try again; if it happens again, tell support.',
    });
  if (!isDmsError(error)) return failed();

  switch (error.message) {
    case 'REPORT_NOT_SUBMITTED':
      return t('withdrawNotSubmitted', {
        defaultValue: 'This report is not waiting for approval, so there is nothing to withdraw. The page has been refreshed.',
      });
    case 'REPORT_APPROVED_LOCKED':
      return t('withdrawApproved', {
        defaultValue: 'This report has been approved and can no longer be withdrawn. The page has been refreshed.',
      });
    case 'REPORT_STATE_CHANGED':
    case 'CONCURRENT_UPDATE':
      return t('withdrawStateChanged', {
        defaultValue: "This report's status changed in the meantime. The page has been refreshed.",
      });
    case 'REPORT_WITHDRAW_FORBIDDEN':
      return t('withdrawNotSubmitter', {
        defaultValue: 'Only the operator who sent this report can withdraw it.',
      });
    case 'REPORT_NOT_FOUND':
      return t('withdrawNotFound', {
        defaultValue: 'This report was not found. The page has been refreshed.',
      });
    case 'TRANSITION_TYPE_INVALID':
      return failed();
  }

  switch (error.code) {
    case 'Conflict':
      return t('withdrawStateChanged', {
        defaultValue: "This report's status changed in the meantime. The page has been refreshed.",
      });
    case 'NotFound':
      return t('withdrawNotFound', {
        defaultValue: 'This report was not found. The page has been refreshed.',
      });
    case 'Forbidden':
      return t('refusalForbidden', { defaultValue: 'Your account is not allowed to do this.' });
    case 'Unavailable':
      return t('refusalUnavailable', {
        defaultValue: 'The service could not be reached. Try again in a moment.',
      });
    default:
      return failed();
  }
}
