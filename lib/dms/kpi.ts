/**
 * The KPI engine — the DEFINED half.
 *
 * §4 «منطق محاسبات خودکار و شاخص‌های کلیدی» fully specifies four intermediate
 * quantities and then NAMES five KPIs without defining any of them. So this
 * file implements exactly what the document defines and refuses to invent the
 * rest. See "WHAT IS NOT HERE" at the bottom — the absence is deliberate and
 * is the point.
 *
 * APPROVED-ONLY IS ENFORCED HERE, IN THE READ PATH. The entry point accepts
 * `ApprovedDailyReport[]` and nothing else, so handing it unapproved rows
 * fails `next build` rather than producing a total nobody questions. That is
 * the CashAdvance defect — an invoice total that included rejected rows —
 * made impossible instead of remembered. §3 is explicit that only approved
 * days enter KPI calculation: «کل داده‌های آن روز قفل دائم شده و در محاسبات
 * KPI شرکت داده می‌شوند».
 *
 * The brand covers the reports. It does NOT cover cycles and stoppages, which
 * arrive as separate arrays, so this file filters them down to the approved
 * reports itself rather than trusting the caller to have done it.
 */

import type {
  ApprovedDailyReport,
  CyclePhase,
  DmsCycle,
  DmsProject,
  DmsStoppage,
} from './types';
import { isKnownStoppageCategory, KNOWN_STOPPAGE_CATEGORIES } from './types';

// ─── Units ──────────────────────────────────────────────────────────────────

/** §4: «کل زمان روز (۱۴۴۰ دقیقه)». */
export const MINUTES_PER_DAY = 1440;

/**
 * THE ONLY UNIT CONVERSION IN DMS, AND THE REASON IT IS ISOLATED HERE.
 *
 * ۲-۹ gives stoppage duration «بر حسب ساعت» — DECIMAL HOURS — while §4 does
 * all of its arithmetic in MINUTES. Mixing them produces a dashboard that is
 * wrong by a factor of sixty and looks entirely plausible: no type would
 * complain, no test we have would fail, and every number on the screen would
 * be a number. So the conversion happens once, here, named, and never at a
 * call site.
 */
export function stoppageHoursToMinutes(durationHours: number): number {
  return durationHours * 60;
}

// ─── Clock arithmetic ───────────────────────────────────────────────────────

/**
 * ۲-۸ gives cycle phases as clock times («زمان») with no duration column, so
 * every phase duration is derived. A phase that ends before it starts has
 * crossed midnight — a dredging cycle running 23:40→00:25 is ordinary — so the
 * day is added rather than the result going negative.
 *
 * Returns null for an unparseable time instead of 0, because 0 is a duration
 * and null is not: a malformed row must not silently shorten a total.
 */
export function minutesBetween(start: string, end: string): number | null {
  const from = parseClock(start);
  const to = parseClock(end);
  if (from === null || to === null) return null;
  const delta = to - from;
  return delta < 0 ? delta + MINUTES_PER_DAY : delta;
}

function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** The four phases §4 sums into T_OP, in the order ۲-۸ lists them. */
const PHASE_BOUNDS: ReadonlyArray<{
  phase: CyclePhase;
  start: keyof DmsCycle;
  end: keyof DmsCycle;
}> = [
  { phase: 'Dredging', start: 'dredgingStart', end: 'dredgingEnd' },
  { phase: 'Transport', start: 'transportStart', end: 'transportEnd' },
  { phase: 'Discharge', start: 'dischargeStart', end: 'dischargeEnd' },
  { phase: 'Return', start: 'returnStart', end: 'returnEnd' },
];

// ─── The result ─────────────────────────────────────────────────────────────

export interface DmsIntermediateTotals {
  /**
   * The number of APPROVED REPORTS in the input — a count of reports, not of
   * distinct dates.
   *
   * ⚠ IT WAS CALLED `days` AND THAT NAME WAS WRONG, NOT THE BEHAVIOUR. Amir,
   * msg 194: mean daily volume is «the total sum of all dredged volumes in the
   * daily reports divided by THE NUMBER OF DAILY REPORTS». The implementation
   * always counted reports; the labels around it said "days".
   *
   * (No number is given here on purpose. This rename was first scoped from a
   * remembered list of five and there were more than twice that, so a count
   * written into the explanation would have been wrong within the hour —
   * enumerate by search and verify by search, because the check that finds a
   * partial rename is the same one that would have produced a complete one.)
   *
   * ⛔ DO NOT "FIX" THIS BY COUNTING DISTINCT DATES. That is the tidy-looking
   * change a reader makes when they meet a name/behaviour mismatch, and it
   * would break a correct implementation to satisfy a wrong label.
   *
   * The two coincide TODAY because ۲-۴ makes `project_id` UNIQUE — one project
   * has exactly one vessel, so it cannot have two reports for one date. They
   * would diverge the moment that one-to-one did, and the name is what keeps
   * the arithmetic right if it ever does.
   *
   * ⚠ AND THERE IS A SECOND PATH TO THE SAME DIVERGENCE, ALREADY RAISED.
   * Amir has named two or three shifts per day as a future possibility. Under
   * that, one date yields several reports and `reportCount` stops equalling a
   * count of dates — while remaining exactly the divisor he specified. Two
   * independent routes, so this is not a hypothetical kept alive for tidiness.
   */
  reportCount: number;

  /**
   * T_OP — §4 «مجموع زمان عملیات (T_OP)»: «حاصل‌جمع مدت‌زمان لایروبی، حمل،
   * تخلیه و بازگشت برای تمام چرخه‌های روزانه». Minutes.
   *
   * ⚠ THE LABEL IS RECORDED HERE BECAUSE ITS ABSENCE COST US THREE TERMS.
   * This block used to quote only the DEFINITION — the clause after the colon —
   * and dropped «مجموع زمان عملیات», the name he gives the quantity before it.
   * A reader of this file could then say truthfully that §4 «does not name
   * T_OP, it only defines it», and go on to invent a Persian name for it. We
   * did: «زمان عملیاتی», whose adjective collides with his own «توقف عملیاتی»
   * — a collision HE had avoided by using the noun.
   *
   * ⛔ SO: WHEN QUOTING A DEFINED QUANTITY, QUOTE THE WHOLE LINE. The label
   * before the colon is vocabulary; the clause after it is arithmetic. Taking
   * only the second leaves a glossary that says what things MEAN and not what
   * he CALLS them, which is exactly the half a translator needs.
   *
   * PROVENANCE: the label reached this file through four hops — his message,
   * an extract, a relay, this edit — which is where a ZWNJ dies. It was then
   * compared BYTE-FOR-BYTE against the FRD and is an exact substring of it,
   * spacing included. «دردسترس» is joined because HE joins it; do not
   * normalise it to «در دسترس».
   *
   * The caveat that stood here came off because someone checked, not because
   * anyone gave an assurance.
   */
  operatingMinutes: number;

  /** T_OP broken out by phase — the four series §5's time-share chart plots. */
  phaseMinutes: Readonly<Record<CyclePhase, number>>;

  /**
   * T_PD — §4: «حاصل‌جمع مدت‌زمان توقفاتی که فیلد is_planned آن‌ها برابر True
   * است». Minutes. Read from `is_planned`, which is what §4 names — NOT from
   * the free-text category, which is a different field that can disagree.
   */
  plannedStoppageMinutes: number;

  /** T_UPD — the same with `is_planned` = False. Minutes. */
  unplannedStoppageMinutes: number;

  /**
   * T_AV — §4 «کل زمان دردسترس (T_AV)»: «کل زمان روز (۱۴۴۰ دقیقه) منهای
   * توقفات برنامه‌ریزی‌شده
   * (1440 − T_PD)». Minutes.
   *
   * §4 defines this for ONE day. Aggregating it as `reportCount × 1440 − T_PD`
   * is ours, marked here rather than assumed; `reportCount` is exposed so a
   * caller can get back to the per-report figure.
   *
   * NOT CLAMPED AT ZERO. If planned stoppages exceed the time available, this
   * goes negative — which is a data error, and clamping would hide it behind a
   * number that looks fine.
   */
  availableMinutes: number;

  /**
   * Stoppage minutes per category, for the categories ۲-۹ offers as examples.
   * Present for all three even when zero, so a chart's series do not appear
   * and disappear with the data.
   */
  minutesByKnownCategory: Readonly<Record<string, number>>;

  /**
   * NON-OPTIONAL, DELIBERATELY. ۲-۹'s «دسته‌بندی» is free text and the three
   * values it lists are examples, so a fourth is valid data. Time in an
   * unrecognised category belongs to no bucket and would otherwise vanish from
   * every total that is built from the buckets.
   *
   * It is not thrown — one odd row must not break a dashboard over historical
   * data — but it is not silent either. Because the field is required, every
   * call site has to handle it, so ignoring it is a choice somebody made
   * rather than something nobody noticed. The dashboard renders it when it is
   * non-zero.
   *
   * This is the CashAdvance lesson in its exact form: that defect was a total
   * that quietly excluded rows. We do not exclude them; we count them where
   * they can be seen.
   */
  unclassifiedStoppageMinutes: number;

  /**
   * Rows whose times could not be parsed, so a malformed record is visible as
   * a count rather than as a silently shorter total.
   */
  unparseableCyclePhases: number;

  /**
   * Sum of every cycle's ROUND TRIP — dredging start to arrival back at the
   * dredging site. Distinct from `operatingMinutes` (T_OP): the round trip
   * INCLUDES the idle gaps between phases, T_OP does not.
   */
  roundTripMinutes: number;

  /** Round trips whose two ends could not be parsed. Counted, not dropped. */
  unparseableRoundTrips: number;

  /**
   * Total dredged volume across the approved reports. ۲-۸ «حجم لایروبی‌شده».
   *
   * ⚠ `dredgedVolumeM3` is OPTIONAL on a cycle, so a cycle recorded with no
   * volume contributes nothing here and is not counted anywhere — the same
   * family as `unclassifiedStoppageMinutes`, and currently unmeasured.
   * Recorded, not built.
   */
  dredgedVolumeM3: number;

  /** Cycles counted, across the approved reports. */
  cycleCount: number;
}

// ─── The entry point ────────────────────────────────────────────────────────

/**
 * Compute §4's four intermediate quantities over APPROVED REPORTS only.
 *
 * Takes one object, like every other DMS function, so a `tenantId` can be
 * added without moving a call site.
 */
export function computeIntermediateTotals(input: {
  reports: ApprovedDailyReport[];
  cycles: DmsCycle[];
  stoppages: DmsStoppage[];
}): DmsIntermediateTotals {
  // The brand proves the REPORTS are approved. Cycles and stoppages carry no
  // such proof, so they are filtered here against the approved set rather than
  // trusted — the same rule applied to the children of the thing it protects.
  const approvedReportIds = new Set(input.reports.map((r) => r.id));
  const cycles = input.cycles.filter((c) => approvedReportIds.has(c.reportId));
  const stoppages = input.stoppages.filter((s) =>
    approvedReportIds.has(s.reportId),
  );

  const phaseMinutes: Record<CyclePhase, number> = {
    Dredging: 0,
    Transport: 0,
    Discharge: 0,
    Return: 0,
  };
  let unparseableCyclePhases = 0;
  let roundTripMinutes = 0;
  let unparseableRoundTrips = 0;

  for (const cycle of cycles) {
    for (const bound of PHASE_BOUNDS) {
      const start = cycle[bound.start];
      const end = cycle[bound.end];
      if (typeof start !== 'string' || typeof end !== 'string') {
        unparseableCyclePhases += 1;
        continue;
      }
      const minutes = minutesBetween(start, end);
      if (minutes === null) {
        unparseableCyclePhases += 1;
        continue;
      }
      phaseMinutes[bound.phase] += minutes;
    }

    // The ROUND TRIP — dredging start to arrival back at the dredging site.
    // ۲-۸'s `returnEnd` is «زمان رسیدن به محل لایروبی», which is the arrival
    // Amir's definition names, so this is his phrase mapped to his field.
    const roundTrip = minutesBetween(cycle.dredgingStart, cycle.returnEnd);
    if (roundTrip === null) unparseableRoundTrips += 1;
    else roundTripMinutes += roundTrip;
  }

  const operatingMinutes =
    phaseMinutes.Dredging +
    phaseMinutes.Transport +
    phaseMinutes.Discharge +
    phaseMinutes.Return;

  const minutesByKnownCategory: Record<string, number> = {};
  for (const category of KNOWN_STOPPAGE_CATEGORIES) {
    minutesByKnownCategory[category] = 0;
  }

  let plannedStoppageMinutes = 0;
  let unplannedStoppageMinutes = 0;
  let unclassifiedStoppageMinutes = 0;

  for (const stoppage of stoppages) {
    const minutes = stoppageHoursToMinutes(stoppage.durationHours);

    // §4 names `is_planned` for T_PD / T_UPD. The category is a separate
    // field and is deliberately not consulted here.
    if (stoppage.isPlanned) {
      plannedStoppageMinutes += minutes;
    } else {
      unplannedStoppageMinutes += minutes;
    }

    if (isKnownStoppageCategory(stoppage.category)) {
      minutesByKnownCategory[stoppage.category] += minutes;
    } else {
      unclassifiedStoppageMinutes += minutes;
    }
  }

  // A count of REPORTS, per Amir msg 194 — see `reportCount` in the interface
  // for why this is not a count of distinct dates and must not become one.
  const reportCount = input.reports.length;

  return {
    reportCount,
    operatingMinutes,
    phaseMinutes,
    plannedStoppageMinutes,
    unplannedStoppageMinutes,
    availableMinutes: reportCount * MINUTES_PER_DAY - plannedStoppageMinutes,
    minutesByKnownCategory,
    unclassifiedStoppageMinutes,
    unparseableCyclePhases,
    roundTripMinutes,
    unparseableRoundTrips,
    dredgedVolumeM3: cycles.reduce((sum, c) => sum + (c.dredgedVolumeM3 ?? 0), 0),
    cycleCount: cycles.length,
  };
}

// ─── WHAT IS NOT HERE, AND WHY ──────────────────────────────────────────────
//
// §4 names five KPIs and gives a formula for NONE of them:
//
//   درصد دسترس‌پذیری شناور      availability %
//   درصد توقف فنی               technical downtime %
//   درصد توقف عملیاتی           operational downtime %
//   میانگین زمان هر چرخه        mean cycle time
//   میانگین حجم لایروبی روزانه  mean daily dredged volume
//
// Two questions are open and neither is derivable from the document:
//   Q2 — availability %'s denominator: T_AV, or 1440 × days?
//   Q3 — do technical % and operational % divide by T_AV, or by total
//        stoppage minutes?
// Several readings fit §4's defined quantities and each yields a different
// number that looks equally like data on a dashboard.
//
// THERE ARE DELIBERATELY NO STUB FUNCTIONS. A stub returning 0 is a NUMBER: it
// renders, it charts, it gets screenshotted, and nothing about it says
// "undefined". The signatures below are TYPES ONLY, so a call site that tries
// to use one fails to compile rather than silently rendering a zero.
//
// When Q2 and Q3 are answered, each becomes one function and one constant.
//
// STANDING ORDER, and it covers this whole file, not only the five: no figure
// computed here reaches any UI, screenshot, message or demo until Q2 and Q3
// are settled. T_AV on a screen is as much a figure as availability %.

export type AvailabilityPercentFn = (
  totals: DmsIntermediateTotals,
) => number;

export type TechnicalDowntimePercentFn = (
  totals: DmsIntermediateTotals,
) => number;

export type OperationalDowntimePercentFn = (
  totals: DmsIntermediateTotals,
) => number;

export type MeanCycleTimeFn = (totals: DmsIntermediateTotals) => number;

export type MeanDailyDredgedVolumeFn = (
  totals: DmsIntermediateTotals,
) => number;

// ─── The KPI set — and the three that cannot hold a number ──────────────────
//
// §4 names five KPIs and defines none of them. Two are computable from what the
// operator entered; three are not, and are open questions with the customer.
//
// THE THREE UNDEFINED ONES ARE NOT ZEROS, NOT PLACEHOLDERS AND NOT OMITTED.
// They are visible gaps that say what is missing — which is honest on the
// screen and is also the strongest way to ask, because the person looking at it
// sees exactly which holes exist.
//
// AND THEY ARE STRUCTURALLY INCAPABLE OF SHOWING A NUMBER. `AwaitingDefinition`
// carries no numeric field, and the three fields below are typed as that
// variant ALONE rather than as the union — so assigning a computed value to one
// does not fail review, it fails the build. Same instrument as `vesselCode`
// excluded from `VesselPatch`.
//
// Nothing here computes them, either. Not into a variable, not privately, not
// "for later": a number that exists behind a tile is a number someone tidying
// up will eventually display.

/** A KPI we can define. `basis` states the reading, and belongs ON the tile. */
export interface KpiValue {
  kind: 'value';
  value: number;
  unit: string;
  /**
   * The reading this number was computed under, in plain words.
   *
   * NOT a footnote and NOT a code comment. A number built on an unstated
   * assumption is worse than a gap, because it looks settled — so the
   * assumption is rendered beside the figure where the customer can correct it
   * on sight.
   */
  basis: string;
}

/** A KPI we cannot define. Note the absence of any numeric field. */
export interface AwaitingDefinition {
  kind: 'awaiting-definition';
  /** The open question, phrased so the reader knows what is owed. */
  question: string;
}

/**
 * A KPI that is defined, but whose input this project does not have.
 *
 * DELIBERATELY NOT THE SAME AS `AwaitingDefinition`, and not a zero. Three
 * different facts get conflated if they share a rendering:
 *   - we do not know how to compute it        → awaiting-definition
 *   - we know how, and this project lacks the input → not-applicable
 *   - we computed it and the answer is zero   → value, 0
 * A project with no contract amount and a project worth nothing are different
 * facts. Like the other gap variant, this carries NO numeric field.
 */
export interface KpiNotApplicable {
  kind: 'not-applicable';
  reason: string;
}

export type KpiResult = KpiValue | AwaitingDefinition | KpiNotApplicable;

export interface DmsKpiSet {
  /** §4's four intermediate quantities — all defined, all computed. */
  totals: DmsIntermediateTotals;

  meanCycleTime: KpiResult;
  meanDailyDredgedVolume: KpiResult;

  // CLOSED 2026-09-08 by Amir's own answer (msg 194). These were typed
  // `AwaitingDefinition` ALONE so that filling them could not happen by
  // accident — closing them required changing the type, which is this diff.
  // The gap variant was NOT given a numeric field and was NOT widened
  // speculatively: the three that closed, closed.
  availabilityPercent: KpiResult;
  technicalDowntimePercent: KpiResult;
  operationalDowntimePercent: KpiResult;

  /**
   * Time that was neither operating nor logged as a stoppage, as a share of
   * the day. Derived: 1440 − T_OP − (T_PD + T_UPD) per approved report.
   *
   * ⚠ RENDERED, NOT HIDDEN IN THE DIFFERENCE — AND ATTRIBUTED TO THE DATA.
   * Under the reading we ship, availability % and downtime % do NOT sum to 100,
   * and the gap is real: ۲-۸'s timestamps cover cycle phases, so any time
   * between cycles that nobody logged as a stoppage belongs to neither.
   *
   * A bare "unaccounted 25%" reads as OUR ARITHMETIC NOT ADDING UP, and the
   * first person to see it files a bug against us. It is not our gap — it is
   * time nobody logged. So the label and the basis both name the cause, the
   * same way "no approved reports" names its cause rather than saying "no data".
   * That turns a number that looks like an error into a number that asks the
   * operator a question, which is what it actually is.
   *
   * Same instrument as `unclassifiedStoppageMinutes` and
   * `unparseableCyclePhases`: count what you cannot classify where it can be
   * seen. It also makes the open question self-documenting — this residual IS
   * the answer to "should availability and downtime sum to 100%?"
   */
  unaccountedPercent: KpiResult;

  /** Answer 3. Needs the project for its contract figures. */
  earnedValue: KpiResult;
}

/**
 * Compute what §4 defines, and name what it does not.
 *
 * Approved-only still governs: this takes `ApprovedDailyReport[]` and nothing
 * else, so unapproved days cannot reach a KPI. That is the CashAdvance defect
 * made impossible rather than remembered.
 */
export function computeKpis(input: {
  reports: ApprovedDailyReport[];
  cycles: DmsCycle[];
  stoppages: DmsStoppage[];
  /** ۲-۱ carries the contract figures the earned value is derived from. */
  project: DmsProject;
}): DmsKpiSet {
  const totals = computeIntermediateTotals(input);

  // Amir, msg 194: «Currently, there is only a single 24-hour work shift per
  // day; proceed with this assumption for now, though the day may be divided
  // into two or three shifts in the future.» So the denominator is the whole
  // day, counted once per approved REPORT. TWO OR THREE SHIFTS ARE A STATED
  // FUTURE POSSIBILITY AND ARE NOT BUILT FOR — a shift-count parameter nobody
  // asked for would be a guess with a number attached.
  const dayMinutes = totals.reportCount * MINUTES_PER_DAY;

  return {
    totals,

    // SETTLED BY AMIR, msg 194: «the average of the time interval from the
    // start of each cycle until the vessel returns to the dredging site».
    // That is the ROUND TRIP, and it maps onto ۲-۸'s fields with no inference —
    // `returnEnd` is «زمان رسیدن به محل لایروبی», arrival at the dredging site.
    //
    // We previously took the sum of the four phases and SAID SO ON THE TILE,
    // naming the reading we had rejected. That is why this correction is one
    // line rather than an excavation: the alternative was already written down.
    //
    // ⚠ IT DOES NOT DISTURB THE RESIDUAL, and the reason should not have to be
    // re-derived. T_OP is separately defined by §4 as the sum of the four
    // phases and is unchanged, so `1440 − T_OP − (T_PD + T_UPD)` is untouched
    // and the identity still closes at 100. The intra-cycle idle gaps are now
    // inside the displayed mean cycle time AND inside the residual — two tiles
    // answering different questions, not double counting. Anyone "reconciling"
    // them would be reconciling two figures that are both correct.
    //
    // ⚠ EVERY STORED CYCLE IS COMPLETE BY CONSTRUCTION, so his «completed
    // cycle» constraint needs no filter here — all eight timestamps are
    // non-optional on DmsCycle and the type refuses a partial one. A filter
    // that can never exclude anything is a control that looks present.
    // The consequence, stated rather than discovered: an operator cannot record
    // an IN-PROGRESS cycle, so one running past midnight is enterable only once
    // it has completed.
    meanCycleTime:
      totals.cycleCount > 0
        ? {
            kind: 'value',
            value: totals.roundTripMinutes / totals.cycleCount,
            unit: 'minutes',
            basis:
              'The full round trip — from the start of dredging until the vessel is back at the dredging site — ÷ number of cycles. Includes the idle time between phases.',
          }
        : {
            kind: 'not-applicable',
            reason: 'No approved cycles in this range yet.',
          },

    // "Per day" over which days? Calendar days in the range, or days that were
    // actually approved? Settled by Amir, msg 194: «divided by the number of
    // daily reports». So the divisor is the count of APPROVED REPORTS, which
    // keeps numerator and denominator drawn from the same approved set — and a
    // day nobody reported does not silently depress the average.
    meanDailyDredgedVolume:
      totals.reportCount > 0
        ? {
            kind: 'value',
            value: totals.dredgedVolumeM3 / totals.reportCount,
            unit: 'm³ per report',
            basis:
              'Total dredged volume ÷ number of approved daily reports.',
          }
        : {
            kind: 'not-applicable',
            reason: 'No approved reports in this range yet.',
          },

    // ⚠ THE DENOMINATOR IS HIS; THE NUMERATOR IS OURS. THREE READINGS EXIST.
    //
    // He settled the divisor — «divided by the total defined shifts per day
    // (which is currently based on 24 hours)» — and named the dividend only as
    // «the average working time during the day», which is not a term §4
    // defines. Three quantities could fill it:
    //
    //   (a) T_OP = dredge + transport + discharge + return   ← what we ship
    //   (b) 1440 − (T_PD + T_UPD) = not-stopped time         (derivable, unnamed)
    //   (c) T_AV = 1440 − T_PD                               (§4-defined)
    //
    // (b) has real evidence behind it: he gave availability and downtime in the
    // same breath over the same denominator, and under (b) they sum to exactly
    // 100%. Under (a) they do not.
    //
    // WE SHIP (a), AND THE REASON RECORDED HERE IS THE ONE THAT DOES NOT
    // EXPIRE: (a) FAILS VISIBLY AND (b) FAILS SILENTLY. If (a) is wrong the
    // numbers do not sum and somebody asks why; if (b) were wrong it would show
    // a tidy 100% and nobody would ever look. Shipping an unconfirmed reading,
    // take the one whose error announces itself.
    //
    // Two other reasons were given for this choice and are deliberately NOT the
    // ones written here: "it is the quantity §4 defines" stops mattering the
    // moment the customer defines it, and "it is needed tomorrow" is gone by
    // tomorrow. A justification with an expiry attached to a decision without
    // one is its own defect — the next reader finds a live ruling supported by
    // a dead argument, and either follows it for the wrong reason or reverses
    // it because the reason is gone.
    //
    // The residual below makes that visible rather than leaving it implied, and
    // the question to the customer is now "should these sum to 100%?" — which
    // he can answer in one word without knowing anything about our internals.
    availabilityPercent: percentOfDay(totals.operatingMinutes, dayMinutes, {
      basis:
        'Operating time — dredging, transport, discharge and return — ÷ 1440 minutes per approved report (one 24-hour day each).',
    }),

    // ⚠ SPLIT BY CATEGORY ON OUR READING, NOT HIS INSTRUCTION.
    //
    // Amir wrote ONE «total downtime divided by 24 hours». §4 names درصد توقف
    // فنی and درصد توقف عملیاتی as TWO separate KPIs and he did not retract
    // that, so we show two. This is Christina's ruling, and it is safe in the
    // direction it fails: if the reading is wrong he sees two tiles where he
    // expected one, which is additive and visible, rather than one figure
    // silently merging two he wanted apart.
    //
    // ⚠ AND THESE DO NOT SUM TO HIS TOTAL, BY CONSTRUCTION. ۲-۹ carries two
    // classification fields that can disagree: T_PD/T_UPD come from
    // `is_planned`, which is what §4 names, while these come from the free-text
    // `category`. Time in an unrecognised category is in neither. The tiles say
    // so rather than leaving a reader to discover that three percentages do not
    // add up.
    technicalDowntimePercent: percentOfDay(
      totals.minutesByKnownCategory.Technical ?? 0,
      dayMinutes,
      {
        basis:
          'Stoppage minutes in the Technical category ÷ 1440 minutes per approved report (one 24-hour day each). Category-based, so technical and operational downtime do not add up to total downtime.',
      },
    ),
    operationalDowntimePercent: percentOfDay(
      totals.minutesByKnownCategory.Operational ?? 0,
      dayMinutes,
      {
        basis:
          'Stoppage minutes in the Operational CATEGORY ÷ 1440 minutes per approved report (one 24-hour day each). Category-based, like technical downtime — see that tile for why these do not sum to total downtime.',
      },
    ),

    // Plain and derived — no new store call, no new field. NOT clamped at
    // zero: if logged time exceeds the day this goes negative, which is a data
    // error and belongs on screen rather than hidden behind a floor.
    unaccountedPercent: percentOfDay(
      dayMinutes -
        totals.operatingMinutes -
        (totals.plannedStoppageMinutes + totals.unplannedStoppageMinutes),
      dayMinutes,
      {
        basis:
          'Time in the day recorded neither as an operating phase nor as a stoppage. This is a gap in what was logged, not a discrepancy in the calculation.',
      },
    ),

    earnedValue: computeEarnedValue(input.project, totals.dredgedVolumeM3),
  };
}

/** A share of the available day, or a gap when there is no day to divide by. */
function percentOfDay(
  minutes: number,
  dayMinutes: number,
  opts: { basis: string },
): KpiResult {
  if (dayMinutes <= 0) {
    return {
      kind: 'not-applicable',
      reason:
        'No approved reports in this range, so there is nothing to divide by.',
    };
  }
  return {
    kind: 'value',
    value: (minutes / dayMinutes) * 100,
    unit: '%',
    basis: opts.basis,
  };
}

/**
 * Earned value — Amir, msg 194 answer 3: «Dividing the total contract amount by
 * the total specified dredging volume yields a rate considered as the unit
 * value per cubic meter … multiplying this unit rate by the dredged volume
 * reported in daily logs allows calculating the value of work completed».
 *
 * ⚠ BOTH OPERANDS ARE THE *INITIAL* FIGURES, AND THAT IS A RULING WITH A
 * REASON. `approvedContractAmount ÷ initialDredgingVolumeM3` would divide an
 * AMENDED numerator by an UNAMENDED denominator, inflating the rate by exactly
 * the contract increase — and only on projects that have been amended, which is
 * precisely when someone looks. A subset must be divided by its own set. ۲-۱
 * has no amended-volume column, so if he means the amended amount the matching
 * volume does not exist in his own document: that is a gap in the spec, raised
 * with Customer Support, not a choice for us.
 *
 * NO NEW FIELD WAS ADDED. Both operands are already ۲-۱ columns.
 */
function computeEarnedValue(
  project: DmsProject,
  dredgedVolumeM3: number,
): KpiResult {
  // ۲-۱ «مبلغ اولیه قرارداد» is OPTIONAL. A project without one has no unit
  // rate — which is not zero, and not NaN. A project with no contract amount
  // and a project worth nothing are different facts.
  if (project.initialContractAmount === undefined) {
    return {
      kind: 'not-applicable',
      reason:
        'This project has no initial contract amount recorded, so there is no unit rate to apply. Add it on the project’s contract detail.',
    };
  }
  if (project.initialDredgingVolumeM3 <= 0) {
    return {
      kind: 'not-applicable',
      reason:
        'This project’s initial dredging volume is zero, so a unit rate cannot be derived from it.',
    };
  }

  const unitRatePerM3 =
    project.initialContractAmount / project.initialDredgingVolumeM3;

  return {
    kind: 'value',
    value: unitRatePerM3 * dredgedVolumeM3,
    unit: '',
    basis:
      'Initial contract amount ÷ initial dredging volume = unit rate per m³, × the volume dredged on APPROVED REPORTS. Both operands are the initial figures deliberately: mixing an amended amount with an unamended volume would inflate the rate by exactly the contract increase.',
  };
}
