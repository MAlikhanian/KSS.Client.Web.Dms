'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { DmsDateInput } from './dms-date-input';

/** A from/to range over report dates. Either end may be empty: that end is open. */
export interface ReportDateRangeValue {
  from: string;
  to: string;
}

/**
 * The time filter on a daily-report list, entered in the Persian calendar like
 * every other date. Values are the store's Gregorian `YYYY-MM-DD`, passed as-is
 * to `listReports({ from, to })` — the same two parameters the list endpoint
 * takes, so the filter survives the move off the mock unchanged.
 *
 * Both ends are INCLUSIVE, as `listReports` applies them.
 *
 * ⚠ A range whose start is after its end is not corrected or swapped: it matches
 * nothing, and the screen says so. Silently swapping would show days the user
 * did not ask for; silently returning nothing would read as "no reports".
 */
export function ReportDateRange({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: ReportDateRangeValue;
  onChange: (value: ReportDateRangeValue) => void;
}) {
  const { t } = useTranslation('dms');
  const inverted = value.from !== '' && value.to !== '' && value.from > value.to;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium block" htmlFor={`${idPrefix}-from`}>
            {t('rangeFrom', { defaultValue: 'From' })}
          </label>
          <DmsDateInput
            id={`${idPrefix}-from`}
            value={value.from}
            onChange={(from) => onChange({ ...value, from })}
            clearable
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium block" htmlFor={`${idPrefix}-to`}>
            {t('rangeTo', { defaultValue: 'To' })}
          </label>
          <DmsDateInput
            id={`${idPrefix}-to`}
            value={value.to}
            onChange={(to) => onChange({ ...value, to })}
            clearable
          />
        </div>
      </div>
      {inverted && (
        <p className="text-xs text-amber-600 dark:text-amber-500">
          {t('rangeInverted', {
            defaultValue: 'The start date is after the end date, so no day falls in this range.',
          })}
        </p>
      )}
    </div>
  );
}
