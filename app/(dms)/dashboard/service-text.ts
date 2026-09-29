import { useTranslation } from '@/hooks/useTranslation';
import type { DmsKpiResult } from '@/lib/dms/types';
import type { KpiResult } from '@/lib/dms/kpi';

type T = (key: string, opts: { defaultValue: string }) => string;

/**
 * The service states each KPI's reading (`basis`), each gap (`reason`) and each
 * unit as ENGLISH text. This screen is read in Persian, so each known text is
 * translated here, in one place.
 *
 * ⛔ AN UNKNOWN TEXT IS SHOWN AS IT ARRIVES, NEVER HIDDEN. A new basis the table
 * does not know yet still states the reading its figure was computed under —
 * in English — rather than disappearing and leaving a number with no stated
 * assumption.
 *
 * BY CODE FIRST. The service sends a stable code beside each text (basisCode,
 * reasonCode; KpiTexts.cs), and a code never changes meaning. CODE_TEXT maps each
 * code this screen renders to the service's English for it, and that English is
 * translated below. A response WITHOUT codes (an older service image) is matched
 * by its exact English instead, so both images read in Persian.
 *
 * tools/dms-checks compares CODE_TEXT against the service's KpiTexts.cs and fails
 * when a code's English has changed. ONE LITERAL t() CALL PER TEXT, so every key
 * is visible to the i18n check.
 */
const CODE_TEXT: Readonly<Record<string, string>> = {
  AVAILABILITY_BASIS:
    'Cycle time / (cycle time + technical stoppage time + operational stoppage time), over approved reports. Cycle time runs from the start of dredging to the return to the dredging site. Planned and unclassified stoppage time is not in this figure; it is shown separately.',
  TECHNICAL_STOPPAGE_BASIS:
    'Technical stoppage time / (cycle time + technical stoppage time + operational stoppage time), over approved reports.',
  OPERATIONAL_STOPPAGE_BASIS:
    'Operational stoppage time / (cycle time + technical stoppage time + operational stoppage time), over approved reports.',
  STOPPAGE_OUTSIDE_AVAILABILITY_BASIS:
    'Stoppage time in the planned category or in a category that is none of technical, operational or planned. It is not part of the availability denominator.',
  MEAN_CYCLE_TIME_BASIS:
    'Mean time per completed cycle, from the start of dredging to the return to the dredging site, over approved reports.',
  MEAN_DAILY_VOLUME_BASIS: 'Total dredged volume on approved reports / number of approved reports.',
  PROGRESS_AMENDED_BASIS: 'Dredged volume on approved reports / the amended dredging volume.',
  PROGRESS_INITIAL_BASIS: 'Dredged volume on approved reports / the initial dredging volume (no amended volume is recorded).',
  PROGRESS_MIXED_BASIS:
    "Dredged volume on approved reports / the sum of each project's volume basis (the amended volume where recorded, otherwise the initial).",
  NO_CYCLE_OR_STOPPAGE_TIME: 'No cycle time or technical or operational stoppage time on approved reports in this selection.',
  NO_APPROVED_REPORTS: 'No approved reports in this selection.',
  NO_APPROVED_CYCLES: 'No approved cycles in this selection.',
  PROGRESS_NOT_FOR_VESSEL: 'Physical progress is a project figure; it is not computed for a single vessel.',
  NO_PROJECTS: 'There are no projects in this selection.',
  NO_VOLUME_BASIS_FOR_PROGRESS:
    'No dredging volume (initial or amended) is recorded for the project, so progress cannot be computed.',
};

/** The text for a code, else the text as sent. */
function source(code: string | undefined, text: string): string {
  return (code && CODE_TEXT[code]) || text;
}
function translate(t: T, text: string): string {
  switch (text) {
    // ─── basis ───
    case 'Cycle time / (cycle time + technical stoppage time + operational stoppage time), over approved reports. Cycle time runs from the start of dredging to the return to the dredging site. Planned and unclassified stoppage time is not in this figure; it is shown separately.':
      return t('kpiBasisAvailability', { defaultValue: 'Cycle time / (cycle time + technical stoppage time + operational stoppage time), over approved reports. Cycle time runs from the start of dredging to the return to the dredging site. Planned and unclassified stoppage time is not in this figure; it is shown separately.' });
    case 'Technical stoppage time / (cycle time + technical stoppage time + operational stoppage time), over approved reports.':
      return t('kpiBasisTechnical', { defaultValue: 'Technical stoppage time / (cycle time + technical stoppage time + operational stoppage time), over approved reports.' });
    case 'Operational stoppage time / (cycle time + technical stoppage time + operational stoppage time), over approved reports.':
      return t('kpiBasisOperational', { defaultValue: 'Operational stoppage time / (cycle time + technical stoppage time + operational stoppage time), over approved reports.' });
    case 'Stoppage time in the planned category or in a category that is none of technical, operational or planned. It is not part of the availability denominator.':
      return t('kpiBasisOutside', { defaultValue: 'Stoppage time in the planned category or in a category that is none of technical, operational or planned. It is not part of the availability denominator.' });
    case 'Mean time per completed cycle, from the start of dredging to the return to the dredging site, over approved reports.':
      return t('kpiBasisMeanCycle', { defaultValue: 'Mean time per completed cycle, from the start of dredging to the return to the dredging site, over approved reports.' });
    case 'Total dredged volume on approved reports / number of approved reports.':
      return t('kpiBasisMeanVolume', { defaultValue: 'Total dredged volume on approved reports / number of approved reports.' });
    case 'Dredged volume on approved reports / the amended dredging volume.':
      return t('kpiBasisProgressAmended', { defaultValue: 'Dredged volume on approved reports / the amended dredging volume.' });
    case 'Dredged volume on approved reports / the initial dredging volume (no amended volume is recorded).':
      return t('kpiBasisProgressInitial', { defaultValue: 'Dredged volume on approved reports / the initial dredging volume (no amended volume is recorded).' });
    case "Dredged volume on approved reports / the sum of each project's volume basis (the amended volume where recorded, otherwise the initial).":
      return t('kpiBasisProgressMixed', { defaultValue: "Dredged volume on approved reports / the sum of each project's volume basis (the amended volume where recorded, otherwise the initial)." });
    // ─── reasons a figure is not stated ───
    case 'No cycle time or technical or operational stoppage time on approved reports in this selection.':
      return t('kpiReasonNoTime', { defaultValue: 'No cycle time or technical or operational stoppage time on approved reports in this selection.' });
    case 'No approved reports in this selection.':
      return t('kpiReasonNoReports', { defaultValue: 'No approved reports in this selection.' });
    case 'No approved cycles in this selection.':
      return t('kpiReasonNoCycles', { defaultValue: 'No approved cycles in this selection.' });
    case 'Physical progress is a project figure; it is not computed for a single vessel.':
      return t('kpiReasonProgressVessel', { defaultValue: 'Physical progress is a project figure; it is not computed for a single vessel.' });
    case 'There are no projects in this selection.':
      return t('kpiReasonNoProjects', { defaultValue: 'There are no projects in this selection.' });
    case 'No dredging volume (initial or amended) is recorded for the project, so progress cannot be computed.':
      return t('kpiReasonNoVolume', { defaultValue: 'No dredging volume (initial or amended) is recorded for the project, so progress cannot be computed.' });
    // ─── units ───
    case 'minutes':
      return t('kpiUnitMinutes', { defaultValue: 'minutes' });
    case 'm3 per report':
      return t('kpiUnitM3PerReport', { defaultValue: 'm3 per report' });
    default:
      return text;
  }
}

/**
 * The localiser for service KPIs, bound to the `dms` namespace HERE — so a
 * caller cannot hand it a `t` from some other namespace.
 */
export function useLocaliseKpi(): (result: DmsKpiResult) => KpiResult {
  const { t } = useTranslation('dms');
  return (result) => localiseKpi(t, result);
}

/** A service KPI, with its texts in the reader's language, in the shape the tiles take. */
function localiseKpi(t: T, result: DmsKpiResult): KpiResult {
  if (result.kind === 'value') {
    return {
      kind: 'value',
      value: result.value,
      unit: translate(t, result.unit),
      basis: translate(t, source(result.basisCode, result.basis)),
    };
  }
  return { kind: 'not-applicable', reason: translate(t, source(result.reasonCode, result.reason)) };
}
