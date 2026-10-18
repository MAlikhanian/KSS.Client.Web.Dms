'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { transitionReport } from '@/lib/dms/store';
import type { DmsActor, DmsDailyOperationReport } from '@/lib/dms/types';
import { canTransition } from '@/lib/dms/workflow';
import { describeWithdrawRefusal, withdrawRefreshes } from '../../_lib/withdraw-refusal';

/**
 * Withdraw: the operator who sent a report for approval takes it back to
 * draft while it is still waiting for review.
 *
 * Rendered OUTSIDE the report's fieldset. A sent report is read-only, and a
 * disabled fieldset disables every button inside it, this one included.
 *
 * Offered only when `canTransition` allows it (an operator, the report is
 * Submitted, and the caller is the one who sent it). That is a courtesy: the service
 * refuses anyone else, and a refusal is shown as text, never as its code.
 */
export function WithdrawSection({
  report,
  actor,
}: {
  report: DmsDailyOperationReport;
  actor: DmsActor;
}) {
  const { t } = useTranslation('dms');
  const translate = (key: string, options: { defaultValue: string }) => t(key, options);
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const reload = () => {
    void queryClient.invalidateQueries({ queryKey: ['dms', 'reports'] });
  };

  const withdrawMutation = useMutation({
    mutationFn: () =>
      transitionReport({ id: report.id, action: { type: 'Withdraw' }, actor }),
    onSuccess: () => {
      toast.success(t('withdrawDone', { defaultValue: 'The report is back in draft.' }));
      reload();
    },
    // A toast, not a line in the card: after a reload the card may be gone.
    onError: (error) => {
      toast.error(describeWithdrawRefusal(error, translate));
      if (withdrawRefreshes(error)) reload();
    },
  });

  if (!canTransition(report, { type: 'Withdraw' }, actor)) return null;

  return (
    <div
      data-dms-withdraw="withdraw-outside-fieldset"
      className="mt-6 [&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!"
    >
      <Card>
        <CardHeader>
          <CardTitle>
            {t('withdrawTitle', { defaultValue: 'Withdraw the report' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('withdrawExplain', {
              defaultValue:
                'This report has been sent for approval. Until the vessel supervisor approves or rejects it, you can withdraw it: it goes back to draft and can be edited again.',
            })}
          </p>
          <Button
            variant="outline"
            disabled={withdrawMutation.isPending}
            onClick={() => setConfirming(true)}
          >
            {withdrawMutation.isPending
              ? t('withdrawing', { defaultValue: 'Withdrawing…' })
              : t('withdraw', { defaultValue: 'Withdraw' })}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('withdrawConfirmTitle', { defaultValue: 'Withdraw this report?' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('withdrawConfirmBody', {
                defaultValue:
                  'The report leaves the approval queue and goes back to draft. After editing it, send it for approval again.',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel', { defaultValue: 'Cancel' })}</AlertDialogCancel>
            <AlertDialogAction onClick={() => withdrawMutation.mutate()}>
              {t('withdraw', { defaultValue: 'Withdraw' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
