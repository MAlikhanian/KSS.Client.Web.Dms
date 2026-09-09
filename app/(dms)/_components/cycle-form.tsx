'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { minutesBetween } from '@/lib/dms/kpi';
import type { DmsCycle } from '@/lib/dms/types';
import { parseOptionalNumber, toEnglishDigits } from '../_lib/digits';
import { formatMinutes } from '../_lib/report-status';

export type CycleDraft = Omit<DmsCycle, 'id' | 'reportId' | 'cycleNumber'>;

/**
 * Enter or correct one cycle — ۲-۸'s eight timestamps.
 *
 * The four phases are laid out as pairs because that is what they are: §4 sums
 * dredging + transport + discharge + return into T_OP, and each pair's derived
 * duration is shown beside the two times it comes from. That is the same rule
 * as the cycles table — a per-row derived value is checkable against its own
 * inputs on the spot — and it gives the operator immediate feedback that a
 * night crossing was read the way they meant.
 *
 * ⚠ NO ORDERING IS ENFORCED BETWEEN PHASES, and an end before its own start is
 * ACCEPTED: `minutesBetween` treats that as a midnight crossing, which is how a
 * 23:40→00:25 dredging phase is meant to be recorded. Validation that refused
 * it would contradict the engine and leave a night cycle unrecordable.
 *
 * ⚠ VOLUME MAY BE ZERO. A cycle that ran and produced nothing is a real event,
 * and refusing it would make an operator either lie or drop the cycle — which
 * would lose its TIME from T_OP as well as its volume.
 */
export function CycleForm({
  initial,
  reportDate,
  onCancel,
  onSubmit,
  isSaving,
  errorText,
}: {
  initial?: DmsCycle;
  reportDate: string;
  onCancel: () => void;
  onSubmit: (draft: CycleDraft) => void;
  isSaving: boolean;
  errorText?: string;
}) {
  const { t } = useTranslation('dms');

  const [cycleDate, setCycleDate] = useState(initial?.cycleDate ?? reportDate);
  const [times, setTimes] = useState<Record<string, string>>({
    dredgingStart: initial?.dredgingStart ?? '',
    dredgingEnd: initial?.dredgingEnd ?? '',
    transportStart: initial?.transportStart ?? '',
    transportEnd: initial?.transportEnd ?? '',
    dischargeStart: initial?.dischargeStart ?? '',
    dischargeEnd: initial?.dischargeEnd ?? '',
    returnStart: initial?.returnStart ?? '',
    returnEnd: initial?.returnEnd ?? '',
  });
  const [volume, setVolume] = useState(
    initial?.dredgedVolumeM3 === undefined
      ? ''
      : String(initial.dredgedVolumeM3),
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const set = (field: string, value: string) =>
    setTimes((prev) => ({ ...prev, [field]: toEnglishDigits(value) }));

  const phases: ReadonlyArray<{ label: string; start: string; end: string }> = [
    {
      label: t('phaseDredging', { defaultValue: 'Dredging' }),
      start: 'dredgingStart',
      end: 'dredgingEnd',
    },
    {
      label: t('phaseTransport', { defaultValue: 'Transport' }),
      start: 'transportStart',
      end: 'transportEnd',
    },
    {
      label: t('phaseDischarge', { defaultValue: 'Discharge' }),
      start: 'dischargeStart',
      end: 'dischargeEnd',
    },
    {
      label: t('phaseReturn', { defaultValue: 'Return' }),
      start: 'returnStart',
      end: 'returnEnd',
    },
  ];

  const allTimesPresent = Object.values(times).every(
    (v) => v.trim().length > 0,
  );
  const parsedVolume = parseOptionalNumber(volume);
  const volumeOk = parsedVolume === undefined || parsedVolume >= 0;
  const isValid = cycleDate.trim().length > 0 && allTimesPresent && volumeOk;

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <div className="space-y-1.5 max-w-xs">
        <label className="text-sm font-medium block" htmlFor="cyc-date">
          {t('cycleDate', { defaultValue: 'Date' })}{' '}
          <span className="text-destructive">*</span>
        </label>
        <Input
          id="cyc-date"
          type="date"
          value={cycleDate}
          onChange={(e) => setCycleDate(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {phases.map((phase) => {
          const derived = minutesBetween(times[phase.start], times[phase.end]);
          return (
            <div key={phase.start} className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{phase.label}</span>
                {/* The derived duration, beside the two times it comes from. */}
                <span className="text-xs text-muted-foreground">
                  {derived === null ? '—' : formatMinutes(derived)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  aria-label={`${phase.label} start`}
                  placeholder="06:20"
                  value={times[phase.start]}
                  onChange={(e) => set(phase.start, e.target.value)}
                />
                <Input
                  aria-label={`${phase.label} end`}
                  placeholder="07:35"
                  value={times[phase.end]}
                  onChange={(e) => set(phase.end, e.target.value)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium block" htmlFor="cyc-volume">
            {t('volumeM3', { defaultValue: 'Volume (m³)' })}
          </label>
          <Input
            id="cyc-volume"
            inputMode="decimal"
            value={volume}
            onChange={(e) => setVolume(toEnglishDigits(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            {t('volumeZeroNote', {
              defaultValue:
                'May be zero — a cycle that ran and produced nothing is still a cycle, and its time counts.',
            })}
          </p>
          {!volumeOk && (
            <p className="text-xs text-destructive">
              {t('volumeNegative', { defaultValue: 'Volume cannot be negative.' })}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium block" htmlFor="cyc-notes">
            {t('notes', { defaultValue: 'Notes' })}
          </label>
          <Textarea
            id="cyc-notes"
            className="min-h-20"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {errorText && <p className="text-sm text-destructive">{errorText}</p>}

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          disabled={!isValid || isSaving}
          onClick={() =>
            onSubmit({
              cycleDate,
              dredgingStart: times.dredgingStart,
              dredgingEnd: times.dredgingEnd,
              transportStart: times.transportStart,
              transportEnd: times.transportEnd,
              dischargeStart: times.dischargeStart,
              dischargeEnd: times.dischargeEnd,
              returnStart: times.returnStart,
              returnEnd: times.returnEnd,
              dredgedVolumeM3: parsedVolume,
              notes: notes.trim() || undefined,
            })
          }
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
