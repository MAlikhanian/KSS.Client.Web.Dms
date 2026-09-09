'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  listPersonnel,
  listPersonnelAssignments,
  listProjects,
  listShifts,
  updatePersonnelAssignment,
} from '@/lib/dms/mock-store';
import { DMS_PROJECT_ROLES } from '@/lib/dms/types';
import { useDmsActor } from '../../../_lib/use-dms-actor';

/**
 * Correct or end one assignment — ۲-۶.
 *
 * ⚠ THE PERSON AND THE PROJECT ARE NOT EDITABLE HERE, and that is the model
 * speaking rather than a missing feature. Changing either would make this row a
 * DIFFERENT assignment while keeping its id and its dates — the record would
 * then say someone worked a period they did not. `PersonnelAssignmentPatch` is
 * an allow-list that excludes both, so the store refuses it even if a caller
 * tries; this screen simply shows what the type already enforces.
 *
 * Ending an assignment is setting the end date. It is NOT the Remove button on
 * the list, which deletes the row — Amir asked for these dates so that «the
 * complete assignment history» is kept, so ending preserves that history and
 * deleting destroys it. Two different acts, deliberately in two places.
 */
export function EditPersonnelAssignmentContent() {
  const { t } = useTranslation('dms');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { actor, ready } = useDmsActor();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [loaded, setLoaded] = useState(false);

  const [projectsQuery, personnelQuery, shiftsQuery] = useQueries({
    queries: [
      { queryKey: ['dms', 'projects'], queryFn: () => listProjects({}), enabled: ready, retry: false },
      { queryKey: ['dms', 'personnel'], queryFn: () => listPersonnel(), enabled: ready, retry: false },
      { queryKey: ['dms', 'shifts'], queryFn: () => listShifts(), enabled: ready, retry: false },
    ],
  });

  /*
   * There is no `getPersonnelAssignment(id)` in the store, by design: every
   * assignment read is scoped by project, so a bare id lookup would be the one
   * unscoped read in the file. This walks the projects instead — more calls,
   * and it keeps the property that nothing can fetch across projects.
   */
  const [rowQuery] = useQueries({
    queries: [
      {
        queryKey: ['dms', 'personnel-assignment', id],
        queryFn: async () => {
          const projects = await listProjects({});
          for (const p of projects) {
            const rows = await listPersonnelAssignments({ projectId: p.id });
            const found = rows.find((a) => a.id === id);
            if (found) return found;
          }
          return null;
        },
        enabled: ready && !!id,
        retry: false,
      },
    ],
  });

  const row = rowQuery.data ?? null;

  useEffect(() => {
    if (row && !loaded) {
      setStartDate(row.startDate);
      setEndDate(row.endDate ?? '');
      setShiftId(row.shiftId ?? '');
      setRoleId(row.roleId ?? '');
      setLoaded(true);
    }
  }, [row, loaded]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!actor || !row) throw new Error('Not ready');
      return updatePersonnelAssignment({
        id: row.id,
        patch: {
          startDate,
          // An empty control reopens the assignment rather than writing '' —
          // `undefined` here means "no end date", which is what open means.
          endDate: endDate === '' ? undefined : endDate,
          shiftId: shiftId === '' ? undefined : shiftId,
          roleId: roleId === '' ? undefined : (roleId as (typeof DMS_PROJECT_ROLES)[number]),
        },
        actor,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dms', 'personnel-assignments'] });
      void queryClient.invalidateQueries({ queryKey: ['dms', 'personnel-assignment'] });
      toast.success(t('assignmentSaved', { defaultValue: 'The assignment has been updated.' }));
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

  if (!id) {
    return (
      <Card>
        <CardContent className="py-8 space-y-2">
          <p className="text-sm text-muted-foreground">
            {t('noAssignmentSelected', {
              defaultValue: 'No assignment was given to edit.',
            })}
          </p>
          <Button asChild variant="outline">
            <Link href="/admin/personnel-assignments">
              {t('backToAssignments', { defaultValue: 'Back to assignments' })}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const person = row
    ? (personnelQuery.data ?? []).find((p) => p.id === row.personnelId)
    : undefined;
  const project = row
    ? (projectsQuery.data ?? []).find((p) => p.id === row.projectId)
    : undefined;

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>
            {t('editAssignmentTitle', { defaultValue: 'Edit assignment' })}
          </ToolbarTitle>
        </ToolbarHeading>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
        <Card>
          <CardHeader>
            <CardTitle>{t('assignmentDetails', { defaultValue: 'Assignment' })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rowQuery.isLoading && (
              <p className="text-sm text-muted-foreground">
                {t('loading', { defaultValue: 'Loading…' })}
              </p>
            )}

            {!!rowQuery.error && (
              <p className="text-sm text-destructive">
                {isDmsError(rowQuery.error)
                  ? `${rowQuery.error.message} (${rowQuery.error.code})`
                  : t('assignmentLoadFailed', {
                      defaultValue: 'The assignment could not be loaded.',
                    })}
              </p>
            )}

            {rowQuery.isSuccess && !row && (
              <p className="text-sm text-muted-foreground">
                {t('assignmentNotFound', {
                  defaultValue:
                    'That assignment no longer exists. It may have been removed on another tab.',
                })}
              </p>
            )}

            {row && (
              <>
                <p className="text-sm text-muted-foreground">
                  {t('assignmentFixedFields', {
                    defaultValue:
                      'The person and the project cannot be changed. Moving someone is ending this assignment and starting another, so that the record of where they were stays true.',
                  })}
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>{t('person', { defaultValue: 'Person' })}</Label>
                    <p className="text-sm">{person?.fullName ?? row.personnelId}</p>
                  </div>
                  <div className="space-y-1">
                    <Label>{t('project', { defaultValue: 'Project' })}</Label>
                    <p className="text-sm">{project?.projectCode ?? row.projectId}</p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="pa-edit-start">
                      {t('startDate', { defaultValue: 'Start date' })}
                    </Label>
                    <Input
                      id="pa-edit-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="pa-edit-end">
                      {t('endDate', { defaultValue: 'End date' })}
                    </Label>
                    <Input
                      id="pa-edit-end"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {/*
                       * ⚠ DMS-PROVISIONAL-TERM — «تاریخچه» (history)
                       *
                       * Our coinage. Amir has not confirmed it: it was chosen because a search
                       * of his FRD returned nothing for the concept, not because he named it.
                       * Caroline will put it to him alongside the working screen, as an
                       * invitation to correct rather than a question to answer.
                       *
                       * ⛔ IF HE CORRECTS IT, THIS IS A GREP AND NOT AN AUDIT:
                       *     grep -r "DMS-PROVISIONAL-TERM" "app/(dms)"
                       * finds every site. The term itself lives in i18n/dms/fa.json under this
                       * key — change it there; this marker only says where to look.
                      */}
                      {t('endDateEditHint', {
                        defaultValue:
                          'Setting this records that the person has left the project; the row stays and keeps the history. Clearing it reopens the assignment.',
                      })}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="pa-edit-shift">
                      {t('shift', { defaultValue: 'Shift' })}
                    </Label>
                    <Select value={shiftId} onValueChange={setShiftId}>
                      <SelectTrigger id="pa-edit-shift" className="w-full">
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
                    <Label htmlFor="pa-edit-role">
                      {t('role', { defaultValue: 'Role' })}
                    </Label>
                    <Select value={roleId} onValueChange={setRoleId}>
                      <SelectTrigger id="pa-edit-role" className="w-full">
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
                      : t('assignmentSaveFailed', {
                          defaultValue: 'The assignment could not be updated.',
                        })}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    disabled={startDate === '' || mutation.isPending}
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
