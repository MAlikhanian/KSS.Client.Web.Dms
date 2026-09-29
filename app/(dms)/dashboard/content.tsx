'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';
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
import { getDashboard, listProjects } from '@/lib/dms/store';
import type { DmsDashboard } from '@/lib/dms/types';
import { formatMinutes } from '../_lib/report-status';
import { useDmsActor } from '../_lib/use-dms-actor';
import {
  FinancialProgressGap,
  KpiFigureTile,
  KpiQuantityTile,
  PhysicalProgressPanel,
  StoppageByCauseChart,
  TimeShareChart,
} from './components';
import { useLocaliseKpi } from './service-text';

/**
 * The KPI dashboard — the specification's roles section: «مشاهده داشبورد کلان مدیریتی», کنترل پروژه only.
 *
 * ─── WHERE THE FIGURES COME FROM ────────────────────────────────────────────
 * Every figure is computed by the DMS SERVICE from APPROVED reports only, and
 * arrives in one response (GET dashboard). Nothing here re-derives a figure: a
 * second computation in the browser would be a second definition of each KPI,
 * and the two would drift. The screen chooses the scope and lays the figures
 * out; it does not calculate them.
 *
 * Each KPI states the reading it was computed under (its `basis`) on the tile,
 * translated from the service's text (service-text.ts). A KPI the service
 * cannot state arrives as not-applicable WITH its reason, and renders as that
 * reason rather than as a zero.
 *
 * ⛔ FINANCIAL PROGRESS IS A NAMED GAP, NOT A MISSING CHART, and EARNED VALUE is
 * not-applicable: the service does not compute either yet.
 *
 * ⛔ AVAILABILITY AND DOWNTIME MUST NEVER SHARE ONE FIGURE. Their denominators
 * differ, so they do not complement to 100. The time-share chart is safe
 * because its parts genuinely sum to one whole; that is a property of THAT
 * chart, not a licence for others.
 */
export function DashboardContent() {
  const { t } = useTranslation('dms');
  const { actor, ready } = useDmsActor('ProjectControl');
  const [projectId, setProjectId] = useState('');

  const projectsQuery = useQuery({
    queryKey: ['dms', 'projects'],
    queryFn: () => listProjects({}),
    enabled: ready && !!actor,
    retry: false,
  });

  // One query for both states. No project chosen: every project the caller's
  // company holds, aggregated by the service. A project chosen: that project.
  const dashboardQuery = useQuery({
    queryKey: ['dms', 'dashboard', projectId],
    queryFn: () => getDashboard(projectId ? { projectId } : {}),
    enabled: ready && !!actor,
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
              {t('dashboardRoleBody', {
                defaultValue:
                  'The management dashboard belongs to head office. Your account does not hold this role.',
              })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = dashboardQuery.data;

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>
            {t('dashboardTitle', { defaultValue: 'Management dashboard' })}
          </ToolbarTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <span className="text-sm text-muted-foreground">{actor.userName}</span>
        </ToolbarActions>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
        <Card>
          <CardContent className="py-4 space-y-3">
            <label className="text-sm font-medium block" htmlFor="dashboard-project">
              {t('project', { defaultValue: 'Project' })}
            </label>
            <Select value={projectId || undefined} onValueChange={setProjectId}>
              <SelectTrigger id="dashboard-project" className="w-full">
                <SelectValue
                  placeholder={t('selectProject', {
                    defaultValue: 'Select a project…',
                  })}
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
            <p className="text-xs text-muted-foreground">
              {t('approvedOnlyNote', {
                defaultValue:
                  'Every figure below is computed from APPROVED days only. Draft, submitted and rejected days are excluded.',
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {dashboardQuery.isLoading && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {t('loading', { defaultValue: 'Loading…' })}
          </CardContent>
        </Card>
      )}

      {/* FAILURE PATH ONE — the figures could not be loaded. */}
      {!!dashboardQuery.error && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
          <Card>
            <CardContent className="py-8 space-y-3">
              <h2 className="font-semibold">
                {projectId
                  ? t('dashboardLoadFailedTitle', {
                      defaultValue: 'This project’s figures could not be loaded',
                    })
                  : t('aggregateFailedTitle', {
                      defaultValue: 'The overview could not be loaded',
                    })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isDmsError(dashboardQuery.error)
                  ? `${dashboardQuery.error.message} (${dashboardQuery.error.code})`
                  : t('dashboardLoadFailed', {
                      defaultValue: 'The figures could not be loaded.',
                    })}
              </p>
              <Button variant="outline" onClick={() => void dashboardQuery.refetch()}>
                {t('retry', { defaultValue: 'Try again' })}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── DEFAULT STATE: every project, aggregated by the service ────────── */}
      {!projectId && data && <AllProjects data={data} projectCodes={projectCodes(projectsQuery.data)} />}

      {/* FAILURE PATH TWO — loaded, and no day has been approved. Distinct from
          "no data": reports may exist in draft or awaiting review, and none of
          them belongs in a KPI. */}
      {projectId && data && data.totals.reportCount === 0 && (
        <Card>
          <CardContent className="py-8 space-y-2">
            <h2 className="font-semibold">
              {t('noApprovedDaysTitle', {
                defaultValue: 'No approved reports for this project',
              })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('noApprovedDaysBody', {
                defaultValue:
                  'Days may exist as drafts or be awaiting review. Only approved days enter these figures, so there is nothing to compute yet.',
              })}
            </p>
          </CardContent>
        </Card>
      )}

      {projectId && data && data.totals.reportCount > 0 && <ProjectFigures data={data} />}
    </div>
  );
}

function projectCodes(projects: { id: string; projectCode: string }[] | undefined): Map<string, string> {
  return new Map((projects ?? []).map((p) => [p.id, p.projectCode]));
}

function AllProjects({ data, projectCodes }: { data: DmsDashboard; projectCodes: Map<string, string> }) {
  const { t } = useTranslation('dms');
  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <h2 className="font-medium">{t('allProjectsTitle', { defaultValue: 'All projects' })}</h2>

        {/*
          ⛔ THE PARTIAL STATE. A total that silently omits a project it could
          not read excludes without saying so — and on an aggregate nobody can
          see which projects are in it. The disclosure comes from the SAME
          response the figures come from, and it NAMES what was left out.
        */}
        {data.excluded.length > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            {t('aggregatePartial', {
              defaultValue: 'Aggregated from {{included}} of {{total}} projects.',
              included: data.included.length,
              total: data.included.length + data.excluded.length,
            })}{' '}
            {data.excluded.map((e) => `${projectCodes.get(e.projectId) ?? e.projectId} (${e.code})`).join('، ')}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <KpiQuantityTile
            label={t('projectsIncluded', { defaultValue: 'Projects included' })}
            value={String(data.included.length)}
          />
          <KpiQuantityTile
            label={t('dredgedVolume', { defaultValue: 'Dredged volume' })}
            value={String(data.totals.dredgedVolumeM3)}
            unit="m³"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {t('selectProjectHint', {
            defaultValue: 'Choose a project above to see its own figures.',
          })}
        </p>
      </CardContent>
    </Card>
  );
}

function ProjectFigures({ data }: { data: DmsDashboard }) {
  const { t } = useTranslation('dms');
  const kpi = useLocaliseKpi();
  // The service states which volume the percentage is over (amended or
  // initial), or why there is none; that text is the panel's caption.
  const progress = kpi(data.kpis.physicalProgressPercent);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TimeShareChart
          title={t('chartTimeShare', { defaultValue: 'Time share' })}
          slices={data.timeShare}
          emptyText={t('chartNoTime', { defaultValue: 'No time recorded yet.' })}
          labelFor={(key) =>
            ({
              Dredging: t('phaseDredging', { defaultValue: 'Dredging' }),
              Transport: t('phaseTransport', { defaultValue: 'Transport' }),
              Discharge: t('phaseDischarge', { defaultValue: 'Discharge' }),
              Return: t('phaseReturn', { defaultValue: 'Return' }),
              // `chart*`, not `phase*`: stoppage is not a cycle phase.
              Stoppage: t('chartTimeShareStoppage', { defaultValue: 'Stoppages' }),
            })[key] ?? key
          }
        />

        <StoppageByCauseChart
          title={t('chartStoppageCause', { defaultValue: 'Stoppage analysis by cause' })}
          bars={data.stoppagesByCause.bars}
          emptyText={t('chartNoStoppages', { defaultValue: 'No stoppages recorded yet.' })}
          unknownCodeNote={
            data.stoppagesByCause.unknownTypeMinutes > 0
              ? t('chartUnknownStoppageCode', {
                  defaultValue:
                    'Some stoppages carry a code that is not in the stoppage types table; they are shown under that code.',
                })
              : null
          }
        />

        <PhysicalProgressPanel
          title={t('chartPhysicalProgress', { defaultValue: 'Physical progress' })}
          percent={progress.kind === 'value' ? progress.value : null}
          caption={progress.kind === 'value' ? progress.basis : ''}
          noDenominatorText={progress.kind === 'not-applicable' ? progress.reason : ''}
        />

        <FinancialProgressGap
          title={t('chartFinancialProgress', { defaultValue: 'Financial progress' })}
          body={t('chartFinancialGap', {
            defaultValue:
              'Financial progress needs a separately recorded work-done amount. The system does not hold one, so this figure would repeat physical progress rather than tell a second story.',
          })}
        />
      </div>

      {/* The specification's defined quantities. */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <KpiQuantityTile
          label={t('tOp', { defaultValue: 'T_OP — operating time' })}
          value={formatMinutes(data.totals.operatingMinutes)}
          unit="h:mm"
          note={t('tOpNote', {
            defaultValue: 'Dredging + transport + discharge + return, across all cycles.',
          })}
        />
        <KpiQuantityTile
          label={t('tPd', { defaultValue: 'T_PD — planned downtime' })}
          value={formatMinutes(data.totals.plannedStoppageMinutes)}
          unit="h:mm"
          note={t('tPdNote', { defaultValue: 'Stoppages flagged is_planned = true only.' })}
        />
        <KpiQuantityTile
          label={t('tUpd', { defaultValue: 'T_UPD — unplanned downtime' })}
          value={formatMinutes(data.totals.unplannedStoppageMinutes)}
          unit="h:mm"
        />
        <KpiQuantityTile
          label={t('tAv', { defaultValue: 'T_AV — available time' })}
          value={formatMinutes(data.totals.availableMinutes)}
          unit="h:mm"
          note={t('tAvNote', {
            defaultValue:
              '1440 minutes per approved report (one 24-hour day each), minus planned downtime.',
          })}
        />
        <KpiQuantityTile
          label={t('cycleCount', { defaultValue: 'Cycles' })}
          value={String(data.totals.cycleCount)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KpiFigureTile
          label={t('meanCycleTime', { defaultValue: 'Mean cycle time' })}
          result={kpi(data.kpis.meanCycleTime)}
        />
        <KpiFigureTile
          label={t('meanDailyVolume', { defaultValue: 'Mean daily dredged volume' })}
          result={kpi(data.kpis.meanDailyDredgedVolume)}
          format={(v) => v.toFixed(0)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiFigureTile
          label={t('availabilityPercent', { defaultValue: 'Vessel availability %' })}
          result={kpi(data.kpis.availabilityPercent)}
        />
        <KpiFigureTile
          label={t('technicalDowntimePercent', { defaultValue: 'Technical downtime %' })}
          result={kpi(data.kpis.technicalStoppagePercent)}
        />
        <KpiFigureTile
          label={t('operationalDowntimePercent', { defaultValue: 'Operational downtime %' })}
          result={kpi(data.kpis.operationalStoppagePercent)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Not computed by the service yet: said so, not shown as zero. */}
        <KpiFigureTile
          label={t('earnedValue', { defaultValue: 'Earned value (approved reports)' })}
          result={{
            kind: 'not-applicable',
            reason: t('earnedValuePending', {
              defaultValue: 'Not computed yet: this figure is not yet provided by the DMS service.',
            }),
          }}
        />
        {/* Stoppage time that sits outside the availability figure — named, so
            the three percentages above are not read as the whole of the day. */}
        <KpiFigureTile
          label={t('stoppageOutsideAvailability', {
            defaultValue: 'Stoppage time outside the availability figure',
          })}
          result={kpi(data.kpis.stoppageOutsideAvailabilityMinutes)}
          format={(v) => v.toFixed(0)}
        />
      </div>

      {/* Counted where they can be seen rather than dropped. Shown only when non-zero. */}
      {(data.totals.unclassifiedStoppageMinutes > 0 || data.totals.cyclesWithoutVolume > 0) && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-amber-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-amber-500!">
          <Card>
            <CardContent className="py-4 space-y-2">
              <h2 className="font-medium">
                {t('dataQualityTitle', { defaultValue: 'Not included in the buckets above' })}
              </h2>
              {data.totals.unclassifiedStoppageMinutes > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('unclassifiedNote', {
                    defaultValue: 'Stoppage time in a category outside the three defined categories',
                  })}
                  : {formatMinutes(data.totals.unclassifiedStoppageMinutes)}
                </p>
              )}
              {data.totals.cyclesWithoutVolume > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('cyclesWithoutVolumeNote', {
                    defaultValue: 'Cycles with no dredged volume recorded',
                  })}
                  : {data.totals.cyclesWithoutVolume}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
