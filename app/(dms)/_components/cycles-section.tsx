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
// Per-row helper only. `computeIntermediateTotals` is banned in this tree by
// the zone's eslint config: §4 names five KPIs and defines none of them, so no
// aggregate reaches a screen until those definitions are settled.
import { minutesBetween } from '@/lib/dms/kpi';
import { createCycle, deleteCycle, updateCycle } from '@/lib/dms/mock-store';
import type { DmsActor, DmsCycle, ReportStatus } from '@/lib/dms/types';
import { CycleForm, type CycleDraft } from './cycle-form';
import { formatMinutes } from '../_lib/report-status';

/**
 * Section 2 — cycles. Sky.
 *
 * ۲-۸ gives a cycle EIGHT timestamps and no duration column, so each of the
 * four phases is derived. A per-row duration is shown beside the two times it
 * came from, which is arithmetic the reader can check on the same line.
 *
 * DELIBERATELY NO COLUMN TOTALS. A column of numbers wants a total, and a
 * total here would be T_OP — an aggregate whose definition is not the open
 * question, but which belongs to the same set as the two that are. The rule
 * banning the aggregate import is what keeps that from arriving by accident.
 */
export function CyclesSection({
  cycles,
  isLoading,
  error,
  edit,
}: {
  cycles: DmsCycle[];
  isLoading: boolean;
  error: unknown;
  /**
   * Absent on the supervisor's review screen, which stays read-only. Present
   * for the operator — and `canEdit` only mirrors the workflow: every write is
   * refused independently by the store through `requireEditableReport`.
   */
  edit?: {
    reportId: string;
    reportDate: string;
    reportStatus: ReportStatus;
    actor: DmsActor;
    canEdit: boolean;
  };
}) {
  const { t } = useTranslation('dms');
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['dms', 'cycles'] });
    void queryClient.invalidateQueries({ queryKey: ['dms', 'project-cycles'] });
  };

  const createMutation = useMutation({
    mutationFn: (draft: CycleDraft) => {
      if (!edit) throw new Error('Not editable');
      return createCycle({ reportId: edit.reportId, cycle: draft, actor: edit.actor });
    },
    onSuccess: () => {
      setAdding(false);
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: CycleDraft }) => {
      if (!edit) throw new Error('Not editable');
      return updateCycle({ id, patch: draft, actor: edit.actor });
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!edit) throw new Error('Not editable');
      return deleteCycle({ id, actor: edit.actor });
    },
    onSuccess: invalidate,
  });

  const describe = (e: unknown) =>
    isDmsError(e) ? `${(e as { message: string }).message} (${(e as { code: string }).code})` : undefined;

  const editingRow = cycles.find((c) => c.id === editingId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
            2
          </span>
          {t('cyclesTitle', { defaultValue: 'Operation cycles' })}
          <Badge variant="outline">{cycles.length}</Badge>
          {edit?.canEdit && !adding && !editingId && (
            <Button
              variant="outline"
              className="ms-auto"
              onClick={() => setAdding(true)}
            >
              {t('addCycle', { defaultValue: 'Add cycle' })}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* The lock is explained rather than only enforced — see the stoppages
            section for why a refusal nobody can reach reads as a missing
            feature. */}
        {edit && !edit.canEdit && (
          <p className="text-sm text-muted-foreground">
            {edit.reportStatus === 'Approved'
              ? t('lockedApproved', {
                  defaultValue:
                    'This day is approved and permanently locked. Its cycles are part of the KPI figures and can no longer be changed.',
                })
              : t('lockedSubmitted', {
                  defaultValue:
                    'This day has been submitted and is with the vessel supervisor. It can be changed again only if it is sent back.',
                })}
          </p>
        )}

        {adding && edit && (
          <CycleForm
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
          <CycleForm
            initial={editingRow}
            reportDate={edit.reportDate}
            isSaving={updateMutation.isPending}
            errorText={describe(updateMutation.error)}
            onCancel={() => {
              setEditingId(null);
              updateMutation.reset();
            }}
            onSubmit={(draft) => updateMutation.mutate({ id: editingRow.id, draft })}
          />
        )}

        {deleteMutation.isError && (
          <p className="text-sm text-destructive">
            {describe(deleteMutation.error) ??
              t('cycleDeleteFailed', {
                defaultValue: 'The cycle could not be removed.',
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
            {isDmsError(error)
              ? `${error.message} (${error.code})`
              : t('cyclesLoadFailed', {
                  defaultValue: 'Cycles could not be loaded.',
                })}
          </p>
        )}

        {!isLoading && !error && cycles.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t('cyclesEmpty', {
              defaultValue: 'No cycles recorded for this day yet.',
            })}
          </p>
        )}

        {!isLoading && !error && cycles.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t('phaseDredging', { defaultValue: 'Dredging' })}</TableHead>
                  <TableHead>{t('phaseTransport', { defaultValue: 'Transport' })}</TableHead>
                  <TableHead>{t('phaseDischarge', { defaultValue: 'Discharge' })}</TableHead>
                  <TableHead>{t('phaseReturn', { defaultValue: 'Return' })}</TableHead>
                  <TableHead>{t('volumeM3', { defaultValue: 'Volume (m³)' })}</TableHead>
                  {edit?.canEdit && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.cycleNumber}</TableCell>
                    <PhaseCell
                      start={c.dredgingStart}
                      end={c.dredgingEnd}
                    />
                    <PhaseCell
                      start={c.transportStart}
                      end={c.transportEnd}
                    />
                    <PhaseCell
                      start={c.dischargeStart}
                      end={c.dischargeEnd}
                    />
                    <PhaseCell start={c.returnStart} end={c.returnEnd} />
                    <TableCell>{c.dredgedVolumeM3 ?? '—'}</TableCell>
                    {edit?.canEdit && (
                      <TableCell className="whitespace-nowrap">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setAdding(false);
                            setEditingId(c.id);
                          }}
                        >
                          {t('edit', { defaultValue: 'Edit' })}
                        </Button>{' '}
                        <Button
                          variant="destructive"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(c.id)}
                        >
                          {t('remove', { defaultValue: 'Remove' })}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * The two entered times, and the duration between them. Shown together on
 * purpose: the derived value is checkable against its own inputs on the row.
 */
function PhaseCell({ start, end }: { start: string; end: string }) {
  const minutes = minutesBetween(start, end);
  return (
    <TableCell>
      <div className="whitespace-nowrap">
        {start} → {end}
      </div>
      <div className="text-xs text-muted-foreground">
        {formatMinutes(minutes)}
      </div>
    </TableCell>
  );
}
