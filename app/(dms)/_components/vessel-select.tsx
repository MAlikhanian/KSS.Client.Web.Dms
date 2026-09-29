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
import { listVessels } from '@/lib/dms/store';

/**
 * A pick from the DEFINED vessels. Value is the vessel id, or '' when none is
 * chosen yet.
 *
 * ⚠ AN ID THAT NO LONGER RESOLVES IS SHOWN, NOT DROPPED — as its own marked
 * option, so a broken link is visible instead of looking like "no vessel".
 */
export function VesselSelect({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id?: string;
  value: string;
  onChange: (vesselId: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation('dms');
  const vesselsQuery = useQuery({
    queryKey: ['dms', 'vessels', ''],
    queryFn: () => listVessels({}),
    retry: false,
  });
  const vessels = vesselsQuery.data ?? [];
  const dangling = value !== '' && vesselsQuery.isSuccess && !vessels.some((v) => v.id === value);

  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled || vesselsQuery.isLoading}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={t('selectVessel', { defaultValue: 'Select a vessel…' })} />
      </SelectTrigger>
      <SelectContent>
        {vessels.map((v) => (
          <SelectItem key={v.id} value={v.id}>
            {v.vesselCode} — {v.name}
          </SelectItem>
        ))}
        {dangling && (
          <SelectItem value={value}>
            {value} — {t('vesselNotFound', { defaultValue: 'this vessel no longer exists; pick one' })}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
