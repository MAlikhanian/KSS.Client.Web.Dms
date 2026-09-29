'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Toolbar, ToolbarHeading, ToolbarTitle } from '@/components/common/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { createMonthlyVolumeCorrection, listProjects } from '@/lib/dms/store';
import { parseOptionalNumber } from '../../../_lib/digits';
import { useDmsActor } from '../../../_lib/use-dms-actor';
import {
  CorrectionFields,
  currentJalaliMonth,
  draftProblems,
  useCorrectionErrorText,
  WHOLE_PROJECT,
  type CorrectionDraft,
} from '../components/correction-fields';

/** Enter one month's corrected cumulative volume for a project. */
export function CreateMonthlyVolumeCorrectionContent() {
  const { t } = useTranslation('dms');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { actor, ready } = useDmsActor('ProjectControl');
  const projectId = useSearchParams().get('projectId') ?? '';
  const errorText = useCorrectionErrorText();
  const now = currentJalaliMonth();

  const [draft, setDraft] = useState<CorrectionDraft>({
    subprojectId: WHOLE_PROJECT,
    jalaliYear: String(now.year),
    jalaliMonth: String(now.month),
    volume: '',
    notes: '',
  });
  const [touched, setTouched] = useState(false);
  const problems = draftProblems(draft, parseOptionalNumber);
  const valid = Object.keys(problems).length === 0;

  const projectsQuery = useQuery({
    queryKey: ['dms', 'projects'],
    queryFn: () => listProjects({}),
    enabled: ready,
  });
  const project = (projectsQuery.data ?? []).find((p) => p.id === projectId);

  const mutation = useMutation({
    mutationFn: () => {
      if (!actor) throw new Error('Not ready');
      const notes = draft.notes.trim();
      return createMonthlyVolumeCorrection({
        projectId,
        subprojectId: draft.subprojectId === WHOLE_PROJECT ? undefined : draft.subprojectId,
        jalaliYear: parseOptionalNumber(draft.jalaliYear)!,
        jalaliMonth: parseOptionalNumber(draft.jalaliMonth)!,
        correctedCumulativeVolumeM3: parseOptionalNumber(draft.volume)!,
        notes: notes === '' ? undefined : notes,
        actor,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dms', 'monthly-volume-corrections'] });
      void queryClient.invalidateQueries({ queryKey: ['dms', 'dashboard'] });
      toast.success(t('correctionSaved', { defaultValue: 'The correction has been saved.' }));
      router.push(`/admin/monthly-volume-corrections?projectId=${projectId}`);
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

  if (!projectId) {
    return (
      <Card>
        <CardContent className="py-8 space-y-2">
          <p className="text-sm text-muted-foreground">
            {t('correctionNoProject', { defaultValue: 'No project was given. Start from the corrections list.' })}
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
          <ToolbarTitle>{t('newCorrection', { defaultValue: 'New correction' })}</ToolbarTitle>
        </ToolbarHeading>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
        <Card>
          <CardHeader>
            <CardTitle>{project ? `${project.projectCode} — ${project.contractSubject}` : projectId}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CorrectionFields
              projectId={projectId}
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
                <Link href={`/admin/monthly-volume-corrections?projectId=${projectId}`}>{t('cancel', { defaultValue: 'Cancel' })}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
