import type {
  ApprovedDailyReport,
  CyclePhase,
  DmsStoppage,
  DmsStoppageType,
} from '@/lib/dms/types';
import { ALL_CYCLE_PHASES } from '@/lib/dms/types';
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
export interface CauseBar {
  /** The stoppage code — the join key between a row and the type lookup. */
  code: string;
  /** The type's name, or null when the code matches no row of the lookup. */
  name: string | null;
  minutes: number;
}

/**
 * Stoppage minutes by CAUSE — the stoppage type, not the responsible party.
 * The customer asked for the analysis to be by the causes of the stoppages
 * rather than by who was responsible for them.
 *
 * ⚠ EVERY TYPE IN THE LOOKUP IS RETURNED, INCLUDING ZEROS, in lookup order. A
 * chart built only from causes present in the data changes its own axis between
 * renders, and nothing says a cause is missing rather than empty. The zero IS
 * the information.
 *
 * ⚠ A ROW WHOSE CODE MATCHES NO TYPE STILL GETS A BAR, keyed by its raw code with
 * `name: null`, after the lookup's bars. The row stores the code as a string, not
 * a reference, so a code can outlive or predate its lookup row. Dropping those
 * minutes would make the bars sum to less than the stoppage total with nothing
 * saying why — the defect this whole screen is built against.
 */
export function stoppageMinutesByCause(input: {
  reports: ApprovedDailyReport[];
  stoppages: DmsStoppage[];
  types: DmsStoppageType[];
}): { bars: CauseBar[]; unknownCodeMinutes: number } {
  // Mirrors the filter in `computeIntermediateTotals`: the brand proves the
  // REPORTS are approved; the stoppages carry no such proof, so they are
  // narrowed here rather than trusted.
  const approved = new Set(input.reports.map((r) => r.id));
  const rows = input.stoppages.filter((s) => approved.has(s.reportId));

  const minutesByCode = new Map<string, number>();
  for (const s of rows) {
    minutesByCode.set(
      s.stoppageCode,
      (minutesByCode.get(s.stoppageCode) ?? 0) + stoppageHoursToMinutes(s.durationHours),
    );
  }

  const known = new Set(input.types.map((type) => type.code));
  const bars: CauseBar[] = input.types.map((type) => ({
    code: type.code,
    name: type.name,
    minutes: minutesByCode.get(type.code) ?? 0,
  }));

  let unknownCodeMinutes = 0;
  for (const [code, minutes] of Array.from(minutesByCode)) {
    if (known.has(code)) continue;
    bars.push({ code, name: null, minutes });
    unknownCodeMinutes += minutes;
  }

  return { bars, unknownCodeMinutes };
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
