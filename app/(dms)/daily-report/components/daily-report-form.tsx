'use client';

import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import {
  listCyclesForReport,
  listStoppagesForReport,
} from '@/lib/dms/mock-store';
import type { DmsActor, DmsDailyOperationReport } from '@/lib/dms/types';
import { canEditFields } from '@/lib/dms/workflow';
import { CyclesSection, StoppagesSection } from '../../_components';
import { OperationsSection } from './operations-section';
import { ReportInfoSection } from './report-info-section';

/**
 * Fieldset host for the day.
 *
 * READ-ONLY IS ONE SWITCH. §1 gives the operator «امکان ویرایش اطلاعات تا پیش
 * از ارسال به سرپرست», and §3 reopens the lock on rejection — so the answer
 * comes from workflow.ts's `canEditFields`, not from a status check written
 * again here. A second copy of the rule would eventually disagree with the one
 * the store enforces, and the visible symptom would be an enabled control that
 * throws on save.
 *
 * The Operations card lives INSIDE the fieldset as its last child, so the
 * read-only switch reaches it and its spacing matches the sections.
 */
export function DailyReportForm({
  report,
  actor,
  onClose,
}: {
  report: DmsDailyOperationReport;
  actor: DmsActor;
  onClose: () => void;
}) {
  const { t } = useTranslation('dms');
  const isReadOnly = !canEditFields(report, actor);

  const cyclesQuery = useQuery({
    queryKey: ['dms', 'cycles', report.id],
    queryFn: () => listCyclesForReport({ reportId: report.id }),
    retry: false,
  });

  const stoppagesQuery = useQuery({
    queryKey: ['dms', 'stoppages', report.id],
    queryFn: () => listStoppagesForReport({ reportId: report.id }),
    retry: false,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          {t('backToDays', { defaultValue: 'Back to days' })}
        </Button>
      </div>

      {/* Glass tint on the wrapper; per-section borders beat it with the
          doubled class. Both blocks are copied from the person/edit reference,
          which wins over any paraphrase of it. */}
      <div
        className={
          '[&_div.rounded-xl.bg-card]:bg-blue-50! ' +
          '[&_div.rounded-xl.bg-card]:border-blue-100! ' +
          'dark:[&_div.rounded-xl.bg-card]:bg-blue-950/25! ' +
          'dark:[&_div.rounded-xl.bg-card]:border-blue-900! ' +
          '[&_div.rounded-xl.bg-card]:shadow-lg ' +
          '[&_div.rounded-xl.bg-card]:shadow-black/5'
        }
      >
        <fieldset disabled={isReadOnly} className="space-y-6 contents">
          <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
            <ReportInfoSection
              report={report}
              edit={{ actor, canEdit: !isReadOnly }}
            />
          </div>

          <div className="[&_div.rounded-xl.bg-card.bg-card]:border-sky-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-sky-500!">
            <CyclesSection
              cycles={cyclesQuery.data ?? []}
              isLoading={cyclesQuery.isLoading}
              error={cyclesQuery.error}
              edit={{
                reportId: report.id,
                reportDate: report.reportDate,
                reportStatus: report.approvalStatus,
                actor,
                canEdit: !isReadOnly,
              }}
            />
          </div>

          <div className="[&_div.rounded-xl.bg-card.bg-card]:border-amber-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-amber-500!">
            <StoppagesSection
              stoppages={stoppagesQuery.data ?? []}
              isLoading={stoppagesQuery.isLoading}
              error={stoppagesQuery.error}
              /*
                `canEdit` MIRRORS the workflow rule; it does not implement it.
                Every write is refused independently by the store via
                assertEditable, so hiding a control here is a courtesy and the
                refusal is the control.
              */
              edit={{
                reportId: report.id,
                reportDate: report.reportDate,
                reportStatus: report.approvalStatus,
                actor,
                canEdit: !isReadOnly,
              }}
            />
          </div>

          <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
            <OperationsSection report={report} actor={actor} />
          </div>
        </fieldset>
      </div>
    </div>
  );
}
