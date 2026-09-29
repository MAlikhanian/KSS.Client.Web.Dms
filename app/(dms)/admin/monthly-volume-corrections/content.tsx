'use client';

import { useState } from 'react';
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
  deleteMonthlyVolumeCorrection,
  getDashboard,
  listMonthlyVolumeCorrections,
  listProjects,
  listSubprojects,
} from '@/lib/dms/store';
import { useDmsActor } from '../../_lib/use-dms-actor';
import { useCorrectionErrorText, useFormatJalaliMonth } from './components/correction-fields';

/**
 * Monthly volume corrections: Project Control's corrected CUMULATIVE dredged
 * volume at the end of a Jalali month, from its own surveys and documents.
 *
 * Two parts on one screen, for one project at a time:
 *   1. the entries themselves (list, create, edit, remove);
 *   2. the comparison with the operators' reported volume. That comparison is
 *      computed by the SERVICE (GET dashboard for one project) from APPROVED
 *      cycles only; nothing here re-derives it. It covers WHOLE-PROJECT
 *      figures only, so a per-subproject row appears in (1) and not in (2).
 */
export function MonthlyVolumeCorrectionsContent() {
  const { t, i18n } = useTranslation('dms');
  const queryClient = useQueryClient();
  const { actor, ready } = useDmsActor('ProjectControl');
  // Returning from create or edit lands back on the same project.
  const [projectId, setProjectId] = useState(useSearchParams().get('projectId') ?? '');
  const formatMonth = useFormatJalaliMonth();
  const errorText = useCorrectionErrorText();
  const number = (value: number) =>
    new Intl.NumberFormat(i18n.language === 'en' ? 'en-US' : 'fa-IR', { maximumFractionDigits: 2 }).format(value);

  const projectsQuery = useQuery({
    queryKey: ['dms', 'projects'],
    queryFn: () => listProjects({}),
    enabled: ready,
  });

  const correctionsQuery = useQuery({
    queryKey: ['dms', 'monthly-volume-corrections', projectId],
    queryFn: () => listMonthlyVolumeCorrections({ projectId }),
    enabled: !!projectId,
    retry: false,
  });

  const subprojectsQuery = useQuery({
    queryKey: ['dms', 'subprojects', projectId, ''],
    queryFn: () => listSubprojects({ projectId }),
    enabled: !!projectId,
    retry: false,
  });

  const comparisonQuery = useQuery({
    queryKey: ['dms', 'dashboard', 'volume-corrections', projectId],
    queryFn: () => getDashboard({ projectId }),
    enabled: !!projectId,
    retry: false,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => {
      if (!actor) throw new Error('Not ready');
      return deleteMonthlyVolumeCorrection({ id, actor });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dms', 'monthly-volume-corrections'] });
      void queryClient.invalidateQueries({ queryKey: ['dms', 'dashboard'] });
      toast.success(t('correctionRemoved', { defaultValue: 'The correction has been removed.' }));
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

  const subprojectLabel = (id?: string) => {
    if (!id) return t('correctionWholeProject', { defaultValue: 'The whole project' });
    const s = (subprojectsQuery.data ?? []).find((x) => x.id === id);
    return s ? `${s.subprojectCode} — ${s.title}` : id;
  };

  const comparison = comparisonQuery.data;
  const excluded = comparison?.excluded.find((e) => e.projectId === projectId);

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>
            {t('monthlyVolumeCorrectionsTitle', { defaultValue: 'Corrected dredging volume (monthly)' })}
          </ToolbarTitle>
        </ToolbarHeading>
        <ToolbarActions>
          {projectId && (
            <Button asChild variant="primary">
              <Link href={`/admin/monthly-volume-corrections/create?projectId=${projectId}`}>
                {t('newCorrection', { defaultValue: 'New correction' })}
              </Link>
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
        <Card>
          <CardContent className="py-4 space-y-4">
            <label className="text-sm font-medium block" htmlFor="dms-mvc-project">
              {t('project', { defaultValue: 'Project' })}
            </label>
            <Select value={projectId || undefined} onValueChange={(value) => setProjectId(value)}>
              <SelectTrigger id="dms-mvc-project" className="w-full">
                <SelectValue placeholder={t('selectProject', { defaultValue: 'Select a project…' })} />
              </SelectTrigger>
              <SelectContent>
                {projectsQuery.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.projectCode} — {p.contractSubject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!projectId && (
              <p className="text-sm text-muted-foreground">
                {t('correctionsChooseProject', {
                  defaultValue: 'Choose a project above to see and enter its monthly figures.',
                })}
              </p>
            )}

            {projectId && correctionsQuery.isLoading && (
              <p className="text-sm text-muted-foreground">{t('loading', { defaultValue: 'Loading…' })}</p>
            )}

            {/* FAILURE PATH ONE: the load failed. */}
            {projectId && correctionsQuery.isError && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  {isDmsError(correctionsQuery.error)
                    ? `${correctionsQuery.error.message} (${correctionsQuery.error.code})`
                    : t('correctionsLoadFailed', { defaultValue: 'The corrections could not be loaded.' })}
                </p>
                <Button variant="outline" onClick={() => void correctionsQuery.refetch()}>
                  {t('retry', { defaultValue: 'Try again' })}
                </Button>
              </div>
            )}

            {/* FAILURE PATH TWO: loaded fine, nothing there. */}
            {projectId && correctionsQuery.isSuccess && correctionsQuery.data.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('correctionsEmpty', {
                  defaultValue: 'This project has no corrected monthly figures yet. Enter the first one.',
                })}
              </p>
            )}

            {removeMutation.isError && (
              <p className="text-sm text-destructive">{errorText(removeMutation.error)}</p>
            )}

            {projectId && correctionsQuery.isSuccess && correctionsQuery.data.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('jalaliMonth', { defaultValue: 'Month' })}</TableHead>
                      <TableHead>{t('subproject', { defaultValue: 'Subproject' })}</TableHead>
                      <TableHead>
                        {t('correctedCumulativeVolumeShort', { defaultValue: 'Corrected cumulative volume (m³)' })}
                      </TableHead>
                      <TableHead>{t('notes', { defaultValue: 'Notes' })}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {correctionsQuery.data.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{formatMonth(c.jalaliYear, c.jalaliMonth)}</TableCell>
                        <TableCell>{subprojectLabel(c.subprojectId)}</TableCell>
                        <TableCell>{number(c.correctedCumulativeVolumeM3)}</TableCell>
                        <TableCell>{c.notes ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button asChild variant="outline">
                              <Link href={`/admin/monthly-volume-corrections/edit?id=${c.id}`}>
                                {t('edit', { defaultValue: 'Edit' })}
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              disabled={removeMutation.isPending}
                              onClick={() => removeMutation.mutate(c.id)}
                            >
                              {t('remove', { defaultValue: 'Remove' })}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {projectId && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
          <Card>
            <CardHeader>
              <CardTitle>
                {t('correctionComparisonTitle', { defaultValue: 'Reported volume against the corrected figure' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('correctionComparisonBody', {
                  defaultValue:
                    'For each month with a whole-project correction: the cumulative volume from the operators’ approved reports, the corrected figure, and the difference (corrected minus reported). Computed by the service.',
                })}
              </p>

              {comparisonQuery.isLoading && (
                <p className="text-sm text-muted-foreground">{t('loading', { defaultValue: 'Loading…' })}</p>
              )}

              {comparisonQuery.isError && (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">
                    {isDmsError(comparisonQuery.error)
                      ? `${comparisonQuery.error.message} (${comparisonQuery.error.code})`
                      : t('correctionComparisonFailed', { defaultValue: 'The comparison could not be loaded.' })}
                  </p>
                  <Button variant="outline" onClick={() => void comparisonQuery.refetch()}>
                    {t('retry', { defaultValue: 'Try again' })}
                  </Button>
                </div>
              )}

              {comparison && excluded && (
                <p className="text-sm text-muted-foreground">
                  {t('correctionComparisonExcluded', {
                    defaultValue: 'The service left this project out of its figures ({{code}}).',
                    code: excluded.code,
                  })}
                </p>
              )}

              {comparison && !excluded && comparison.volumeCorrections.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('correctionComparisonEmpty', {
                    defaultValue: 'There is nothing to compare yet: this project has no whole-project correction.',
                  })}
                </p>
              )}

              {comparison && !excluded && comparison.volumeCorrections.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('jalaliMonth', { defaultValue: 'Month' })}</TableHead>
                        <TableHead>
                          {t('reportedCumulativeVolume', { defaultValue: 'Reported cumulative (m³)' })}
                        </TableHead>
                        <TableHead>
                          {t('correctedCumulativeVolumeShort', { defaultValue: 'Corrected cumulative volume (m³)' })}
                        </TableHead>
                        <TableHead>{t('volumeDifference', { defaultValue: 'Difference (m³)' })}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison.volumeCorrections.map((r) => (
                        <TableRow key={`${r.jalaliYear}-${r.jalaliMonth}`}>
                          <TableCell>{formatMonth(r.jalaliYear, r.jalaliMonth)}</TableCell>
                          <TableCell>{number(r.estimatedCumulativeVolumeM3)}</TableCell>
                          <TableCell>{number(r.correctedCumulativeVolumeM3)}</TableCell>
                          <TableCell dir="ltr" className="text-end">
                            {r.differenceM3 > 0 ? '+' : ''}
                            {number(r.differenceM3)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
