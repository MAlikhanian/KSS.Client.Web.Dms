'use client';

import Link from 'next/link';
import { useQueries } from '@tanstack/react-query';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  listProjects,
  listVessels,
  listVesselAssignments,
} from '@/lib/dms/mock-store';
import { useDmsActor } from '../../_lib/use-dms-actor';

/**
 * ۲-۴ جدول تخصیص شناور به پروژه — the overview.
 *
 * ONE ROW PER PROJECT, EVER. ۲-۴'s preamble states the invariant outright:
 * «ارتباط یک‌به‌یک جهت کنترل اینکه هر پروژه فقط و فقط یک شناور فعال داشته
 * باشد», and `project_id` is FK UNIQUE. So this table is a view of PROJECTS,
 * each showing its one assignment or none — not a list of assignments that
 * could grow per project.
 *
 * `release_date` records when that vessel's work on the project ended. It is
 * NOT a handover: the model has no second row for the vessel that follows,
 * because there is no vessel that follows.
 */
export function VesselAssignmentsContent() {
  const { t } = useTranslation('dms');
  const { actor, ready } = useDmsActor();

  // Three reads joined for presentation. The store returns rows; the join is
  // this screen's business, not the API's.
  const [projectsQuery, vesselsQuery, assignmentsQuery] = useQueries({
    queries: [
      { queryKey: ['dms', 'projects'], queryFn: () => listProjects({}), enabled: ready, retry: false },
      { queryKey: ['dms', 'vessels', ''], queryFn: () => listVessels({}), enabled: ready, retry: false },
      { queryKey: ['dms', 'vessel-assignments'], queryFn: () => listVesselAssignments(), enabled: ready, retry: false },
    ],
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

  const isLoading =
    projectsQuery.isLoading || vesselsQuery.isLoading || assignmentsQuery.isLoading;
  const error = projectsQuery.error ?? vesselsQuery.error ?? assignmentsQuery.error;
  const ready3 =
    projectsQuery.isSuccess && vesselsQuery.isSuccess && assignmentsQuery.isSuccess;

  const vesselById = new Map(
    (vesselsQuery.data ?? []).map((v) => [v.id, v]),
  );
  const assignmentByProject = new Map(
    (assignmentsQuery.data ?? []).map((a) => [a.projectId, a]),
  );

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>
            {t('vesselAssignmentsTitle', { defaultValue: 'Vessel assignment' })}
          </ToolbarTitle>
        </ToolbarHeading>
        <ToolbarActions>
          {/*
            Deliberately NOT scoped to unassigned projects. The assign screen
            lets you choose any project, including one that already has a
            vessel — and refuses that with the 409, on screen, with its reason.
            Filtering the choice here would hide the control instead: a refusal
            reachable only by constructing the call by hand is not a rendered
            refusal, and an unreachable error is a disabled button wearing
            different clothes.
          */}
          <Button asChild variant="primary">
            <Link href="/admin/vessel-assignments/assign">
              {t('assignAVessel', { defaultValue: 'Assign a vessel' })}
            </Link>
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
        <Card>
          <CardContent className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              {/*
               * ⚠ DMS-PROVISIONAL-TERM — «تخصیص مجدد» (reassignment)
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
              {t('vesselAssignmentsExplain', {
                defaultValue:
                  'Each project has exactly one vessel, for its whole life. There is no reassignment: a mistake is corrected on the single record, and an end of work is recorded as a release date.',
              })}
            </p>

            {isLoading && (
              <p className="text-sm text-muted-foreground">
                {t('loading', { defaultValue: 'Loading…' })}
              </p>
            )}

            {/* FAILURE PATH ONE — a load failed. */}
            {!!error && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  {isDmsError(error)
                    ? `${error.message} (${error.code})`
                    : t('assignmentsLoadFailed', {
                        defaultValue: 'Vessel assignments could not be loaded.',
                      })}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    void projectsQuery.refetch();
                    void vesselsQuery.refetch();
                    void assignmentsQuery.refetch();
                  }}
                >
                  {t('retry', { defaultValue: 'Try again' })}
                </Button>
              </div>
            )}

            {/* FAILURE PATH TWO — loaded, and there is nothing to assign to. */}
            {ready3 && projectsQuery.data.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('noProjectsToAssign', {
                  defaultValue:
                    'There are no projects yet. A vessel is assigned to a project, so create a project first.',
                })}
              </p>
            )}

            {ready3 && projectsQuery.data.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('projectCode', { defaultValue: 'Code' })}</TableHead>
                      <TableHead>
                        {t('contractSubject', { defaultValue: 'Contract subject' })}
                      </TableHead>
                      <TableHead>{t('vessel', { defaultValue: 'Vessel' })}</TableHead>
                      <TableHead>
                        {t('assignmentDate', { defaultValue: 'Assigned' })}
                      </TableHead>
                      <TableHead>
                        {t('releaseDate', { defaultValue: 'Released' })}
                      </TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectsQuery.data.map((p) => {
                      const assignment = assignmentByProject.get(p.id);
                      const vessel = assignment
                        ? vesselById.get(assignment.vesselId)
                        : undefined;
                      return (
                        <TableRow key={p.id}>
                          <TableCell>{p.projectCode}</TableCell>
                          <TableCell>{p.contractSubject}</TableCell>
                          <TableCell>
                            {assignment ? (
                              vessel ? (
                                `${vessel.vesselCode} — ${vessel.name}`
                              ) : (
                                // The row points at a vessel that is not there.
                                // Named rather than rendered as a blank cell.
                                <Badge variant="destructive">
                                  {t('vesselMissing', {
                                    defaultValue: 'Vessel not found',
                                  })}
                                </Badge>
                              )
                            ) : (
                              <Badge variant="outline">
                                {t('notAssigned', { defaultValue: 'Not assigned' })}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{assignment?.assignmentDate ?? '—'}</TableCell>
                          <TableCell>{assignment?.releaseDate ?? '—'}</TableCell>
                          <TableCell>
                            {assignment ? (
                              <Button asChild variant="outline">
                                <Link
                                  href={`/admin/vessel-assignments/edit?projectId=${p.id}`}
                                >
                                  {t('correct', { defaultValue: 'Correct' })}
                                </Link>
                              </Button>
                            ) : (
                              <Button asChild variant="primary">
                                <Link
                                  href={`/admin/vessel-assignments/assign?projectId=${p.id}`}
                                >
                                  {t('assign', { defaultValue: 'Assign' })}
                                </Link>
                              </Button>
                            )}
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
