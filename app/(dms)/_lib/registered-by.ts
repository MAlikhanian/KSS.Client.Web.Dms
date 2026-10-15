import type { DmsDailyOperationReport } from '@/lib/dms/types';

/**
 * What the report shows for whoever registered it: the name the service sends,
 * or `unknownText` when it sends none. `registeredBy` is a person id and is
 * never shown, not even as a last resort.
 */
export function registeredByShown(
  report: Pick<DmsDailyOperationReport, 'registeredBy' | 'registeredByName'>,
  unknownText: string,
): string {
  const name: unknown = report.registeredByName;
  const trimmed = typeof name === 'string' ? name.trim() : '';
  return trimmed.length > 0 ? trimmed : unknownText;
}
