'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { KNOWN_STOPPAGE_CATEGORIES, type KnownStoppageCategory } from '@/lib/dms/types';

/**
 * The label for each category. ⛔ A LITERAL `t()` CALL PER KEY, never a key read
 * from a table: the i18n check finds keys by their call sites, and a computed key
 * is invisible to it — the key then reads as unused, and a missing translation
 * would not be caught.
 */
function categoryLabel(t: (key: string, opts: { defaultValue: string }) => string, c: KnownStoppageCategory): string {
  switch (c) {
    case 'Technical':
      return t('categoryTechnical', { defaultValue: 'Technical' });
    case 'Operational':
      return t('categoryOperational', { defaultValue: 'Operational' });
    case 'Planned':
      return t('categoryPlanned', { defaultValue: 'Planned' });
  }
}

/**
 * A stoppage type's category: exactly one of the three the customer named.
 *
 * ⚠ A STORED VALUE OUTSIDE THE THREE IS SHOWN, NOT DROPPED — as its own marked
 * option. A type written while the category was free text would otherwise render
 * as empty and be cleared by the next save, with nothing saying it happened.
 */
export function StoppageCategorySelect({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id?: string;
  value: string;
  onChange: (category: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation('dms');
  const known = (KNOWN_STOPPAGE_CATEGORIES as readonly string[]).includes(value);
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={t('selectCategory', { defaultValue: 'Select a category…' })} />
      </SelectTrigger>
      <SelectContent>
        {KNOWN_STOPPAGE_CATEGORIES.map((c) => (
          <SelectItem key={c} value={c}>
            {categoryLabel(t, c)}
          </SelectItem>
        ))}
        {value !== '' && !known && (
          <SelectItem value={value}>
            {value} — {t('categoryNotInList', { defaultValue: 'not one of the three categories; pick one' })}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
