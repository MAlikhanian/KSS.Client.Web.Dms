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
import { listProjectRoles } from '@/lib/dms/store';
import type { DmsProjectRoleRow } from '@/lib/dms/types';

/** Radix Select cannot carry '' as an item value, so "no role" needs a sentinel. */
const NONE = '__none__';

export function useProjectRoles() {
  return useQuery({
    queryKey: ['dms', 'project-roles'],
    queryFn: () => listProjectRoles(),
    retry: false,
  });
}

/** A role's name for a stored code; the code itself when the table has no such row. */
export function projectRoleName(rows: DmsProjectRoleRow[] | undefined, code: string | undefined): string {
  if (!code) return '—';
  return rows?.find((r) => r.code === code)?.name ?? code;
}

/**
 * A person's role on a project, picked from the project-roles table. Value is
 * the role CODE, or '' for none — the role is optional on an assignment.
 *
 * Only ACTIVE roles are offered; the assignment's current role stays shown even
 * if it has since been deactivated, so opening an old assignment never blanks
 * it (and a save would otherwise clear it).
 */
export function ProjectRoleSelect({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (code: string) => void;
}) {
  const { t } = useTranslation('dms');
  const rolesQuery = useProjectRoles();
  const rows = (rolesQuery.data ?? []).filter((r) => r.isActive || r.code === value);
  const unknown = value !== '' && rolesQuery.isSuccess && !rows.some((r) => r.code === value);

  return (
    <Select
      value={value === '' ? NONE : value}
      onValueChange={(next) => onChange(next === NONE ? '' : next)}
      disabled={rolesQuery.isLoading}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={t('selectRole', { defaultValue: 'Select a role…' })} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{t('roleNone', { defaultValue: 'Not specified' })}</SelectItem>
        {rows.map((r) => (
          <SelectItem key={r.code} value={r.code}>
            {r.name}
          </SelectItem>
        ))}
        {unknown && <SelectItem value={value}>{value}</SelectItem>}
      </SelectContent>
    </Select>
  );
}
