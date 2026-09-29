'use client';

import { X } from 'lucide-react';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

/**
 * The one date input in the zone: a Persian (Jalali) calendar picker whose value
 * is the Gregorian `YYYY-MM-DD` string the store and the eventual API use.
 *
 * The customer asked for every date to be entered in the Persian calendar, in
 * every UI language, so `forcePersian` is set HERE rather than at each call site
 * — a site that forgot it would silently fall back to Gregorian in the English UI.
 *
 * ⚠ CLEARING. The picker only reports a CHOSEN date; it has no way to report an
 * emptied one. The native input it replaces could be emptied, and optional dates
 * (an end date, a release date, most project dates) depend on that. `clearable`
 * adds an explicit clear control, and the picker is remounted when the value
 * becomes empty so it does not keep showing the date that was cleared.
 *
 * `id` goes on the wrapper: the picker takes no id, so a `<Label htmlFor>` points
 * at the field's container rather than at nothing.
 */
export function DmsDateInput({
  id,
  value,
  onChange,
  clearable = false,
  disabled = false,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useTranslation('dms');
  const canClear = clearable && !disabled && value !== '';
  return (
    <div id={id} className={cn('flex items-center gap-1', className)}>
      <DatePickerComponent
        key={value === '' ? 'empty' : 'set'}
        className="flex-1"
        value={value || undefined}
        onChange={onChange}
        disabled={disabled}
        forcePersian
      />
      {canClear && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('clearDate', { defaultValue: 'Clear date' })}
          title={t('clearDate', { defaultValue: 'Clear date' })}
          className="inline-flex size-8.5 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
