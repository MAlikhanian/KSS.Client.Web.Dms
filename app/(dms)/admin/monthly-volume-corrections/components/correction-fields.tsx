'use client';

import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { gregorianToJalali } from '@/lib/jalali';
import { listSubprojects } from '@/lib/dms/store';
import { toPersianDigits } from '../../../_lib/digits';
import { todayIsoInTehran } from '../../../_lib/jalali-date';
import {
  classifyCorrectionError,
  WHOLE_PROJECT,
  type CorrectionDraft,
  type DraftProblems,
} from './correction-draft';

export { draftProblems, WHOLE_PROJECT, type CorrectionDraft } from './correction-draft';

/** The current Jalali year and month in Tehran, as the form's starting point. */
export function currentJalaliMonth(): { year: number; month: number } {
  const [gy, gm, gd] = todayIsoInTehran().split('-').map(Number);
  const [jy, jm] = gregorianToJalali(gy, gm, gd);
  return { year: jy, month: jm };
}

/** The twelve Jalali month names, index 0 = month 1. Literal keys, one per month. */
export function useJalaliMonthNames(): string[] {
  const { t } = useTranslation('dms');
  return [
    t('jalaliMonth1', { defaultValue: 'Farvardin' }),
    t('jalaliMonth2', { defaultValue: 'Ordibehesht' }),
    t('jalaliMonth3', { defaultValue: 'Khordad' }),
    t('jalaliMonth4', { defaultValue: 'Tir' }),
    t('jalaliMonth5', { defaultValue: 'Mordad' }),
    t('jalaliMonth6', { defaultValue: 'Shahrivar' }),
    t('jalaliMonth7', { defaultValue: 'Mehr' }),
    t('jalaliMonth8', { defaultValue: 'Aban' }),
    t('jalaliMonth9', { defaultValue: 'Azar' }),
    t('jalaliMonth10', { defaultValue: 'Dey' }),
    t('jalaliMonth11', { defaultValue: 'Bahman' }),
    t('jalaliMonth12', { defaultValue: 'Esfand' }),
  ];
}

/** «مهر ۱۴۰۵» — month name then year, in the UI's digits. */
export function useFormatJalaliMonth(): (year: number, month: number) => string {
  const { i18n } = useTranslation('dms');
  const names = useJalaliMonthNames();
  const persian = (i18n?.language ?? 'fa').startsWith('fa');
  return (year, month) => {
    const name = names[month - 1] ?? String(month);
    return `${name} ${persian ? toPersianDigits(String(year)) : year}`;
  };
}

/**
 * The service's refusal, in words a person can act on. The two refusals this
 * screen expects get their own sentence; anything else shows the service's
 * code so it is never hidden.
 */
export function useCorrectionErrorText(): (error: unknown) => string {
  const { t } = useTranslation('dms');
  return (error) => {
    const c = classifyCorrectionError(error);
    switch (c.kind) {
      case 'duplicate-month':
        return t('correctionDuplicateMonth', {
          defaultValue:
            'There is already a corrected figure for that month (for the same subproject, or for the whole project). Edit that row instead.',
        });
      case 'invalid':
        return `${t('correctionInvalid', { defaultValue: 'Some values were refused:' })} ${c.fields}`;
      case 'service':
        return c.text;
      default:
        return t('correctionSaveFailed', { defaultValue: 'The correction could not be saved.' });
    }
  };
}

/** The editable fields, shared by the create and edit screens. */
export function CorrectionFields({
  projectId,
  draft,
  onChange,
  problems,
}: {
  projectId: string;
  draft: CorrectionDraft;
  onChange: (next: CorrectionDraft) => void;
  problems: DraftProblems;
}) {
  const { t } = useTranslation('dms');
  const monthNames = useJalaliMonthNames();
  const subprojectsQuery = useQuery({
    queryKey: ['dms', 'subprojects', projectId, ''],
    queryFn: () => listSubprojects({ projectId }),
    enabled: !!projectId,
    retry: false,
  });
  const set = (patch: Partial<CorrectionDraft>) => onChange({ ...draft, ...patch });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="mvc-subproject">{t('subproject', { defaultValue: 'Subproject' })}</Label>
        <Select value={draft.subprojectId} onValueChange={(v) => set({ subprojectId: v })}>
          <SelectTrigger id="mvc-subproject" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={WHOLE_PROJECT}>
              {t('correctionWholeProject', { defaultValue: 'The whole project' })}
            </SelectItem>
            {(subprojectsQuery.data ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.subprojectCode} — {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {t('correctionSubprojectHint', {
            defaultValue:
              'The comparison with the reported volume uses whole-project figures only. A per-subproject figure is kept but not compared.',
          })}
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="mvc-year">{t('jalaliYear', { defaultValue: 'Year' })}</Label>
        <Input
          id="mvc-year"
          inputMode="numeric"
          value={draft.jalaliYear}
          onChange={(e) => set({ jalaliYear: e.target.value })}
          aria-invalid={problems.year ? true : undefined}
        />
        {problems.year && (
          <p className="text-xs text-destructive">
            {t('correctionYearInvalid', { defaultValue: 'A Jalali year between 1300 and 1500.' })}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="mvc-month">{t('jalaliMonth', { defaultValue: 'Month' })}</Label>
        <Select value={draft.jalaliMonth} onValueChange={(v) => set({ jalaliMonth: v })}>
          <SelectTrigger id="mvc-month" className="w-full" aria-invalid={problems.month ? true : undefined}>
            <SelectValue placeholder={t('selectMonth', { defaultValue: 'Select a month…' })} />
          </SelectTrigger>
          <SelectContent>
            {monthNames.map((name, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="mvc-volume">
          {t('correctedCumulativeVolume', {
            defaultValue: 'Corrected cumulative volume at the end of the month (m³)',
          })}
        </Label>
        <Input
          id="mvc-volume"
          inputMode="decimal"
          value={draft.volume}
          onChange={(e) => set({ volume: e.target.value })}
          aria-invalid={problems.volume ? true : undefined}
        />
        {problems.volume && (
          <p className="text-xs text-destructive">
            {t('correctionVolumeInvalid', { defaultValue: 'Enter a volume of zero or more.' })}
          </p>
        )}
      </div>

      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="mvc-notes">{t('notes', { defaultValue: 'Notes' })}</Label>
        <Textarea id="mvc-notes" value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>

      {subprojectsQuery.isError && (
        <p className="text-sm text-destructive sm:col-span-2">
          {t('subprojectsLoadFailed', { defaultValue: 'Subprojects could not be loaded.' })}
        </p>
      )}
    </div>
  );
}
