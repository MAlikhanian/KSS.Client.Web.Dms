'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError } from '@/lib/dms/errors';
import {
  listCyclesForReport,
  listProjects,
  listReports,
  listStoppagesForReport,
} from '@/lib/dms/mock-store';
import { ALL_REPORT_STATUSES, type ReportStatus } from '@/lib/dms/types';
import {
  CyclesSection,
  ReportDateRange,
  StoppagesSection,
  type ReportDateRangeValue,
} from '../_components';
import { ReportInfoSection } from '../daily-report/components';
import { formatJalaliDate } from '../_lib/jalali-date';
import { STATUS_BADGE } from '../_lib/report-status';
import { useDmsActor } from '../_lib/use-dms-actor';

/** The status filter's value for "every status". Not a ReportStatus. */
const ALL = 'all';

/**
 * Project control's READ-ONLY view of the daily reports.
 *
 * Head office sees what the vessels recorded: every day of a project, in any
 * status, filtered by period and status. It creates, edits, submits and
 * approves nothing, and this screen offers none of those.
 *
 * ⛔ A SEPARATE ROUTE, NOT A WIDENED `/daily-report`. That route is the
 * operator's entry screen and its guard admits the Operator only. Adding
 * ProjectControl to it would put head office on a screen built around writes,
 * where only the store's refusal would stand between them and a create button.
 * Here there is no write path to refuse: no mutation is imported, the cycle and
 * stoppage sections are mounted WITHOUT their `edit` prop, and the report
 * section WITHOUT its `edit` prop, which is exactly how each renders read-only.
 *
 * Read-only in the UI is not read-only in the store — the store's writes
 * refuse this role independently (`createReport` is Operator-only, and every
 * cycle and stoppage write goes through `assertEditable`, which requires the
 * Operator).
 */
export function ReportsContent() {
  const { t } = useTranslation('dms');
  const { actor, ready } = useDmsActor();
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState<ReportStatus | typeof ALL>(ALL);
  const [range, setRange] = useState<ReportDateRangeValue>({ from: '', to: '' });
  const [openReportId, setOpenReportId] = useState<string | null>(null);

  const projectsQuery = useQuery({
    queryKey: ['dms', 'projects'],
    queryFn: () => listProjects({}),
    enabled: ready,
  });

  const reportsQuery = useQuery({
    queryKey: ['dms', 'reports', projectId, status, range.from, range.to],
    queryFn: () =>
      listReports({
        projectId,
        status: status === ALL ? undefined : status,
        from: range.from || undefined,
        to: range.to || undefined,
      }),
    enabled: !!projectId,
    retry: false,
  });

  const openReport = reportsQuery.data?.find((r) => r.id === openReportId);

  const cyclesQuery = useQuery({
    queryKey: ['dms', 'cycles', openReportId],
    queryFn: () => listCyclesForReport({ reportId: openReportId as string }),
    enabled: !!openReportId,
    retry: false,
  });

  const stoppagesQuery = useQuery({
    queryKey: ['dms', 'stoppages', openReportId],
    queryFn: () => listStoppagesForReport({ reportId: openReportId as string }),
    enabled: !!openReportId,
    retry: false,
  });

  if (!ready) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          {t('loading', { defaultValue: 'Loading…' })}
        </CardContent>
      </Card>
    );
  }

  // The route guard refuses other roles too; a component that assumes it was
  // guarded breaks quietly the day the route moves.
  if (!actor || actor.role !== 'ProjectControl') {
    return (
      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
        <Card>
          <CardContent className="py-8 space-y-2">
            <h2 className="font-semibold">
              {t('projectControlOnlyTitle', {
                defaultValue: 'This screen belongs to the Project Control role',
              })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('reportsViewRoleBody', {
                defaultValue:
                  'Head office views the daily reports here. Change role to continue.',
              })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filtered = status !== ALL || range.from !== '' || range.to !== '';

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>
            {t('reportsViewTitle', { defaultValue: 'Daily reports' })}
          </ToolbarTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <span className="text-sm text-muted-foreground">{actor.userName}</span>
        </ToolbarActions>
      </Toolbar>

      <p className="text-sm text-muted-foreground">
        {t('reportsViewReadOnlyNote', {
          defaultValue:
            'View only. Daily reports are entered by the operator and approved by the vessel supervisor; nothing can be changed here.',
        })}
      </p>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium block" htmlFor="dms-reports-project">
                  {t('project', { defaultValue: 'Project' })}
                </label>
                <Select
                  value={projectId || undefined}
                  onValueChange={(value) => {
                    setProjectId(value);
                    setOpenReportId(null);
                  }}
                >
                  <SelectTrigger id="dms-reports-project" className="w-full">
                    <SelectValue
                      placeholder={t('selectProject', { defaultValue: 'Select a project…' })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {projectsQuery.data?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.projectCode} — {p.contractSubject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium block" htmlFor="dms-reports-status">
                  {t('reportStatus', { defaultValue: 'Status' })}
                </label>
                <Select
                  value={status}
                  onValueChange={(value) => {
                    setStatus(value as ReportStatus | typeof ALL);
                    setOpenReportId(null);
                  }}
                >
                  <SelectTrigger id="dms-reports-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>
                      {t('allStatuses', { defaultValue: 'All statuses' })}
                    </SelectItem>
                    {ALL_REPORT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(STATUS_BADGE[s].key, { defaultValue: STATUS_BADGE[s].fallback })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <ReportDateRange
              idPrefix="dms-reports-range"
              value={range}
              onChange={(next) => {
                setRange(next);
                setOpenReportId(null);
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* FAILURE PATH ONE — the store rejected. */}
      {projectId && reportsQuery.isError && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
          <Card>
            <CardContent className="py-8 space-y-3">
              <h2 className="font-semibold">
                {t('loadFailedTitle', {
                  defaultValue: 'This project’s days could not be loaded',
                })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {describeError(reportsQuery.error)}
              </p>
              <Button variant="outline" onClick={() => void reportsQuery.refetch()}>
                {t('retry', { defaultValue: 'Try again' })}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* FAILURE PATH TWO — loaded fine, nothing matches. Says whether a filter
          is narrowing it, so an empty filtered list is not read as an empty project. */}
      {projectId && reportsQuery.isSuccess && reportsQuery.data.length === 0 && (
        <Card>
          <CardContent className="py-8 space-y-2">
            <h2 className="font-semibold">
              {t('noReportsTitle', { defaultValue: 'No daily reports' })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {filtered
                ? t('noReportsFilteredBody', {
                    defaultValue: 'No daily report of this project matches the selected period and status.',
                  })
                : t('noReportsBody', {
                    defaultValue: 'No daily report has been recorded for this project yet.',
                  })}
            </p>
          </CardContent>
        </Card>
      )}

      {projectId && reportsQuery.isSuccess && reportsQuery.data.length > 0 && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
          <Card>
            <CardContent className="py-4">
              <ul className="divide-y divide-border">
                {reportsQuery.data.map((r) => (
                  <li key={r.id} className="py-2 flex items-center justify-between gap-4">
                    <span className="text-sm">{formatJalaliDate(r.reportDate)}</span>
                    <Badge variant={STATUS_BADGE[r.approvalStatus].variant}>
                      {t(STATUS_BADGE[r.approvalStatus].key, {
                        defaultValue: STATUS_BADGE[r.approvalStatus].fallback,
                      })}
                    </Badge>
                    <Button
                      variant={openReportId === r.id ? 'primary' : 'outline'}
                      onClick={() => setOpenReportId(openReportId === r.id ? null : r.id)}
                    >
                      {t('viewReport', { defaultValue: 'View' })}
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {openReport && (
        <div className="space-y-6">
          <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
            <ReportInfoSection report={openReport} />
          </div>
          <div className="[&_div.rounded-xl.bg-card.bg-card]:border-sky-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-sky-500!">
            <CyclesSection
              cycles={cyclesQuery.data ?? []}
              isLoading={cyclesQuery.isLoading}
              error={cyclesQuery.error}
            />
          </div>
          <div className="[&_div.rounded-xl.bg-card.bg-card]:border-amber-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-amber-500!">
            <StoppagesSection
              stoppages={stoppagesQuery.data ?? []}
              isLoading={stoppagesQuery.isLoading}
              error={stoppagesQuery.error}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function describeError(error: unknown): string {
  if (isDmsError(error)) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'Unknown error';
}
