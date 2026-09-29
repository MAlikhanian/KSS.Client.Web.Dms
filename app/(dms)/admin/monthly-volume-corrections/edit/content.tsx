'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Toolbar, ToolbarHeading, ToolbarTitle } from '@/components/common/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError } from '@/lib/dms/errors';
import { getMonthlyVolumeCorrection, listProjects, updateMonthlyVolumeCorrection } from '@/lib/dms/store';
import { parseOptionalNumber } from '../../../_lib/digits';
import { useDmsActor } from '../../../_lib/use-dms-actor';
import {
  CorrectionFields,
  draftProblems,
  useCorrectionErrorText,
  WHOLE_PROJECT,
  type CorrectionDraft,
} from '../components/correction-fields';

/**
 * Correct one month's figure. The PROJECT is the row's identity and cannot be
 * changed here; the subproject, year, month, volume and notes can, and the
 * service re-checks that the month is still free for the result.
 */
export function EditMonthlyVolumeCorrectionContent() {
  const { t } = useTranslation('dms');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { actor, ready } = useDmsActor('ProjectControl');
  const id = useSearchParams().get('id');
  const errorText = useCorrectionErrorText();

  const [draft, setDraft] = useState<CorrectionDraft | null>(null);
  const [touched, setTouched] = useState(false);

  const rowQuery = useQuery({
    queryKey: ['dms', 'monthly-volume-correction', id],
    queryFn: () => getMonthlyVolumeCorrection({ id: id! }),
    enabled: ready && !!id,
    retry: false,
  });
  const row = rowQuery.data;

  const projectsQuery = useQuery({
    queryKey: ['dms', 'projects'],
    queryFn: () => listProjects({}),
    enabled: ready,
  });
  const project = row ? (projectsQuery.data ?? []).find((p) => p.id === row.projectId) : undefined;

  useEffect(() => {
    if (row && draft === null) {
      setDraft({
        subprojectId: row.subprojectId ?? WHOLE_PROJECT,
        jalaliYear: String(row.jalaliYear),
        jalaliMonth: String(row.jalaliMonth),
        volume: String(row.correctedCumulativeVolumeM3),
        notes: row.notes ?? '',
      });
    }
  }, [row, draft]);

  const problems = draft ? draftProblems(draft, parseOptionalNumber) : {};
  const valid = Object.keys(problems).length === 0;
  const backHref = row
    ? `/admin/monthly-volume-corrections?projectId=${row.projectId}`
    : '/admin/monthly-volume-corrections';

  const mutation = useMutation({
    mutationFn: () => {
      if (!actor || !row || !draft) throw new Error('Not ready');
      const notes = draft.notes.trim();
      return updateMonthlyVolumeCorrection({
        id: row.id,
        patch: {
          // `undefined` is sent as null: back to a whole-project figure, or no notes.
          subprojectId: draft.subprojectId === WHOLE_PROJECT ? undefined : draft.subprojectId,
          jalaliYear: parseOptionalNumber(draft.jalaliYear)!,
          jalaliMonth: parseOptionalNumber(draft.jalaliMonth)!,
          correctedCumulativeVolumeM3: parseOptionalNumber(draft.volume)!,
          notes: notes === '' ? undefined : notes,
        },
        actor,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dms', 'monthly-volume-corrections'] });
      void queryClient.invalidateQueries({ queryKey: ['dms', 'monthly-volume-correction'] });
      void queryClient.invalidateQueries({ queryKey: ['dms', 'dashboard'] });
      toast.success(t('correctionSaved', { defaultValue: 'The correction has been saved.' }));
      router.push(backHref);
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
                  'Head office defines projects, vessels and personnel. Your account does not hold this role.',
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
            {t('noCorrectionSelected', { defaultValue: 'No correction was given to edit.' })}
          </p>
          <Button asChild variant="outline">
            <Link href="/admin/monthly-volume-corrections">
              {t('backToCorrections', { defaultValue: 'Back to corrections' })}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>{t('editCorrectionTitle', { defaultValue: 'Edit correction' })}</ToolbarTitle>
        </ToolbarHeading>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
        <Card>
          <CardHeader>
            <CardTitle>
              {project ? `${project.projectCode} — ${project.contractSubject}` : (row?.projectId ?? '')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rowQuery.isLoading && (
              <p className="text-sm text-muted-foreground">{t('loading', { defaultValue: 'Loading…' })}</p>
            )}

            {rowQuery.isError && (
              <p className="text-sm text-destructive">
                {isDmsError(rowQuery.error) && rowQuery.error.code === 'NotFound'
                  ? t('correctionNotFound', {
                      defaultValue: 'That correction no longer exists. It may have been removed on another tab.',
                    })
                  : isDmsError(rowQuery.error)
                    ? `${rowQuery.error.message} (${rowQuery.error.code})`
                    : t('correctionLoadFailed', { defaultValue: 'The correction could not be loaded.' })}
              </p>
            )}

            {row && draft && (
              <>
                <CorrectionFields
                  projectId={row.projectId}
                  draft={draft}
                  onChange={setDraft}
                  problems={touched ? problems : {}}
                />

                {mutation.isError && <p className="text-sm text-destructive">{errorText(mutation.error)}</p>}

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    disabled={mutation.isPending}
                    onClick={() => {
                      setTouched(true);
                      if (valid) mutation.mutate();
                    }}
                  >
                    {t('save', { defaultValue: 'Save' })}
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={backHref}>{t('cancel', { defaultValue: 'Cancel' })}</Link>
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
