'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  createStoppage,
  deleteStoppage,
  updateStoppage,
} from '@/lib/dms/mock-store';
import { isKnownStoppageCategory } from '@/lib/dms/types';
import type {
  DmsActor,
  DmsStoppage,
  ReportStatus,
} from '@/lib/dms/types';
import { StoppageForm, type StoppageDraft } from './stoppage-form';

/**
 * Section 3 — stoppages. Amber.
 *
 * `durationHours` is ENTERED data — ۲-۹ «مدت توقف | بر حسب ساعت» — so it is
 * shown as the hours it is. It is not converted here: minutes exist only inside
 * kpi.ts, and a second conversion site is exactly how a screen and a total come
 * to disagree by a factor of sixty.
 *
 * BOTH CLASSIFICATIONS ARE SHOWN, because ۲-۹ carries both and nothing in the
 * schema makes them agree. «دسته‌بندی» is free text constrained by the lookup,
 * and `is_planned` is the separate boolean §4 computes T_PD from.
 *
 * ─── EDITING IS OPTIONAL AND OFF BY DEFAULT ─────────────────────────────────
 * Without the `edit` prop this is a read-only table, which is what the
 * supervisor's approvals screen wants. With it, the operator can add, correct
 * and remove rows — and every one of those writes is refused by the STORE
 * unless the parent report is editable. The form never decides that.
 */
export function StoppagesSection({
  stoppages,
  isLoading,
  error,
  edit,
}: {
  stoppages: DmsStoppage[];
  isLoading: boolean;
  error: unknown;
  edit?: {
    reportId: string;
    reportDate: string;
    reportStatus: ReportStatus;
    actor: DmsActor;
    /** Mirrors workflow.canEditFields — a courtesy, never the control. */
    canEdit: boolean;
  };
}) {
  const { t } = useTranslation('dms');
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['dms', 'stoppages'] });
    void queryClient.invalidateQueries({ queryKey: ['dms', 'project-stoppages'] });
  };

  const createMutation = useMutation({
    mutationFn: (draft: StoppageDraft) => {
      if (!edit) throw new Error('Not editable');
      return createStoppage({
        reportId: edit.reportId,
        stoppage: draft,
        actor: edit.actor,
      });
    },
    onSuccess: () => {
      setAdding(false);
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: StoppageDraft }) => {
      if (!edit) throw new Error('Not editable');
      return updateStoppage({ id, patch: draft, actor: edit.actor });
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!edit) throw new Error('Not editable');
      return deleteStoppage({ id, actor: edit.actor });
    },
    onSuccess: invalidate,
  });

  const describe = (e: unknown) =>
    isDmsError(e) ? `${e.message} (${e.code})` : undefined;

  const editingRow = stoppages.find((row) => row.id === editingId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
            3
          </span>
          {t('stoppagesTitle', { defaultValue: 'Stoppages' })}
          <Badge variant="outline">{stoppages.length}</Badge>
          {edit?.canEdit && !adding && !editingId && (
            <Button
              variant="outline"
              className="ms-auto"
              onClick={() => setAdding(true)}
            >
              {t('addStoppage', { defaultValue: 'Add stoppage' })}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/*
          THE LOCK IS EXPLAINED, NOT JUST ENFORCED. An operator who opens a
          submitted or approved day should see WHY the controls are absent
          rather than finding buttons that do nothing — a refusal nobody can
          reach is indistinguishable from a missing feature.
        */}
        {edit && !edit.canEdit && (
          <p className="text-sm text-muted-foreground">
            {edit.reportStatus === 'Approved'
              ? t('lockedApproved', {
                  defaultValue:
                    'This day is approved and permanently locked. Its stoppages are part of the KPI figures and can no longer be changed.',
                })
              : t('lockedSubmitted', {
                  defaultValue:
                    'This day has been submitted and is with the vessel supervisor. It can be changed again only if it is sent back.',
                })}
          </p>
        )}

        {isLoading && (
          <p className="text-sm text-muted-foreground">
            {t('loading', { defaultValue: 'Loading…' })}
          </p>
        )}

        {!!error && (
          <p className="text-sm text-destructive">
            {describe(error) ??
              t('stoppagesLoadFailed', {
                defaultValue: 'Stoppages could not be loaded.',
              })}
          </p>
        )}

        {adding && edit && (
          <StoppageForm
            reportDate={edit.reportDate}
            isSaving={createMutation.isPending}
            errorText={describe(createMutation.error)}
            onCancel={() => {
              setAdding(false);
              createMutation.reset();
            }}
            onSubmit={(draft) => createMutation.mutate(draft)}
          />
        )}

        {editingRow && edit && (
          <StoppageForm
            initial={editingRow}
            reportDate={edit.reportDate}
            isSaving={updateMutation.isPending}
            errorText={describe(updateMutation.error)}
            onCancel={() => {
              setEditingId(null);
              updateMutation.reset();
            }}
            onSubmit={(draft) =>
              updateMutation.mutate({ id: editingRow.id, draft })
            }
          />
        )}

        {deleteMutation.isError && (
          <p className="text-sm text-destructive">
            {describe(deleteMutation.error) ??
              t('stoppageDeleteFailed', {
                defaultValue: 'The stoppage could not be removed.',
              })}
          </p>
        )}

        {!isLoading && !error && stoppages.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">
            {t('stoppagesEmpty', {
              defaultValue: 'No stoppages recorded for this day.',
            })}
          </p>
        )}

        {!isLoading && !error && stoppages.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('stoppageCode', { defaultValue: 'Code' })}</TableHead>
                  <TableHead>{t('category', { defaultValue: 'Category' })}</TableHead>
                  <TableHead>{t('planned', { defaultValue: 'Planned' })}</TableHead>
                  <TableHead>{t('time', { defaultValue: 'Time' })}</TableHead>
                  <TableHead>
                    {t('durationHours', { defaultValue: 'Duration (hours)' })}
                  </TableHead>
                  <TableHead>
                    {t('responsibleParty', { defaultValue: 'Responsible' })}
                  </TableHead>
                  {edit?.canEdit && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {stoppages.map((s) => {
                  const known = isKnownStoppageCategory(s.category);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{s.stoppageCode}</TableCell>
                      <TableCell>
                        <span>{s.category}</span>
                        {!known && (
                          <Badge variant="warning" className="ms-2">
                            {t('categoryUnrecognised', {
                              defaultValue: 'Unrecognised',
                            })}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.isPlanned
                          ? t('yes', { defaultValue: 'Yes' })
                          : t('no', { defaultValue: 'No' })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {s.startTime} → {s.endTime}
                      </TableCell>
                      <TableCell>{s.durationHours}</TableCell>
                      <TableCell>{s.responsibleParty ?? '—'}</TableCell>
                      {edit?.canEdit && (
                        <TableCell className="whitespace-nowrap">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setAdding(false);
                              setEditingId(s.id);
                            }}
                          >
                            {t('edit', { defaultValue: 'Edit' })}
                          </Button>{' '}
                          <Button
                            variant="destructive"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(s.id)}
                          >
                            {t('remove', { defaultValue: 'Remove' })}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
