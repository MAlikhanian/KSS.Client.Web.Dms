'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError, type DmsError } from '@/lib/dms/errors';
import {
  assignVesselToProject,
  listProjects,
  listVessels,
} from '@/lib/dms/mock-store';
import { useDmsActor } from '../../../_lib/use-dms-actor';

/**
 * Assign a vessel to a project — ۲-۴.
 *
 * ─── THE PROJECT LIST IS NOT FILTERED, AND THAT IS THE POINT ────────────────
 * Every project is offered here, including ones that already have a vessel.
 * Choosing one and submitting produces the store's `Conflict` / 409, rendered
 * below with ۲-۴'s UNIQUE named in it.
 *
 * Filtering the list, or disabling the button, would prevent the attempt — and
 * a control the user never meets is indistinguishable from one that is not
 * there. The refusal has to be reachable by the ordinary sequence: pick a
 * project that has a vessel, try to give it another, read why you cannot.
 *
 * ─── AND THERE IS NO SWAP ───────────────────────────────────────────────────
 * Not "no swap button" — no swap. `project_id` is FK UNIQUE, so the model
 * admits one row per project for its whole life. A mistake is fixed by
 * correcting that row; the end of a vessel's work is a `release_date` on it.
 * Neither produces a second row, and neither is a handover to another vessel.
 */
export function AssignVesselContent() {
  const { t } = useTranslation('dms');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { actor, ready } = useDmsActor();
  const searchParams = useSearchParams();

  const [projectId, setProjectId] = useState('');
  const [vesselId, setVesselId] = useState('');
  const [assignmentDate, setAssignmentDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  // Prefilled when arriving from an unassigned row; still changeable here.
  useEffect(() => {
    const fromQuery = searchParams.get('projectId');
    if (fromQuery) setProjectId(fromQuery);
  }, [searchParams]);

  const projectsQuery = useQuery({
    queryKey: ['dms', 'projects'],
    queryFn: () => listProjects({}),
    enabled: ready,
    retry: false,
  });

  const vesselsQuery = useQuery({
    queryKey: ['dms', 'vessels', ''],
    queryFn: () => listVessels({}),
    enabled: ready,
    retry: false,
  });

  const assignMutation = useMutation({
    mutationFn: () => {
      if (!actor) throw new Error('No actor');
      return assignVesselToProject({
        projectId,
        vesselId,
        assignmentDate,
        actor,
      });
    },
    onSuccess: () => {
      toast.success(
        t('vesselAssigned', { defaultValue: 'Vessel assigned to project' }),
      );
      void queryClient.invalidateQueries({ queryKey: ['dms', 'vessel-assignments'] });
      void queryClient.invalidateQueries({ queryKey: ['dms', 'project-vessel'] });
      router.push('/admin/vessel-assignments');
    },
    // No toast on error: a Conflict here is not a transient failure to
    // acknowledge and dismiss, it is the model explaining itself. It is
    // rendered in place, below, where it stays on screen to be read.
  });

  const isValid =
    projectId.length > 0 && vesselId.length > 0 && assignmentDate.length > 0;

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
          <CardContent className="py-8">
            <h2 className="font-semibold">
              {t('projectControlOnlyTitle', {
                defaultValue: 'This screen belongs to the Project Control role',
              })}
            </h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  const conflict =
    assignMutation.isError && isDmsError(assignMutation.error)
      ? (assignMutation.error as DmsError)
      : null;

  return (
    <div className="grid gap-5 lg:gap-7.5">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>
            {t('assignAVessel', { defaultValue: 'Assign a vessel' })}
          </ToolbarTitle>
        </ToolbarHeading>
      </Toolbar>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('assignmentTitle', { defaultValue: 'Vessel assignment' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('assignExplain', {
              defaultValue:
                'A project has exactly one vessel for its whole life. If the project already has one, this will be refused — correct the existing record instead.',
            })}
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium block" htmlFor="assign-project">
              {t('project', { defaultValue: 'Project' })}{' '}
              <span className="text-destructive">*</span>
            </label>
            <Select
              value={projectId || undefined}
              onValueChange={(value) => {
                setProjectId(value);
                assignMutation.reset();
              }}
            >
              <SelectTrigger id="assign-project" className="w-full">
                <SelectValue
                  placeholder={t('selectProject', {
                    defaultValue: 'Select a project…',
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {projectsQuery.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.projectCode} — {p.contractSubject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium block" htmlFor="assign-vessel">
              {t('vessel', { defaultValue: 'Vessel' })}{' '}
              <span className="text-destructive">*</span>
            </label>
            <Select
              value={vesselId || undefined}
              onValueChange={(value) => {
                setVesselId(value);
                assignMutation.reset();
              }}
            >
              <SelectTrigger id="assign-vessel" className="w-full">
                <SelectValue
                  placeholder={t('selectVessel', {
                    defaultValue: 'Select a vessel…',
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {vesselsQuery.data?.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.vesselCode} — {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium block" htmlFor="assign-date">
              {t('assignmentDate', { defaultValue: 'Assignment date' })}{' '}
              <span className="text-destructive">*</span>
            </label>
            {/* ۲-۴ «تاریخ تخصیص شناور به پروژه» */}
            <Input
              id="assign-date"
              type="date"
              className="w-auto"
              value={assignmentDate}
              onChange={(e) => setAssignmentDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/*
        THE REFUSAL, RENDERED. Red-bordered, in place, carrying the store's own
        message — which names ۲-۴'s UNIQUE constraint — plus the route to the
        thing the user should do instead.
      */}
      {assignMutation.isError && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
          <Card>
            <CardContent className="py-6 space-y-3">
              <h2 className="font-semibold">
                {conflict?.code === 'Conflict'
                  ? t('assignRefusedTitle', {
                      defaultValue: 'This project already has a vessel',
                    })
                  : t('assignFailedTitle', {
                      defaultValue: 'The assignment could not be made',
                    })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {conflict
                  ? `${conflict.message} (${conflict.code})`
                  : t('assignFailedBody', {
                      defaultValue: 'The assignment could not be made.',
                    })}
              </p>
              {conflict?.code === 'Conflict' && (
                <>
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
                    {t('assignRefusedExplain', {
                      defaultValue:
                        'The one-to-one is part of the model, not a rule this screen applies: a project has one assignment record for its whole life. There is no reassignment — correct that record, or record a release date on it.',
                    })}
                  </p>
                  <Button asChild variant="outline">
                    <Link
                      href={`/admin/vessel-assignments/edit?projectId=${projectId}`}
                    >
                      {t('correctExisting', {
                        defaultValue: 'Correct the existing assignment',
                      })}
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="py-4 flex items-center gap-2">
          <Button
            variant="primary"
            disabled={assignMutation.isPending || !isValid}
            onClick={() => assignMutation.mutate()}
          >
            {assignMutation.isPending
              ? t('assigning', { defaultValue: 'Assigning…' })
              : t('assign', { defaultValue: 'Assign' })}
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/vessel-assignments">
              {t('cancel', { defaultValue: 'Cancel' })}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
