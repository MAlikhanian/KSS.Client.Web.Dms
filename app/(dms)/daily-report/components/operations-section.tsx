'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError } from '@/lib/dms/errors';
import { transitionReport } from '@/lib/dms/mock-store';
import type { DmsActor, DmsDailyOperationReport } from '@/lib/dms/types';
import { canTransition } from '@/lib/dms/workflow';

/**
 * The Operations card — black/white border, last child inside the fieldset.
 *
 * The button is disabled via `canTransition`, which is implemented by
 * attempting the transition and catching, so the enabled state and the rule
 * the store enforces cannot drift apart. It is a courtesy, not the control:
 * the store still refuses independently, and a refusal that reaches here is
 * displayed rather than swallowed.
 */
export function OperationsSection({
  report,
  actor,
}: {
  report: DmsDailyOperationReport;
  actor: DmsActor;
}) {
  const { t } = useTranslation('dms');
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: () =>
      transitionReport({ id: report.id, action: { type: 'Submit' }, actor }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dms', 'reports'] });
    },
  });

  const canSubmit = canTransition(report, { type: 'Submit' }, actor);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('operations', { defaultValue: 'Operations' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t('submitExplain', {
            defaultValue:
              'Submitting locks the day for editing and sends it to the vessel supervisor for review.',
          })}
        </p>

        {submitMutation.isError && (
          <p className="text-sm text-destructive">
            {isDmsError(submitMutation.error)
              ? `${submitMutation.error.message} (${submitMutation.error.code})`
              : t('submitFailed', { defaultValue: 'Submit failed.' })}
          </p>
        )}

        <Button
          variant="primary"
          disabled={!canSubmit || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          {submitMutation.isPending
            ? t('submitting', { defaultValue: 'Submitting…' })
            : t('submitForApproval', {
                defaultValue: 'Submit for approval',
              })}
        </Button>
      </CardContent>
    </Card>
  );
}
