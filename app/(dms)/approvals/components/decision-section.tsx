'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError } from '@/lib/dms/errors';
import { transitionReport } from '@/lib/dms/mock-store';
import type { DmsActor, DmsDailyOperationReport } from '@/lib/dms/types';
import { canTransition, type ReportAction } from '@/lib/dms/workflow';

/**
 * Approve, or reject with a reason. Black/white border.
 *
 * THE REASON IS NOT ENFORCED HERE. `ReportAction`'s Reject variant requires
 * `reason` by its type, so a rejection without one does not compile, and
 * `transition` refuses an empty or whitespace-only string at runtime. This
 * component disables the button as a courtesy and then displays whatever the
 * store refuses — it does not re-implement the rule, because a form-level copy
 * is what lets the rule quietly diverge from the one that is enforced.
 *
 * §1: «رد آن جهت اصلاح توسط اپراتور به همراه درج علت رد».
 * §3: Approve is permanent — «قفل دائم».
 */
export function DecisionSection({
  report,
  actor,
  onDecided,
}: {
  report: DmsDailyOperationReport;
  actor: DmsActor;
  onDecided: () => void;
}) {
  const { t } = useTranslation('dms');
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const decide = useMutation({
    mutationFn: (action: ReportAction) =>
      transitionReport({ id: report.id, action, actor }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dms', 'reports'] });
      onDecided();
    },
  });

  const canApprove = canTransition(report, { type: 'Approve' }, actor);
  // A reason is required, so the check must carry one — passing '' here would
  // ask "could I reject with no reason", whose answer is correctly no.
  const canReject = canTransition(
    report,
    { type: 'Reject', reason: reason.trim() || 'x' },
    actor,
  );
  const reasonGiven = reason.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('decision', { defaultValue: 'Decision' })} — {report.reportDate}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('approveExplain', {
            defaultValue:
              'Approving locks this day permanently and admits it to KPI calculation. Rejecting returns it to the operator for correction, and the reason is recorded.',
          })}
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium block" htmlFor="dms-reject-reason">
            {t('rejectionReason', { defaultValue: 'Rejection reason' })}
          </label>
          <Textarea
            id="dms-reject-reason"
            className="min-h-20"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('rejectionReasonPlaceholder', {
              defaultValue: 'Required when rejecting — what must the operator correct?',
            })}
          />
        </div>

        {decide.isError && (
          <p className="text-sm text-destructive">
            {isDmsError(decide.error)
              ? `${decide.error.message} (${decide.error.code})`
              : t('decisionFailed', { defaultValue: 'The decision failed.' })}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            variant="primary"
            disabled={!canApprove || decide.isPending}
            onClick={() => decide.mutate({ type: 'Approve' })}
          >
            {t('approve', { defaultValue: 'Approve' })}
          </Button>
          <Button
            variant="destructive"
            disabled={!canReject || !reasonGiven || decide.isPending}
            onClick={() =>
              decide.mutate({ type: 'Reject', reason: reason.trim() })
            }
          >
            {t('reject', { defaultValue: 'Reject' })}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
