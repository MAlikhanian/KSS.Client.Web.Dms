'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { DmsDateInput } from './dms-date-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { listStoppageTypes } from '@/lib/dms/store';
import { ALL_RESPONSIBLE_PARTIES } from '@/lib/dms/types';
import type { DmsStoppage, ResponsibleParty } from '@/lib/dms/types';
import { PERSIAN_DECIMAL_MARK, toEnglishDigits, toPersianDigits } from '../_lib/digits';
import { readDurationHours } from '../_lib/duration-hours';
import { readEntryTime } from '../_lib/entry-time';

export type StoppageDraft = Omit<DmsStoppage, 'id' | 'reportId'>;

/**
 * Enter or correct one stoppage.
 *
 * ─── THE TYPE SELECT IS AMIR'S ANSWER 5 & 6 ─────────────────────────────────
 * «When users log downtimes in the daily reports, they should only be able to
 * select from the predefined options in this table.» So the code and category
 * are not typed here — they come from the lookup, which is the point of having
 * built it.
 *
 * ⚠ SELECTING A TYPE PREFILLS `isPlanned`; IT DOES NOT BIND IT. §4 computes
 * T_PD from the STOPPAGE ROW's flag, not the lookup's, so the checkbox stays
 * editable and the row keeps whatever it ends up with. The note beside it says
 * so, because a prefill that looks like a derived value is how the two quietly
 * become one.
 */
export function StoppageForm({
  initial,
  reportDate,
  onCancel,
  onSubmit,
  isSaving,
  errorText,
}: {
  initial?: DmsStoppage;
  reportDate: string;
  onCancel: () => void;
  onSubmit: (draft: StoppageDraft) => void;
  isSaving: boolean;
  errorText?: string;
}) {
  const { t, i18n } = useTranslation('dms');

  const typesQuery = useQuery({
    queryKey: ['dms', 'stoppage-types', ''],
    queryFn: () => listStoppageTypes({}),
    retry: false,
  });

  const [stoppageCode, setStoppageCode] = useState(initial?.stoppageCode ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [isPlanned, setIsPlanned] = useState(initial?.isPlanned ?? false);
  const [stoppageDate, setStoppageDate] = useState(
    initial?.stoppageDate ?? reportDate,
  );
  const [startTime, setStartTime] = useState(initial?.startTime ?? '');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '');
  const [durationHours, setDurationHours] = useState(
    initial ? String(initial.durationHours) : '',
  );
  const [rootCauseSystem, setRootCauseSystem] = useState(
    initial?.rootCauseSystem ?? '',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [responsibleParty, setResponsibleParty] = useState<string>(
    initial?.responsibleParty ?? '',
  );

  useEffect(() => {
    if (!initial) return;
    setStoppageCode(initial.stoppageCode);
    setCategory(initial.category);
    setIsPlanned(initial.isPlanned);
  }, [initial]);

  function applyType(code: string) {
    setStoppageCode(code);
    const chosen = typesQuery.data?.find((row) => row.code === code);
    if (!chosen) return;
    // PREFILL, not a binding — see the docblock.
    setCategory(chosen.category);
    setIsPlanned(chosen.isPlanned);
  }

  // Read with the service's own rules, so Save turns on only for what the
  // service will accept, and each field that cannot be read says so below it.
  const start = readEntryTime(startTime);
  const end = readEntryTime(endTime);
  const duration = readDurationHours(durationHours);
  const isValid =
    stoppageCode.trim().length > 0 &&
    category.trim().length > 0 &&
    stoppageDate.trim().length > 0 &&
    start.status === 'ok' &&
    end.status === 'ok' &&
    duration.status === 'ok';

  // Hours entered as H:MM are shown converted, so the stored value is visible
  // before saving.
  const hoursShown =
    duration.status === 'ok'
      ? i18n.language === 'en'
        ? String(duration.hours)
        : toPersianDigits(String(duration.hours)).split('.').join(PERSIAN_DECIMAL_MARK)
      : '';

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium block" htmlFor="stp-type">
            {t('downtimeType', { defaultValue: 'Downtime type' })}{' '}
            <span className="text-destructive">*</span>
          </label>
          <Select value={stoppageCode || undefined} onValueChange={applyType}>
            <SelectTrigger id="stp-type" className="w-full">
              <SelectValue
                placeholder={t('selectDowntimeType', {
                  defaultValue: 'Select a downtime type…',
                })}
              />
            </SelectTrigger>
            <SelectContent>
              {/* Active types only; the stoppage's own type stays listed even if
                  it has since been deactivated, so editing an old row never
                  blanks it. */}
              {typesQuery.data
                ?.filter((row) => row.isActive !== false || row.code === stoppageCode)
                .map((row) => (
                <SelectItem key={row.id} value={row.code}>
                  {row.code} — {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* An empty lookup means nothing can be logged at all. Named rather
              than presented as an empty dropdown with no explanation. */}
          {typesQuery.isSuccess && typesQuery.data.length === 0 && (
            <p className="text-xs text-destructive">
              {t('noDowntimeTypes', {
                defaultValue:
                  'No downtime types are defined yet, so a stoppage cannot be logged. Head office maintains them under Downtime Types.',
              })}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium block" htmlFor="stp-category">
            {t('category', { defaultValue: 'Category' })}
          </label>
          <Input id="stp-category" value={category} readOnly />
          <p className="text-xs text-muted-foreground">
            {t('categoryFromType', {
              defaultValue: 'Comes from the selected downtime type.',
            })}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium block" htmlFor="stp-date">
            {t('stoppageDate', { defaultValue: 'Date' })}{' '}
            <span className="text-destructive">*</span>
          </label>
          <DmsDateInput id="stp-date" value={stoppageDate} onChange={setStoppageDate} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium block" htmlFor="stp-start">
            {t('startTime', { defaultValue: 'Start (HH:mm)' })}{' '}
            <span className="text-destructive">*</span>
          </label>
          <Input
            id="stp-start"
            value={startTime}
            placeholder="08:30"
            aria-invalid={start.status === 'invalid' ? true : undefined}
            onChange={(e) => setStartTime(toEnglishDigits(e.target.value))}
          />
          {start.status === 'invalid' && (
            <p className="text-xs text-destructive">
              {t('timeInvalidHint', {
                defaultValue: 'Enter the time as hours:minutes, for example 08:30 (hours 0–23, minutes 00–59).',
              })}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium block" htmlFor="stp-end">
            {t('endTime', { defaultValue: 'End (HH:mm)' })}{' '}
            <span className="text-destructive">*</span>
          </label>
          <Input
            id="stp-end"
            value={endTime}
            placeholder="10:00"
            aria-invalid={end.status === 'invalid' ? true : undefined}
            onChange={(e) => setEndTime(toEnglishDigits(e.target.value))}
          />
          {end.status === 'invalid' && (
            <p className="text-xs text-destructive">
              {t('timeInvalidHint', {
                defaultValue: 'Enter the time as hours:minutes, for example 08:30 (hours 0–23, minutes 00–59).',
              })}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium block" htmlFor="stp-duration">
            {t('durationHours', { defaultValue: 'Duration (hours)' })}{' '}
            <span className="text-destructive">*</span>
          </label>
          {/* The duration is given in HOURS and stored that way, typed as a
              decimal or as H:MM. It is entered, not derived from the two
              times: the specification records both, and deriving one would
              silently overwrite what the operator recorded. */}
          <Input
            id="stp-duration"
            inputMode="decimal"
            value={durationHours}
            aria-invalid={duration.status === 'unreadable' ? true : undefined}
            onChange={(e) => setDurationHours(toEnglishDigits(e.target.value))}
          />
          {duration.status === 'ok' ? (
            duration.fromClock && (
              <p className="text-xs text-muted-foreground">
                {t('durationHoursFromClock', {
                  defaultValue: '= {{hours}} h',
                  hours: hoursShown,
                })}
              </p>
            )
          ) : (
            // Shown whenever the duration cannot be saved — empty or unreadable
            // — so Save is never grey without a reason on the page.
            <p
              className={
                duration.status === 'unreadable'
                  ? 'text-xs text-destructive'
                  : 'text-xs text-muted-foreground'
              }
            >
              {t('durationHoursHint', {
                defaultValue: 'Enter the duration in hours, for example 0.92 or 00:55.',
              })}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium block" htmlFor="stp-party">
            {t('responsibleParty', { defaultValue: 'Responsible party' })}
          </label>
          <Select
            value={responsibleParty || undefined}
            onValueChange={setResponsibleParty}
          >
            <SelectTrigger id="stp-party" className="w-full">
              <SelectValue
                placeholder={t('selectResponsible', {
                  defaultValue: 'Select…',
                })}
              />
            </SelectTrigger>
            <SelectContent>
              {ALL_RESPONSIBLE_PARTIES.map((party) => (
                <SelectItem key={party} value={party}>
                  {party}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium block" htmlFor="stp-system">
            {t('rootCauseSystem', { defaultValue: 'System / area' })}
          </label>
          <Input
            id="stp-system"
            value={rootCauseSystem}
            onChange={(e) => setRootCauseSystem(e.target.value)}
          />
        </div>

        <div className="flex items-start gap-2 pt-6">
          <Checkbox
            id="stp-planned"
            checked={isPlanned}
            onCheckedChange={(checked) => setIsPlanned(checked === true)}
          />
          <div>
            <label className="text-sm font-medium" htmlFor="stp-planned">
              {t('downtimeIsPlannedLabel', { defaultValue: 'Planned downtime' })}
            </label>
            <p className="text-xs text-muted-foreground">
              {t('isPlannedPrefillNote', {
                defaultValue:
                  'Prefilled from the downtime type and still yours to change. This row’s value is what the planned-downtime figure uses.',
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium block" htmlFor="stp-notes">
          {t('notes', { defaultValue: 'Notes' })}
        </label>
        <Textarea
          id="stp-notes"
          className="min-h-20"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {errorText && <p className="text-sm text-destructive">{errorText}</p>}

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          disabled={!isValid || isSaving}
          onClick={() => {
            if (!isValid || start.status !== 'ok' || end.status !== 'ok' || duration.status !== 'ok') return;
            onSubmit({
              stoppageDate,
              stoppageCode,
              category,
              startTime: start.value,
              endTime: end.value,
              durationHours: duration.hours,
              isPlanned,
              rootCauseSystem: rootCauseSystem.trim() || undefined,
              notes: notes.trim() || undefined,
              responsibleParty:
                (responsibleParty as ResponsibleParty) || undefined,
            });
          }}
        >
          {isSaving
            ? t('saving', { defaultValue: 'Saving…' })
            : t('save', { defaultValue: 'Save' })}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          {t('cancel', { defaultValue: 'Cancel' })}
        </Button>
      </div>
    </div>
  );
}
