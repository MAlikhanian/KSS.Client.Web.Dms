'use client';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import type { DmsProject } from '@/lib/dms/types';
import { groupProjects } from '../_lib/project-groups';

/**
 * The project picker on the operator's and the supervisor's screens. When
 * every assignment covers today it is the plain list it always was; otherwise
 * those projects come first and the others follow under their own heading.
 *
 * Radix rejects an empty string as a SelectItem value, so "nothing chosen" is
 * `undefined` plus a placeholder rather than a blank option row.
 */
export function ProjectPicker({
  id,
  projects,
  value,
  onChange,
}: {
  id: string;
  projects: readonly DmsProject[] | undefined;
  value: string;
  onChange: (projectId: string) => void;
}) {
  const { t } = useTranslation('dms');
  const { current, previous } = groupProjects(projects ?? []);
  const item = (p: DmsProject) => (
    <SelectItem key={p.id} value={p.id}>
      {p.projectCode} — {p.contractSubject}
    </SelectItem>
  );

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full" data-dms-project-picker="project-picker-grouped">
        <SelectValue placeholder={t('selectProject', { defaultValue: 'Select a project…' })} />
      </SelectTrigger>
      <SelectContent>
        {previous.length === 0 ? (
          current.map(item)
        ) : (
          <>
            {current.length > 0 && (
              <SelectGroup>
                <SelectLabel>{t('currentProjects', { defaultValue: 'Current projects' })}</SelectLabel>
                {current.map(item)}
              </SelectGroup>
            )}
            <SelectGroup>
              <SelectLabel>{t('previousAssignments', { defaultValue: 'Previous assignments' })}</SelectLabel>
              {previous.map(item)}
            </SelectGroup>
          </>
        )}
      </SelectContent>
    </Select>
  );
}
