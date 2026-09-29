'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { listVesselTypes } from '@/lib/dms/mock-store';
import type { DmsVesselType } from '@/lib/dms/types';

/** Radix Select cannot carry '' as an item value, so "no type" needs a sentinel. */
const NONE = '__none__';

export function useVesselTypes() {
  return useQuery({
    queryKey: ['dms', 'vessel-types'],
    queryFn: () => listVesselTypes(),
    retry: false,
  });
}

/** The display name for a stored type code, in the UI language. */
export function vesselTypeLabel(
  types: DmsVesselType[] | undefined,
  code: string | undefined,
  language: string,
): string {
  if (!code) return '—';
  const row = types?.find((t) => t.code === code);
  if (!row) return code;
  return language === 'en' ? row.nameEn : row.name;
}

/**
 * The vessel type, picked from the vessel-types lookup. Value is the type CODE,
 * or '' for none — the type is optional on a vessel.
 *
 * ⚠ A STORED VALUE THAT IS NOT IN THE LOOKUP IS SHOWN, NOT DROPPED. A vessel
 * written before types became a lookup holds free text. Rendering the select
 * empty would read as "no type recorded" and a save would silently clear it, so
 * it appears as its own marked option until someone picks a real type.
 */
export function VesselTypeSelect({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  const { t, i18n } = useTranslation('dms');
  const typesQuery = useVesselTypes();
  const types = (typesQuery.data ?? []).filter((row) => row.isActive || row.code === value);
  const unknown = value !== '' && typesQuery.isSuccess && !types.some((row) => row.code === value);

  return (
    <Select
      value={value === '' ? NONE : value}
      onValueChange={(next) => onChange(next === NONE ? '' : next)}
      disabled={disabled || typesQuery.isLoading}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue
          placeholder={t('selectVesselType', { defaultValue: 'Select a vessel type…' })}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>
          {t('vesselTypeNone', { defaultValue: 'Not specified' })}
        </SelectItem>
        {types.map((row) => (
          <SelectItem key={row.code} value={row.code}>
            {i18n.language === 'en' ? row.nameEn : row.name}
          </SelectItem>
        ))}
        {unknown && (
          <SelectItem value={value}>
            {value} — {t('vesselTypeNotInList', { defaultValue: 'not in the type list; pick a type' })}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
