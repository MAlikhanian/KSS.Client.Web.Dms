import type { ReportStatus } from '@/lib/dms/types';

/**
 * One mapping from workflow status to how it is shown, shared by the operator
 * and supervisor screens. Two copies would drift, and the drift would be a
 * report that reads Approved on one screen and Submitted on the other.
 */
export const STATUS_BADGE: Record<
  ReportStatus,
  { variant: 'secondary' | 'warning' | 'success' | 'destructive'; key: string; fallback: string }
> = {
  Draft: { variant: 'secondary', key: 'statusDraft', fallback: 'Draft' },
  Submitted: { variant: 'warning', key: 'statusSubmitted', fallback: 'Submitted' },
  Approved: { variant: 'success', key: 'statusApproved', fallback: 'Approved' },
  Rejected: { variant: 'destructive', key: 'statusRejected', fallback: 'Rejected' },
};

/** Minutes as `H:MM`, for a per-row duration shown beside the times it came from. */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}
