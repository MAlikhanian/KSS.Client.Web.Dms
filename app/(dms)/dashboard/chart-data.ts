import type { CyclePhase } from '@/lib/dms/types';

/**
 * The shapes the §5 charts draw. The figures themselves are computed by the DMS
 * service from APPROVED reports only (GET dashboard) and arrive in exactly
 * these shapes; nothing in the browser re-derives them.
 */

/** One slice of «نمودار سهم زمانی». Its parts sum to one whole, which is what makes a pie honest here. */
export interface TimeShareSlice {
  key: CyclePhase | 'Stoppage';
  minutes: number;
}

/**
 * One bar of «نمودار ستونی تحلیل توقفات» — stoppage minutes by cause (stoppage
 * type). Every type of the lookup has a bar, zeros included; a code that is in
 * no type still gets a bar under its raw code, with `name: null`.
 */
export interface CauseBar {
  code: string;
  name: string | null;
  minutes: number;
}
