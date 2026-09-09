'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Toolbar,
  ToolbarActions,
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
import { isDmsError } from '@/lib/dms/errors';
import {
  correctVesselAssignment,
  getVesselAssignment,
  listVessels,
} from '@/lib/dms/mock-store';
import { useDmsActor } from '../../../_lib/use-dms-actor';

/**
 * Correct the single assignment row — ۲-۴.
 *
 * ⚠ THIS IS A CORRECTION, NOT A SWAP, AND THE DIFFERENCE IS NOT COSMETIC.
 * `project_id` is FK UNIQUE, so there is one row per project for its whole
 * life and no assignment history exists to preserve. Changing the vessel here
 * OVERWRITES which vessel the project is recorded against — it does not end
 * one assignment and begin another, because the model has nowhere to put the
 * second. The screen says so where the field is, not only here.
 *
 * `release_date` (۲-۴ «تاریخ اتمام کار شناور در پروژه») records when that
 * vessel's work ended. It is not a handover either.
 *
 * Five fields, all flat scalars, one section, blue — "base info (flat fields)".
 */
export function EditVesselAssignmentContent() {
  const { t } = useTranslation('dms');
  const queryClient = useQueryClient();
  const { actor, ready } = useDmsActor();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [vesselId, setVesselId] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');
  const [releaseDate, setReleaseDate] = useState('');

  const assignmentQuery = useQuery({
    queryKey: ['dms', 'vessel-assignment', projectId],
    queryFn: () => getVesselAssignment({ projectId: projectId as string }),
    enabled: ready && !!projectId,
    retry: false,
  });

  const vesselsQuery = useQuery({
    queryKey: ['dms', 'vessels', ''],
    queryFn: () => listVessels({}),
    enabled: ready,
    retry: false,
  });

  useEffect(() => {
    const row = assignmentQuery.data;
    if (!row) return;
    setVesselId(row.vesselId);
    setAssignmentDate(row.assignmentDate);
    setReleaseDate(row.releaseDate ?? '');
  }, [assignmentQuery.data]);

  const correctMutation = useMutation({
    mutationFn: () => {
      if (!actor || !projectId) throw new Error('No actor or project');
      return correctVesselAssignment({
        projectId,
        vesselId,
        assignmentDate,
        // Empty means "not released", which is absent rather than a blank date.
        releaseDate: releaseDate.trim() || undefined,
        actor,
      });
    },
    onSuccess: (saved) => {
      toast.success(
        t('assignmentCorrected', { defaultValue: 'Assignment corrected' }),
      );
      queryClient.setQueryData(['dms', 'vessel-assignment', projectId], saved);
      void queryClient.invalidateQueries({ queryKey: ['dms', 'vessel-assignments'] });
      void queryClient.invalidateQueries({ queryKey: ['dms', 'project-vessel'] });
    },
    onError: (error) => {
      toast.error(
        isDmsError(error)
          ? `${error.message} (${error.code})`
          : t('correctionFailed', {
              defaultValue: 'The correction could not be saved.',
            }),
      );
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

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>
            {t('correctAssignment', { defaultValue: 'Correct vessel assignment' })}
          </ToolbarTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <Button asChild variant="outline">
            <Link href="/admin/vessel-assignments">
              {t('backToAssignments', { defaultValue: 'Back to assignments' })}
            </Link>
          </Button>
        </ToolbarActions>
      </Toolbar>

      {!projectId && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
          <Card>
            <CardContent className="py-8 space-y-3">
              <h2 className="font-semibold">
                {t('noProjectSelectedTitle', { defaultValue: 'No project selected' })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('noAssignmentProjectBody', {
                  defaultValue:
                    'Open the assignment list and choose the project whose record you want to correct.',
                })}
              </p>
              <Button asChild variant="outline">
                <Link href="/admin/vessel-assignments">
                  {t('vesselAssignmentsTitle', { defaultValue: 'Vessel assignment' })}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {projectId && assignmentQuery.isLoading && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {t('loading', { defaultValue: 'Loading…' })}
          </CardContent>
        </Card>
      )}

      {/* FAILURE PATH — no assignment for this project, or the project itself
          could not be read. NotFound is rendered as itself: under the stated
          one-to-one, a project without a vessel is a state to act on, not an
          empty form to fill in silently. */}
      {projectId && assignmentQuery.isError && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
          <Card>
            <CardContent className="py-8 space-y-3">
              <h2 className="font-semibold">
                {t('noAssignmentTitle', {
                  defaultValue: 'This project has no vessel assignment',
                })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isDmsError(assignmentQuery.error)
                  ? `${assignmentQuery.error.message} (${assignmentQuery.error.code})`
                  : t('assignmentLoadFailed', {
                      defaultValue: 'The assignment could not be loaded.',
                    })}
              </p>
              <Button asChild variant="primary">
                <Link
                  href={`/admin/vessel-assignments/assign?projectId=${projectId}`}
                >
                  {t('assignAVessel', { defaultValue: 'Assign a vessel' })}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {assignmentQuery.isSuccess && (
        <div
          className={
            '[&_div.rounded-xl.bg-card]:bg-blue-50! ' +
            '[&_div.rounded-xl.bg-card]:border-blue-100! ' +
            'dark:[&_div.rounded-xl.bg-card]:bg-blue-950/25! ' +
            'dark:[&_div.rounded-xl.bg-card]:border-blue-900! ' +
            '[&_div.rounded-xl.bg-card]:shadow-lg ' +
            '[&_div.rounded-xl.bg-card]:shadow-black/5'
          }
        >
          <fieldset
            disabled={correctMutation.isPending}
            className="space-y-6 contents"
          >
            <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                      1
                    </span>
                    {t('assignmentRecord', { defaultValue: 'Assignment record' })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium block" htmlFor="correct-vessel">
                      {t('vessel', { defaultValue: 'Vessel' })}
                    </label>
                    <Select
                      value={vesselId || undefined}
                      onValueChange={setVesselId}
                    >
                      <SelectTrigger id="correct-vessel" className="w-full">
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
                    {/* Said where the field is, not only in the header: this
                        overwrites, and nothing records what was here before. */}
                    <p className="text-xs text-muted-foreground">
                      {/*
                       * ⚠ DMS-PROVISIONAL-TERM — «تخصیص مجدد» + «تاریخچه»
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
                      {t('vesselCorrectionNote', {
                        defaultValue:
                          'Changing this corrects which vessel the project is recorded against. It is not a reassignment — there is one record per project and no history of a previous vessel.',
                      })}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium block" htmlFor="correct-assigned">
                        {t('assignmentDate', { defaultValue: 'Assignment date' })}
                      </label>
                      <Input
                        id="correct-assigned"
                        type="date"
                        value={assignmentDate}
                        onChange={(e) => setAssignmentDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium block" htmlFor="correct-released">
                        {t('releaseDate', { defaultValue: 'Release date' })}
                      </label>
                      <Input
                        id="correct-released"
                        type="date"
                        value={releaseDate}
                        onChange={(e) => setReleaseDate(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('releaseDateNote', {
                          defaultValue:
                            'When this vessel’s work on the project ended. Leave empty while the work continues. It does not hand the project to another vessel.',
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
              <Card>
                <CardContent className="py-4 flex items-center gap-2">
                  <Button
                    variant="primary"
                    disabled={correctMutation.isPending || !vesselId || !assignmentDate}
                    onClick={() => correctMutation.mutate()}
                  >
                    {correctMutation.isPending
                      ? t('saving', { defaultValue: 'Saving…' })
                      : t('save', { defaultValue: 'Save' })}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
}
