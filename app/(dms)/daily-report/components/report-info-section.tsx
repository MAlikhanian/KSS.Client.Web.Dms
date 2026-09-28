'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError } from '@/lib/dms/errors';
import { getProjectVessel, updateReport } from '@/lib/dms/mock-store';
import type { DmsActor, DmsDailyOperationReport } from '@/lib/dms/types';
import { STATUS_BADGE } from '../../_lib/report-status';

/** Section 1 — base info (flat fields). Blue, per the estate's kind→colour table. */
export function ReportInfoSection({
  report,
  edit,
}: {
  report: DmsDailyOperationReport;
  /**
   * Present only on the operator's screen, and only a courtesy: every write
   * goes through the store's `requireEditableReport`, so hiding the control
   * here never decides anything.
   */
  edit?: { actor: DmsActor; canEdit: boolean };
}) {
  const { t } = useTranslation('dms');
  const badge = STATUS_BADGE[report.approvalStatus];

  // The vessel is NOT read from the report even though ۲-۷ carries vessel_id:
  // ۲-۴ is the record of the one-to-one, and reading the denormalised copy
  // here is how the two come to disagree.
  const vesselQuery = useQuery({
    queryKey: ['dms', 'project-vessel', report.projectId],
    queryFn: () => getProjectVessel({ projectId: report.projectId }),
    retry: false,
  });

  const queryClient = useQueryClient();
  const [dailyNotes, setDailyNotes] = useState(report.dailyNotes ?? '');
  useEffect(() => {
    setDailyNotes(report.dailyNotes ?? '');
  }, [report.dailyNotes]);

  const saveNotes = useMutation({
    mutationFn: () => {
      if (!edit) throw new Error('Not editable');
      // `dailyNotes` is the whole of ReportPatch — see its docblock for why
      // everything else on the report is excluded rather than merely unused.
      return updateReport({
        id: report.id,
        patch: { dailyNotes: dailyNotes.trim() || undefined },
        actor: edit.actor,
      });
    },
    onSuccess: () => {
      toast.success(t('notesSaved', { defaultValue: 'Notes saved' }));
      void queryClient.invalidateQueries({ queryKey: ['dms', 'reports'] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
            1
          </span>
          {t('reportInfoTitle', { defaultValue: 'Report information' })}
          <Badge variant={badge.variant}>
            {t(badge.key, { defaultValue: badge.fallback })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Field
            label={t('reportDate', { defaultValue: 'Report date' })}
            value={report.reportDate}
          />
          <Field
            label={t('vessel', { defaultValue: 'Vessel' })}
            value={
              vesselQuery.isLoading
                ? '…'
                : vesselQuery.isError
                  ? t('vesselUnavailable', { defaultValue: 'Unavailable' })
                  : `${vesselQuery.data?.vesselCode} — ${vesselQuery.data?.name}`
            }
          />
          <Field
            label={t('registeredBy', { defaultValue: 'Registered by' })}
            value={report.registeredBy}
          />
          {edit?.canEdit ? (
            <div className="md:col-span-2 space-y-2">
              <label className="text-muted-foreground block" htmlFor="report-notes">
                {t('dailyNotes', { defaultValue: 'Daily notes' })}
              </label>
              <Textarea
                id="report-notes"
                className="min-h-20"
                value={dailyNotes}
                onChange={(e) => setDailyNotes(e.target.value)}
              />
              {saveNotes.isError && (
                <p className="text-sm text-destructive">
                  {isDmsError(saveNotes.error)
                    ? `${saveNotes.error.message} (${saveNotes.error.code})`
                    : t('notesSaveFailed', {
                        defaultValue: 'The notes could not be saved.',
                      })}
                </p>
              )}
              <Button
                variant="outline"
                disabled={saveNotes.isPending}
                onClick={() => saveNotes.mutate()}
              >
                {saveNotes.isPending
                  ? t('saving', { defaultValue: 'Saving…' })
                  : t('saveNotes', { defaultValue: 'Save notes' })}
              </Button>
            </div>
          ) : (
            <Field
              label={t('dailyNotes', { defaultValue: 'Daily notes' })}
              value={report.dailyNotes ?? '—'}
            />
          )}
          {report.rejectionNote && (
            <div className="md:col-span-2">
              {/* §3: the rejection reason is what the operator revises against,
                  so it stays visible after resubmission and after approval —
                  it is the only record of the review we have. */}
              <Field
                label={t('rejectionNote', { defaultValue: 'Rejection reason' })}
                value={report.rejectionNote}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
