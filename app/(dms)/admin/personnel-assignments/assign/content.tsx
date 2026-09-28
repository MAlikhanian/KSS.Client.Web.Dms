'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError } from '@/lib/dms/errors';
import {
  assignPersonnelToProject,
  listPersonnel,
  listProjects,
  listShifts,
} from '@/lib/dms/mock-store';
import { DMS_PROJECT_ROLES } from '@/lib/dms/types';
import { useDmsActor } from '../../../_lib/use-dms-actor';

/**
 * Start an assignment — ۲-۶, with the window from Amir msg 194.
 *
 * ⚠ THE PROJECT CHOICE IS NOT FILTERED TO PEOPLE WHO ARE FREE, deliberately.
 * The store refuses an overlapping assignment with a 409 that names the other
 * project and quotes the rule, and that refusal is worth more on screen than a
 * shortened dropdown: a control you cannot reach is a disabled button wearing
 * different clothes, and the person who needs to know WHY cannot find out.
 *
 * ⛔ "One project at a time" is Amir's, not our caution — msg 194: «each
 * employee can only be assigned to one project at any given time.» So the
 * refusal spans ALL projects, not just this one, and the message says which
 * project the clash is on. A per-project check would let exactly the rows he
 * ruled out through, and each would look correct.
 */
export function AssignPersonnelContent() {
  const { t } = useTranslation('dms');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { actor, ready } = useDmsActor();

  const [projectId, setProjectId] = useState('');
  const [personnelId, setPersonnelId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [roleId, setRoleId] = useState('');

  const [projectsQuery, personnelQuery, shiftsQuery] = useQueries({
    queries: [
      { queryKey: ['dms', 'projects'], queryFn: () => listProjects({}), enabled: ready, retry: false },
      { queryKey: ['dms', 'personnel'], queryFn: () => listPersonnel(), enabled: ready, retry: false },
      { queryKey: ['dms', 'shifts'], queryFn: () => listShifts(), enabled: ready, retry: false },
    ],
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!actor) throw new Error('No actor');
      return assignPersonnelToProject({
        projectId,
        personnelId,
        startDate,
        // An empty control means "not given", never an empty string reaching
        // the store — `endDate: ''` would be a date that fails validation
        // rather than an open assignment.
        ...(endDate !== '' ? { endDate } : {}),
        ...(shiftId !== '' ? { shiftId } : {}),
        ...(roleId !== '' ? { roleId: roleId as (typeof DMS_PROJECT_ROLES)[number] } : {}),
        actor,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dms', 'personnel-assignments'] });
      toast.success(
        t('assignmentCreated', { defaultValue: 'The assignment has been recorded.' }),
      );
      router.push('/admin/personnel-assignments');
    },
  });

  if (!ready) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          {t('loading', { defaultValue: 'Loading…' })}
        </CardContent>
      </Card>
    );
  }

  if (!actor || actor.role !== 'ProjectControl') {
    return (
      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
        <Card>
          <CardContent className="py-8 space-y-2">
            <h2 className="font-semibold">
              {t('projectControlOnlyTitle', {
                defaultValue: 'This screen belongs to the Project Control role',
              })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('projectControlOnlyBody', {
                defaultValue:
                  'Head office defines projects, vessels and personnel. Change role to continue.',
              })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canSubmit = projectId !== '' && personnelId !== '' && startDate !== '';

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>
            {t('assignPersonnelTitle', { defaultValue: 'Assign someone to a project' })}
          </ToolbarTitle>
        </ToolbarHeading>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
        <Card>
          <CardHeader>
            <CardTitle>
              {t('assignmentDetails', { defaultValue: 'Assignment' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="pa-new-project">
                  {t('project', { defaultValue: 'Project' })}
                </Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="pa-new-project" className="w-full">
                    <SelectValue
                      placeholder={t('selectProject', { defaultValue: 'Select a project…' })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(projectsQuery.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.projectCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="pa-new-person">
                  {t('person', { defaultValue: 'Person' })}
                </Label>
                <Select value={personnelId} onValueChange={setPersonnelId}>
                  <SelectTrigger id="pa-new-person" className="w-full">
                    <SelectValue
                      placeholder={t('selectPerson', { defaultValue: 'Select a person…' })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(personnelQuery.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="pa-new-start">
                  {t('startDate', { defaultValue: 'Start date' })}
                </Label>
                <Input
                  id="pa-new-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pa-new-end">
                  {t('endDate', { defaultValue: 'End date' })}
                </Label>
                <Input
                  id="pa-new-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t('endDateOptionalHint', {
                    defaultValue:
                      'Leave empty while the assignment is open. Setting it later is how someone leaving is recorded.',
                  })}
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="pa-new-shift">
                  {t('shift', { defaultValue: 'Shift' })}
                </Label>
                <Select value={shiftId} onValueChange={setShiftId}>
                  <SelectTrigger id="pa-new-shift" className="w-full">
                    <SelectValue
                      placeholder={t('selectShift', { defaultValue: 'Select a shift…' })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(shiftsQuery.data ?? []).map((sh) => (
                      <SelectItem key={sh.id} value={sh.id}>
                        {sh.name} ({sh.timeRangeText})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="pa-new-role">
                  {t('role', { defaultValue: 'Role' })}
                </Label>
                <Select value={roleId} onValueChange={setRoleId}>
                  <SelectTrigger id="pa-new-role" className="w-full">
                    <SelectValue
                      placeholder={t('selectRole', { defaultValue: 'Select a role…' })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {DMS_PROJECT_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {mutation.isError && (
              <p className="text-sm text-destructive">
                {isDmsError(mutation.error)
                  ? `${mutation.error.message} (${mutation.error.code})`
                  : t('assignmentFailed', {
                      defaultValue: 'The assignment could not be recorded.',
                    })}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                disabled={!canSubmit || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {t('save', { defaultValue: 'Save' })}
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/personnel-assignments">
                  {t('cancel', { defaultValue: 'Cancel' })}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
