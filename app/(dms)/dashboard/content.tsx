'use client';

import { useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
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
import { computeKpis } from '@/lib/dms/kpi';
import {
  listApprovedReports,
  listCyclesForProject,
  listProjects,
  listStoppagesForProject,
} from '@/lib/dms/mock-store';
import { formatMinutes } from '../_lib/report-status';
import { useDmsActor } from '../_lib/use-dms-actor';
import { KpiFigureTile, KpiQuantityTile } from './components';

/**
 * The KPI dashboard — §1: «مشاهده داشبورد کلان مدیریتی», کنترل پروژه only.
 *
 * ─── WHAT IS HERE AND WHAT IS DELIBERATELY NOT ──────────────────────────────
 * §4's four intermediate quantities are fully defined by the document and are
 * shown as figures. **All five KPIs now carry values** — three of them closed
 * on 2026-09-08 by the customer's own answer, having previously been rendered
 * as visible gaps. Every one shows the reading it was computed under, because
 * he settled the denominators and not the numerators.
 *
 * The gap tiles are NOT deleted: `KpiGapTile` and `KpiUnavailableTile` remain,
 * and any KPI whose input or definition is missing still renders as itself
 * rather than as a zero.
 *
 * §5's four charts are NOT here. Nobody asked for them, and two of them depend
 * on the same undefined quantities.
 *
 * ─── APPROVED-ONLY ──────────────────────────────────────────────────────────
 * The engine takes `ApprovedDailyReport[]`, which only `listApprovedReports`
 * produces. Cycles and stoppages arrive unfiltered and the engine narrows them
 * to the approved reports itself — it does not trust this screen to have done
 * it.
 */
export function DashboardContent() {
  const { t } = useTranslation('dms');
  const { actor, ready } = useDmsActor();
  const [projectId, setProjectId] = useState('');

  const projectsQuery = useQuery({
    queryKey: ['dms', 'projects'],
    queryFn: () => listProjects({}),
    enabled: ready,
    retry: false,
  });

  const [approvedQuery, cyclesQuery, stoppagesQuery] = useQueries({
    queries: [
      {
        queryKey: ['dms', 'approved-reports', projectId],
        queryFn: () => listApprovedReports({ projectId }),
        enabled: !!projectId,
        retry: false,
      },
      {
        queryKey: ['dms', 'project-cycles', projectId],
        queryFn: () => listCyclesForProject({ projectId }),
        enabled: !!projectId,
        retry: false,
      },
      {
        queryKey: ['dms', 'project-stoppages', projectId],
        queryFn: () => listStoppagesForProject({ projectId }),
        enabled: !!projectId,
        retry: false,
      },
    ],
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
                  'The management dashboard belongs to head office. Change role to continue.',
              })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const error = approvedQuery.error ?? cyclesQuery.error ?? stoppagesQuery.error;
  const loading =
    approvedQuery.isLoading || cyclesQuery.isLoading || stoppagesQuery.isLoading;
  const loaded =
    approvedQuery.isSuccess && cyclesQuery.isSuccess && stoppagesQuery.isSuccess;

  const project = projectsQuery.data?.find((p) => p.id === projectId);

  const kpis =
    loaded && project
      ? computeKpis({
          reports: approvedQuery.data,
          cycles: cyclesQuery.data,
          stoppages: stoppagesQuery.data,
          project,
        })
      : null;

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
            <Select
              value={projectId || undefined}
              onValueChange={setProjectId}
            >
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

      {!projectId && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {t('noProjectBody', {
              defaultValue: 'Choose a project above to see its days.',
            })}
          </CardContent>
        </Card>
      )}

      {projectId && loading && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {t('loading', { defaultValue: 'Loading…' })}
          </CardContent>
        </Card>
      )}

      {/* FAILURE PATH ONE — a load failed. */}
      {projectId && !!error && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
          <Card>
            <CardContent className="py-8 space-y-3">
              <h2 className="font-semibold">
                {t('dashboardLoadFailedTitle', {
                  defaultValue: 'This project’s figures could not be loaded',
                })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isDmsError(error)
                  ? `${error.message} (${error.code})`
                  : t('dashboardLoadFailed', {
                      defaultValue: 'The figures could not be loaded.',
                    })}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  void approvedQuery.refetch();
                  void cyclesQuery.refetch();
                  void stoppagesQuery.refetch();
                }}
              >
                {t('retry', { defaultValue: 'Try again' })}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* FAILURE PATH TWO — loaded, and no day has been approved. Distinct from
          "no data": reports may exist in draft or awaiting review, and none of
          them belongs in a KPI. */}
      {kpis && kpis.totals.reportCount === 0 && (
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

      {kpis && kpis.totals.reportCount > 0 && (
        <>
          {/* §4's defined quantities. */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <KpiQuantityTile
              label={t('approvedReports', {
                defaultValue: 'Approved reports',
              })}
              value={String(kpis.totals.reportCount)}
            />
            <KpiQuantityTile
              label={t('tOp', { defaultValue: 'T_OP — operating time' })}
              value={formatMinutes(kpis.totals.operatingMinutes)}
              unit="h:mm"
              note={t('tOpNote', {
                defaultValue:
                  'Dredging + transport + discharge + return, across all cycles.',
              })}
            />
            <KpiQuantityTile
              label={t('tPd', { defaultValue: 'T_PD — planned downtime' })}
              value={formatMinutes(kpis.totals.plannedStoppageMinutes)}
              unit="h:mm"
              note={t('tPdNote', {
                defaultValue: 'Stoppages flagged is_planned = true only.',
              })}
            />
            <KpiQuantityTile
              label={t('tUpd', { defaultValue: 'T_UPD — unplanned downtime' })}
              value={formatMinutes(kpis.totals.unplannedStoppageMinutes)}
              unit="h:mm"
            />
            <KpiQuantityTile
              label={t('tAv', { defaultValue: 'T_AV — available time' })}
              value={formatMinutes(kpis.totals.availableMinutes)}
              unit="h:mm"
              note={t('tAvNote', {
                defaultValue:
                  '1440 minutes per approved report (one 24-hour day each), minus planned downtime.',
              })}
            />
            <KpiQuantityTile
              label={t('cycleCount', { defaultValue: 'Cycles' })}
              value={String(kpis.totals.cycleCount)}
            />
          </div>

          {/* The two computable KPIs, each carrying its reading. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KpiFigureTile
              label={t('meanCycleTime', { defaultValue: 'Mean cycle time' })}
              result={kpis.meanCycleTime}
            />
            <KpiFigureTile
              label={t('meanDailyVolume', {
                defaultValue: 'Mean daily dredged volume',
              })}
              result={kpis.meanDailyDredgedVolume}
              format={(v) => v.toFixed(0)}
            />
          </div>

          {/*
            CLOSED 2026-09-08 by Amir's own answer. These were gap tiles; they
            are values now, rendered through KpiFigureTile like the others so the
            union is narrowed in one place. Each carries its basis, because the
            customer settled the DENOMINATOR and not the numerator, and because
            the per-category split is our reading of §4 rather than his words.
          */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiFigureTile
              label={t('availabilityPercent', {
                defaultValue: 'Vessel availability %',
              })}
              result={kpis.availabilityPercent}
            />
            <KpiFigureTile
              label={t('technicalDowntimePercent', {
                defaultValue: 'Technical downtime %',
              })}
              result={kpis.technicalDowntimePercent}
            />
            <KpiFigureTile
              label={t('operationalDowntimePercent', {
                defaultValue: 'Operational downtime %',
              })}
              result={kpis.operationalDowntimePercent}
            />
          </div>

          {/*
            Earned value — Amir's answer 3, the part Amanda ruled IN scope.
            Recording client payments and the reconciliation report are OUT and
            nothing here reaches toward them: they are persisted financial
            records and DMS has no persistence layer, so a screen that appeared
            to record them would be a mock presented as a real system in the one
            place where being wrong costs the customer money.
          */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KpiFigureTile
              label={t('earnedValue', {
                defaultValue: 'Earned value (approved reports)',
              })}
              result={kpis.earnedValue}
              format={(v) => new Intl.NumberFormat('fa-IR').format(Math.round(v))}
            />
            {/*
              The residual. Availability and downtime are not expected to sum to
              100% under the reading shipped, and the difference is real time
              nobody logged — so it is named rather than left for a reader to
              infer from two percentages that do not add up.
            */}
            <KpiFigureTile
              label={t('unaccountedPercent', {
                defaultValue: 'Unaccounted — neither logged as work nor as a stoppage',
              })}
              result={kpis.unaccountedPercent}
            />
          </div>

          {/* Counted where they can be seen rather than dropped — see kpi.ts.
              Shown only when non-zero, but never summed away. */}
          {(kpis.totals.unclassifiedStoppageMinutes > 0 ||
            kpis.totals.unparseableCyclePhases > 0 ||
            kpis.totals.unparseableRoundTrips > 0) && (
            <div className="[&_div.rounded-xl.bg-card.bg-card]:border-amber-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-amber-500!">
              <Card>
                <CardContent className="py-4 space-y-2">
                  <h2 className="font-medium">
                    {t('dataQualityTitle', {
                      defaultValue: 'Not included in the buckets above',
                    })}
                  </h2>
                  {kpis.totals.unclassifiedStoppageMinutes > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t('unclassifiedNote', {
                        defaultValue:
                          'Stoppage time in a category outside the three the FRD lists',
                      })}
                      : {formatMinutes(kpis.totals.unclassifiedStoppageMinutes)}
                    </p>
                  )}
                  {kpis.totals.unparseableCyclePhases > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {/*
                       * ⚠ DMS-PROVISIONAL-TERM — «مرحله» (cycle phase)
                       *
                       * Our coinage. Amir has not confirmed it: it was chosen because a search
                       * of his FRD returned nothing for the concept, not because he named it.
                       * Caroline will put it to him alongside the working screen, as an
                       * invitation to correct rather than a question to answer.
                       *
                       * ⛔ IF HE CORRECTS IT, THIS IS A GREP AND NOT AN AUDIT:
                       *     grep -r "DMS-PROVISIONAL-TERM" "app/(dms)"
                       * finds every site. The term itself lives in i18n/dms/fa.json under this
                       * key — change it there; this marker only says where to look.
                      */}
                      {t('unparseableNote', {
                        defaultValue: 'Cycle phases whose times could not be read',
                      })}
                      : {kpis.totals.unparseableCyclePhases}
                    </p>
                  )}
                  {kpis.totals.unparseableRoundTrips > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {/*
                       * ⚠ DMS-PROVISIONAL-TERM — «رفت‌وبرگشت» (round trip)
                       *
                       * Our coinage. Amir has not confirmed it: it was chosen because a search
                       * of his FRD returned nothing for the concept, not because he named it.
                       * Caroline will put it to him alongside the working screen, as an
                       * invitation to correct rather than a question to answer.
                       *
                       * ⛔ IF HE CORRECTS IT, THIS IS A GREP AND NOT AN AUDIT:
                       *     grep -r "DMS-PROVISIONAL-TERM" "app/(dms)"
                       * finds every site. The term itself lives in i18n/dms/fa.json under this
                       * key — change it there; this marker only says where to look.
                      */}
                      {t('unparseableRoundTripNote', {
                        defaultValue:
                          'Cycles whose round trip could not be read, so they are absent from mean cycle time',
                      })}
                      : {kpis.totals.unparseableRoundTrips}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
