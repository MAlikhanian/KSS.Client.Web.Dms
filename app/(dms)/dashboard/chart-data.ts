import type {
  ApprovedDailyReport,
  CyclePhase,
  DmsStoppage,
  ResponsibleParty,
} from '@/lib/dms/types';
import { ALL_CYCLE_PHASES, ALL_RESPONSIBLE_PARTIES } from '@/lib/dms/types';
import type { DmsIntermediateTotals } from '@/lib/dms/kpi';
import { stoppageHoursToMinutes } from '@/lib/dms/kpi';

/**
 * Shaping for §5's visualisations. Pure functions, no React, no store — so the
 * arithmetic can be asserted without a browser and the components stay thin.
 *
 * ⛔ EVERY FUNCTION HERE TAKES `ApprovedDailyReport[]` OR TOTALS DERIVED FROM
 * THEM. The brand is the control: only `listApprovedReports` produces that
 * type, and `x as ApprovedDailyReport` is banned by the zone's eslint config
 * outside the store. A chart built from all reports would include Rejected days
 * and look exactly like one that does not — which is the CashAdvance defect in
 * a form nobody can see.
 */

/** One slice of «نمودار سهم زمانی». */
export interface TimeShareSlice {
  key: CyclePhase | 'Stoppage';
  minutes: number;
}

/**
 * Time share — the four ۲-۸ cycle phases plus stoppages.
 *
 * ✅ THIS CHART IS SAFE TO DRAW AS PARTS OF ONE WHOLE, and it is the ONLY one
 * on this screen that is. Its parts are the components of the customer's own
 * downtime denominator — the sum of all times logged in the daily report — so
 * they genuinely sum to it.
 *
 * ⛔ DO NOT EXTEND THIS PATTERN TO AVAILABILITY AND DOWNTIME. Those use
 * DIFFERENT denominators — availability over 1440, downtime over the logged
 * sum — so they do not complement to 100, and no donut, stacked bar or
 * percentage axis may place them in one figure. That would assert a
 * relationship the customer has never stated.
 */
export function timeShareSlices(totals: DmsIntermediateTotals): TimeShareSlice[] {
  const slices: TimeShareSlice[] = ALL_CYCLE_PHASES.map((phase) => ({
    key: phase,
    minutes: totals.phaseMinutes[phase],
  }));
  slices.push({
    key: 'Stoppage',
    minutes: totals.plannedStoppageMinutes + totals.unplannedStoppageMinutes,
  });
  return slices;
}

/** One bar of «نمودار ستونی تحلیل توقفات». */
export interface PartyBar {
  party: ResponsibleParty;
  minutes: number;
}

/**
 * Stoppage minutes by responsible party.
 *
 * ⚠ ALL FIVE PARTIES ARE ALWAYS RETURNED, INCLUDING ZEROS. A bar chart built
 * only from parties present in the data silently changes its own axis: five
 * categories one day, two the next, and nothing says a category is missing
 * rather than empty. The zero IS the information.
 *
 * ⚠ `responsibleParty` is OPTIONAL on the source row. Stoppages without one are
 * counted in `unattributedMinutes` rather than dropped — a total that quietly
 * omits rows is the defect this whole screen is built against.
 */
export function stoppageMinutesByParty(input: {
  reports: ApprovedDailyReport[];
  stoppages: DmsStoppage[];
}): { bars: PartyBar[]; unattributedMinutes: number } {
  // Mirrors the filter in `computeIntermediateTotals`: the brand proves the
  // REPORTS are approved; the stoppages carry no such proof, so they are
  // narrowed here rather than trusted.
  const approved = new Set(input.reports.map((r) => r.id));
  const rows = input.stoppages.filter((s) => approved.has(s.reportId));

  const bars = ALL_RESPONSIBLE_PARTIES.map((party) => ({
    party,
    minutes: rows
      .filter((s) => s.responsibleParty === party)
      .reduce((sum, s) => sum + stoppageHoursToMinutes(s.durationHours), 0),
  }));

  const unattributedMinutes = rows
    .filter((s) => s.responsibleParty === undefined)
    .reduce((sum, s) => sum + stoppageHoursToMinutes(s.durationHours), 0);

  return { bars, unattributedMinutes };
}

/**
 * Physical progress — dredged volume over the initial contracted volume.
 *
 * Returns null rather than 0 when there is no denominator: a project with no
 * initial volume has no progress, which is not the same as no progress made.
 */
export function physicalProgressPercent(
  dredgedM3: number,
  initialVolumeM3: number | undefined,
): number | null {
  if (!initialVolumeM3 || initialVolumeM3 <= 0) return null;
  return (dredgedM3 / initialVolumeM3) * 100;
}
