import { isDmsError } from '@/lib/dms/errors';

/**
 * A refused reopen, as readable text, and whether the report should be read
 * again. The service's code is in `message`; `code` is the kind of refusal.
 * The machine code is never shown.
 */
type Translate = (key: string, options: { defaultValue: string }) => string;

/** True when the report on screen no longer matches the service. */
export function reopenRefreshes(error: unknown): boolean {
  return isDmsError(error) && (error.code === 'Conflict' || error.code === 'NotFound');
}

export function describeReopenRefusal(error: unknown, t: Translate): string {
  const failed = () =>
    t('reopenFailed', {
      defaultValue: 'The report was not reopened. Try again; if it happens again, tell support.',
    });
  if (!isDmsError(error)) return failed();

  switch (error.message) {
    case 'REPORT_NOT_FOUND':
      return t('reopenNotFound', {
        defaultValue: 'This report was not found. The page has been refreshed.',
      });
    case 'PROJECT_NOT_ASSIGNED':
      return t('reopenNotAssigned', {
        defaultValue: 'Your assignment on this project does not cover this report’s date.',
      });
    case 'REPORT_REOPEN_FORBIDDEN':
      return t('reopenForbidden', {
        defaultValue: 'Your account may not reopen approved reports.',
      });
    case 'REPORT_NOT_APPROVED':
      return t('reopenNotApproved', {
        defaultValue: 'This report is no longer approved, so it cannot be reopened. The page has been refreshed.',
      });
    case 'REPORT_STATE_CHANGED':
    case 'CONCURRENT_UPDATE':
      return t('reopenStateChanged', {
        defaultValue: "This report's status changed in the meantime. The page has been refreshed.",
      });
    case 'REPORT_APPROVED_LOCKED':
    case 'TRANSITION_TYPE_INVALID':
      return failed();
  }

  switch (error.code) {
    case 'NotFound':
      return t('reopenNotFound', {
        defaultValue: 'This report was not found. The page has been refreshed.',
      });
    case 'Conflict':
      return t('reopenStateChanged', {
        defaultValue: "This report's status changed in the meantime. The page has been refreshed.",
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
