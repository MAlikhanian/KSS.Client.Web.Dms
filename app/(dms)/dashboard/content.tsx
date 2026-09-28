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
import { loadAggregate } from './aggregate';
import {
  physicalProgressPercent,
  stoppageMinutesByParty,
  timeShareSlices,
} from './chart-data';
import {
  FinancialProgressGap,
  KpiFigureTile,
  KpiQuantityTile,
  PhysicalProgressPanel,
  StoppageByPartyChart,
  TimeShareChart,
} from './components';
import { SampleDataPageLine } from '../_components/sample-data';

/**
 * The KPI dashboard — the specification's roles section: «مشاهده داشبورد کلان مدیریتی», کنترل پروژه only.
 *
 * ─── WHAT IS HERE AND WHAT IS DELIBERATELY NOT ──────────────────────────────
 * The specification's four intermediate quantities are fully defined by the document and are
 * shown as figures. **All five KPIs now carry values** — three of them closed
 * on 2026-09-08 by the customer's own answer, having previously been rendered
 * as visible gaps. Every one shows the reading it was computed under, because
 * he settled the denominators and not the numerators.
 *
 * The gap tiles are NOT deleted: `KpiGapTile` and `KpiUnavailableTile` remain,
 * and any KPI whose input or definition is missing still renders as itself
 * rather than as a zero.
 *
 * ─── THE SPECIFIED VISUALISATIONS — THREE CHARTS AND ONE NAMED GAP ───────────────────
 * The customer asked for this screen to become graphical and to be the DMS home
 * page. Three of the four specified charts render: time share, stoppages by responsible party,
 * physical progress.
 *
 * ⛔ FINANCIAL PROGRESS IS A NAMED GAP, NOT A MISSING CHART. With the fields the
 * specification defines it is the SAME NUMBER as physical progress —
 * `computeEarnedValue` derives the unit rate as contract ÷ initial volume, so
 * the contract cancels out of the ratio. No data can separate them. See the
 * component's own note; do not "finish" it by drawing a second bar.
 *
 * ⛔ AVAILABILITY AND DOWNTIME MUST NEVER SHARE ONE FIGURE. They use different
 * denominators — 1440 against the sum of times logged — so they do not
 * complement to 100. The time-share chart is safe because its parts genuinely
 * sum to one whole; that is a property of THAT chart, not a licence for others.
 *
 * The four ambiguous KPIs are still excluded: the customer has not resolved what
 * they mean, and a confident chart would assert an interpretation he has not
 * given.
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

  /**
   * The all-projects default. A SEPARATE query, not an inversion of the three
   * below — see the note on `enabled` there.
   */
  const aggregateQuery = useQuery({
    queryKey: ['dms', 'aggregate'],
    queryFn: loadAggregate,
    enabled: ready && !projectId,
    retry: false,
  });

  /**
   * ⛔ `enabled: !!projectId` IS NOT AN OPTIMISATION — IT PREVENTS A THROW.
   *
   * All three readers call `requireProject(projectId)`, and `''` matches no
   * project, so an empty id raises `NotFound 404 "Project '' was not found."`
   * — verified against the store, not inferred. Removing the gate to "just
   * load everything by default" therefore puts THREE error panels on the first
   * screen anyone opens, and they render as the product being broken rather
   * than as a state we chose.
   *
   * The empty-project case is served by `aggregateQuery` above, gated on the
   * complement, so exactly one of the two sets is ever live.
   */
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

  // Shaped once for the specified stoppage chart: bars and the unattributed total
  // come from ONE call, so they cannot disagree about the same rows.
  const partyStoppages = stoppageMinutesByParty({
    reports: approvedQuery.data ?? [],
    stoppages: stoppagesQuery.data ?? [],
  });

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
      <SampleDataPageLine />
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

      {/* ─── DEFAULT STATE: every project, aggregated ─────────────────────── */}
      {!projectId && aggregateQuery.isLoading && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {t('loading', { defaultValue: 'Loading…' })}
          </CardContent>
        </Card>
      )}

      {!projectId && !!aggregateQuery.error && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
          <Card>
            <CardContent className="py-8 space-y-3">
              <h2 className="font-semibold">
                {t('aggregateFailedTitle', {
                  defaultValue: 'The overview could not be loaded',
                })}
              </h2>
              <Button variant="outline" onClick={() => void aggregateQuery.refetch()}>
                {t('retry', { defaultValue: 'Try again' })}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {!projectId && aggregateQuery.isSuccess && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <h2 className="font-medium">
              {t('allProjectsTitle', { defaultValue: 'All projects' })}
            </h2>

            {/*
              ⛔ THE PARTIAL STATE. A total that silently omits a project it
              could not read is a total that excludes without saying so — and on
              an aggregate nobody can see which projects are in it. So the
              disclosure is rendered from the SAME object the figures come from,
              never from a separate count, and it NAMES what was left out.

              ⚠ The two empty-looking cases are not symmetric: a project that
              read successfully and returned nothing is a real zero and is IN
              the denominator; a project that could not be READ is an absence
              and is OUT. Including the second at full volume would assert it
              did no work, which we do not know.
            */}
            {aggregateQuery.data.excluded.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                {t('aggregatePartial', {
                  defaultValue: 'Aggregated from {{included}} of {{total}} projects.',
                  included: aggregateQuery.data.included.length,
                  total:
                    aggregateQuery.data.included.length +
                    aggregateQuery.data.excluded.length,
                })}{' '}
                {aggregateQuery.data.excluded
                  .map((e) => `${e.project.projectCode} (${e.code})`)
                  .join('، ')}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <KpiQuantityTile
                label={t('projectsIncluded', { defaultValue: 'Projects included' })}
                value={String(aggregateQuery.data.included.length)}
              />
              <KpiQuantityTile
                label={t('approvedReports', { defaultValue: 'Approved reports' })}
                value={String(aggregateQuery.data.reports.length)}
              />
              <KpiQuantityTile
                label={t('dredgedVolume', { defaultValue: 'Dredged volume' })}
                value={String(
                  aggregateQuery.data.cycles.reduce(
                    (sum, c) => sum + (c.dredgedVolumeM3 ?? 0),
                    0,
                  ),
                )}
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
          {/*
            ─── THE SPECIFIED VISUALISATIONS ────────────────────────────────────────
            Every input comes from `kpis.totals`, which `computeIntermediateTotals`
            derives from the BRANDED approved reports and narrows the cycles and
            stoppages against itself. Nothing here re-filters — a second copy of
            the approved-only rule would be a convention sitting beside a control,
            and the copy is the half that rots.
          */}
          {/*
            Computed ONCE. Two call sites for the same shaping is two things to
            keep in step, and the one that gets edited is never both.
          */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TimeShareChart
              title={t('chartTimeShare', { defaultValue: 'Time share' })}
              slices={timeShareSlices(kpis.totals)}
              emptyText={t('chartNoTime', { defaultValue: 'No time recorded yet.' })}
              labelFor={(key) =>
                ({
                  Dredging: t('phaseDredging', { defaultValue: 'Dredging' }),
                  Transport: t('phaseTransport', { defaultValue: 'Transport' }),
                  Discharge: t('phaseDischarge', { defaultValue: 'Discharge' }),
                  Return: t('phaseReturn', { defaultValue: 'Return' }),
                  // ⛔ `chart*`, NOT `phase*`. The four phase keys are shared
                  // cycle vocabulary — they render in the cycle FORM and the
                  // cycle TABLE as well as here — and `TimeShareSlice.key` is
                  // typed `CyclePhase | 'Stoppage'`, so stoppage is explicitly
                  // NOT a phase. This label is chart-only and belongs in the
                  // namespace this file already uses for chart-only strings.
                  Stoppage: t('chartTimeShareStoppage', { defaultValue: 'Stoppages' }),
                })[key] ?? key
              }
            />

            <StoppageByPartyChart
              title={t('chartStoppageParty', {
                defaultValue: 'Stoppages by responsible party',
              })}
              bars={partyStoppages.bars}
              emptyText={t('chartNoStoppages', {
                defaultValue: 'No stoppages recorded yet.',
              })}
              unattributedNote={
                partyStoppages.unattributedMinutes > 0
                  ? t('chartUnattributed', {
                      defaultValue:
                        'Some stoppages have no responsible party recorded and are not in any bar.',
                    })
                  : null
              }
              labelFor={(party) =>
                ({
                  Master: t('partyMaster', { defaultValue: 'Master' }),
                  Client: t('partyClient', { defaultValue: 'Client' }),
                  Dredge: t('partyDredge', { defaultValue: 'Dredge' }),
                  Survey: t('partySurvey', { defaultValue: 'Survey' }),
                  // His document supplies BOTH languages for this enum — 'CE' / «ناظر».
                  // The fallback matches his English, not a friendlier expansion.
                  CE: t('partyCe', { defaultValue: 'CE' }),
                })[party] ?? party
              }
            />

            <PhysicalProgressPanel
              title={t('chartPhysicalProgress', {
                defaultValue: 'Physical progress',
              })}
              percent={physicalProgressPercent(
                kpis.totals.dredgedVolumeM3,
                project?.initialDredgingVolumeM3,
              )}
              caption={t('chartPhysicalCaption', {
                defaultValue: 'Dredged volume against the contracted volume.',
              })}
              noDenominatorText={t('chartNoInitialVolume', {
                defaultValue:
                  'This project has no recorded initial dredging volume, so progress cannot be shown.',
              })}
            />

            <FinancialProgressGap
              title={t('chartFinancialProgress', {
                defaultValue: 'Financial progress',
              })}
              body={t('chartFinancialGap', {
                defaultValue:
                  'Financial progress needs a separately recorded work-done amount. The system does not hold one, so this figure would repeat physical progress rather than tell a second story.',
              })}
            />
          </div>

          {/* The specification's defined quantities. */}
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
            CLOSED 2026-09-08 by the customer's own answer. These were gap tiles; they
            are values now, rendered through KpiFigureTile like the others so the
            union is narrowed in one place. Each carries its basis, because the
            customer settled the DENOMINATOR and not the numerator, and because
            the per-category split is our reading of the specification rather than his words.
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
            Earned value — from the customer's answers, the part ruled IN scope.
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
                          'Stoppage time in a category outside the three defined categories',
                      })}
                      : {formatMinutes(kpis.totals.unclassifiedStoppageMinutes)}
                    </p>
                  )}
                  {kpis.totals.unparseableCyclePhases > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {/*
                       * ⚠ DMS-PROVISIONAL-TERM — «مرحله» (cycle phase)
                       *
                       * Our coinage. The customer has not confirmed it: it was chosen because a
                       * search of the specification returned nothing for the concept, not because
                       * the customer named it. It is to be offered to the customer alongside the
                       * working screen, as an invitation to correct rather than a question to answer.
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
                       * Our coinage. The customer has not confirmed it: it was chosen because a
                       * search of the specification returned nothing for the concept, not because
                       * the customer named it. It is to be offered to the customer alongside the
                       * working screen, as an invitation to correct rather than a question to answer.
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
