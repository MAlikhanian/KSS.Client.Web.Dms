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
import { describeReopenRefusal, reopenRefreshes } from '../_lib/reopen-refusal';

/**
 * Reopen: an approved report goes back to be corrected, and then follows the
 * normal path (the operator edits it and sends it for approval again).
 *
 * Offered only when the service says this caller may (`canReopen`), which it
 * says for one person only; the zone names nobody. That is a courtesy: the
 * service refuses everyone else. Rendered OUTSIDE any disabled fieldset, since
 * an approved report is read-only.
 */
export function ReopenSection({
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

  const reopenMutation = useMutation({
    mutationFn: () =>
      transitionReport({ id: report.id, action: { type: 'Reopen' }, actor }),
    onSuccess: () => {
      toast.success(t('reopenDone', { defaultValue: 'The report has been reopened.' }));
      reload();
    },
    // A toast, not a line in the card: after a reload the card may be gone.
    onError: (error) => {
      toast.error(describeReopenRefusal(error, translate));
      if (reopenRefreshes(error)) reload();
    },
  });

  if (!canTransition(report, { type: 'Reopen' }, actor)) return null;

  return (
    <div
      data-dms-reopen="reopen-on-flag"
      className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!"
    >
      <Card>
        <CardHeader>
          <CardTitle>{t('reopenTitle', { defaultValue: 'Reopen the report' })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('reopenExplain', {
              defaultValue:
                'This report is approved. Reopening it lets the operator correct it and send it for approval again; until then it does not count in the figures.',
            })}
          </p>
          <Button
            variant="outline"
            disabled={reopenMutation.isPending}
            onClick={() => setConfirming(true)}
          >
            {reopenMutation.isPending
              ? t('reopening', { defaultValue: 'Reopening…' })
              : t('reopen', { defaultValue: 'Reopen' })}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('reopenConfirmTitle', { defaultValue: 'Reopen this approved report?' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('reopenConfirmBody', {
                defaultValue:
                  'The report leaves the approved figures and can be edited again. It counts again once it is approved again.',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel', { defaultValue: 'Cancel' })}</AlertDialogCancel>
            <AlertDialogAction onClick={() => reopenMutation.mutate()}>
              {t('reopen', { defaultValue: 'Reopen' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
