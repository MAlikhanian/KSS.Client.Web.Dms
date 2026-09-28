'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError } from '@/lib/dms/errors';
import {
  deletePersonnelAssignment,
  listPersonnel,
  listPersonnelAssignments,
  listProjects,
  listShifts,
} from '@/lib/dms/mock-store';
import { useDmsActor } from '../../_lib/use-dms-actor';

/**
 * ۲-۶ جدول تخصیص پرسنل به پروژه‌ها — the administration view.
 *
 * ⚠ THIS SCREEN SHOWS ENDED ASSIGNMENTS ON PURPOSE, and that is not the same
 * as the question "who is on this project". Amir asked for the date window
 * (msg 194) precisely so that «the complete assignment history of personnel
 * across different projects will be maintained», so a screen that hid ended
 * rows would hide the thing the fields exist for — and you cannot correct or
 * re-open an assignment you cannot see.
 *
 * The store keeps the two apart and this screen calls the history one:
 *   listPersonnelAssignments      — every row for the project, ended included
 *   listActivePersonnelForProject — who is on it ON A DATE, ended excluded
 *
 * The "on this date" box below is a VIEWING AID over the first, not a call to
 * the second: it marks each row Active or Ended so the distinction is visible
 * rather than implied. Anything that feeds a KPI must call the second.
 *
 * ⛔ NO UNSCOPED READ EXISTS. The project selector is not a convenience — the
 * store offers no function returning every assignment across projects, which is
 * the CashAdvance defect (nothing scopes the query, so a second tenant sees
 * everything and nothing fails) made unreachable rather than merely avoided.
 */
export function PersonnelAssignmentsContent() {
  const { t } = useTranslation('dms');
  const queryClient = useQueryClient();
  const { actor, ready } = useDmsActor();

  const [projectId, setProjectId] = useState('');
  // Today, as the natural question. Editable, because "who was on this in
  // March" is a real question and the answer is already in the data.
  const [onDate, setOnDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [projectsQuery, personnelQuery, shiftsQuery] = useQueries({
    queries: [
      { queryKey: ['dms', 'projects'], queryFn: () => listProjects({}), enabled: ready, retry: false },
      { queryKey: ['dms', 'personnel'], queryFn: () => listPersonnel(), enabled: ready, retry: false },
      { queryKey: ['dms', 'shifts'], queryFn: () => listShifts(), enabled: ready, retry: false },
    ],
  });

  const [assignmentsQuery] = useQueries({
    queries: [
      {
        queryKey: ['dms', 'personnel-assignments', projectId],
        queryFn: () => listPersonnelAssignments({ projectId }),
        // No project, no read. There is no "all projects" call to fall back to.
        enabled: ready && projectId !== '',
        retry: false,
      },
    ],
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => {
      if (!actor) throw new Error('No actor');
      return deletePersonnelAssignment({ id, actor });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dms', 'personnel-assignments'] });
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

  const loadError = projectsQuery.error ?? personnelQuery.error ?? shiftsQuery.error;
  const personById = new Map((personnelQuery.data ?? []).map((p) => [p.id, p]));
  const shiftById = new Map((shiftsQuery.data ?? []).map((sh) => [sh.id, sh]));
  const rows = assignmentsQuery.data ?? [];

  const isActiveOn = (startDate: string, endDate: string | undefined) =>
    startDate <= onDate && (endDate ?? '9999-12-31') >= onDate;

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>
            {t('personnelAssignmentsTitle', { defaultValue: 'Personnel assignment' })}
          </ToolbarTitle>
        </ToolbarHeading>
        <ToolbarActions>
          {/*
            Not disabled when no project is chosen: the assign screen picks its
            own project. A disabled button here would be a second, weaker copy
            of a rule the store already enforces.
          */}
          <Button asChild variant="primary">
            <Link href="/admin/personnel-assignments/assign">
              {t('assignPersonnel', { defaultValue: 'Assign someone' })}
            </Link>
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
        <Card>
          <CardContent className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
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
              {t('personnelAssignmentsExplain', {
                defaultValue:
                  'A person is assigned to a project for a period. Someone leaving is recorded by setting an end date, which keeps the history; removing a row deletes it as though it never happened, and is for correcting a mistake.',
              })}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="pa-project">
                  {t('project', { defaultValue: 'Project' })}
                </Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="pa-project" className="w-full">
                    <SelectValue
                      placeholder={t('selectProject', {
                        defaultValue: 'Select a project…',
                      })}
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
                <Label htmlFor="pa-on-date">
                  {t('activeOnDate', { defaultValue: 'Show status on' })}
                </Label>
                <Input
                  id="pa-on-date"
                  type="date"
                  value={onDate}
                  onChange={(e) => setOnDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t('activeOnDateHint', {
                    defaultValue:
                      'Changes which rows read as Active. It does not hide anything — every assignment for the project is listed.',
                  })}
                </p>
              </div>
            </div>

            {!!loadError && (
              <p className="text-sm text-destructive">
                {isDmsError(loadError)
                  ? `${loadError.message} (${loadError.code})`
                  : t('referenceLoadFailed', {
                      defaultValue: 'Projects, personnel or shifts could not be loaded.',
                    })}
              </p>
            )}

            {projectsQuery.isSuccess && projectsQuery.data.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('noProjectsForPersonnel', {
                  defaultValue:
                    'There are no projects yet. Someone is assigned to a project, so create a project first.',
                })}
              </p>
            )}

            {projectId === '' && projectsQuery.isSuccess && projectsQuery.data.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {t('choosePersonnelProject', {
                  defaultValue:
                    'Choose a project to see who is assigned to it.',
                })}
              </p>
            )}

            {assignmentsQuery.isLoading && projectId !== '' && (
              <p className="text-sm text-muted-foreground">
                {t('loading', { defaultValue: 'Loading…' })}
              </p>
            )}

            {!!assignmentsQuery.error && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  {isDmsError(assignmentsQuery.error)
                    ? `${assignmentsQuery.error.message} (${assignmentsQuery.error.code})`
                    : t('personnelAssignmentsLoadFailed', {
                        defaultValue: 'Personnel assignments could not be loaded.',
                      })}
                </p>
                <Button variant="outline" onClick={() => void assignmentsQuery.refetch()}>
                  {t('retry', { defaultValue: 'Try again' })}
                </Button>
              </div>
            )}

            {removeMutation.isError && (
              <p className="text-sm text-destructive">
                {isDmsError(removeMutation.error)
                  ? `${removeMutation.error.message} (${removeMutation.error.code})`
                  : t('assignmentRemoveFailed', {
                      defaultValue: 'The assignment could not be removed.',
                    })}
              </p>
            )}

            {assignmentsQuery.isSuccess && rows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('noPersonnelOnProject', {
                  defaultValue:
                    'Nobody has been assigned to this project yet — not even in the past.',
                })}
              </p>
            )}

            {assignmentsQuery.isSuccess && rows.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('person', { defaultValue: 'Person' })}</TableHead>
                      <TableHead>{t('role', { defaultValue: 'Role' })}</TableHead>
                      <TableHead>{t('shift', { defaultValue: 'Shift' })}</TableHead>
                      <TableHead>{t('startDate', { defaultValue: 'Start' })}</TableHead>
                      <TableHead>{t('endDate', { defaultValue: 'End' })}</TableHead>
                      <TableHead>{t('status', { defaultValue: 'Status' })}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((a) => {
                      const person = personById.get(a.personnelId);
                      const shift = a.shiftId ? shiftById.get(a.shiftId) : undefined;
                      const active = isActiveOn(a.startDate, a.endDate);
                      return (
                        <TableRow key={a.id}>
                          <TableCell>
                            {/*
                              The id is shown when the person is missing rather
                              than an empty cell: a dangling reference is data to
                              investigate, and blanking it would hide it.
                            */}
                            {person?.fullName ?? a.personnelId}
                          </TableCell>
                          <TableCell>{a.roleId ?? '—'}</TableCell>
                          <TableCell>
                            {shift ? `${shift.name} (${shift.timeRangeText})` : '—'}
                          </TableCell>
                          <TableCell>{a.startDate}</TableCell>
                          <TableCell>
                            {a.endDate ?? t('openEnded', { defaultValue: 'Open' })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={active ? 'primary' : 'outline'}>
                              {active
                                ? t('assignmentActive', { defaultValue: 'Active' })
                                : t('assignmentEnded', { defaultValue: 'Not on this date' })}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Button asChild variant="outline">
                              <Link href={`/admin/personnel-assignments/edit?id=${a.id}`}>
                                {t('edit', { defaultValue: 'Edit' })}
                              </Link>
                            </Button>{' '}
                            <Button
                              variant="destructive"
                              disabled={removeMutation.isPending}
                              onClick={() => removeMutation.mutate(a.id)}
                            >
                              {t('remove', { defaultValue: 'Remove' })}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
