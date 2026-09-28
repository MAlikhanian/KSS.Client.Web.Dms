'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError } from '@/lib/dms/errors';
import {
  listCyclesForReport,
  listProjects,
  listReports,
  listStoppagesForReport,
} from '@/lib/dms/mock-store';
import { CyclesSection, StoppagesSection } from '../_components';
import { STATUS_BADGE } from '../_lib/report-status';
import { useDmsActor } from '../_lib/use-dms-actor';
import { DecisionSection } from './components';

/**
 * Supervisor screen — §1: «مشاهده گزارش روزانه ثبت‌شده توسط اپراتور، تایید
 * نهایی گزارش یا رد آن جهت اصلاح توسط اپراتور به همراه درج علت رد».
 *
 * The review list is Submitted days only, because that is the one status §3
 * makes reviewable. Draft is the operator's, Approved is permanently locked,
 * and Rejected is back with the operator.
 */
export function ApprovalsContent() {
  const { t } = useTranslation('dms');
  const { actor, ready } = useDmsActor();
  const [projectId, setProjectId] = useState('');
  const [openReportId, setOpenReportId] = useState<string | null>(null);

  const projectsQuery = useQuery({
    queryKey: ['dms', 'projects'],
    queryFn: () => listProjects({}),
    enabled: ready,
  });

  const pendingQuery = useQuery({
    queryKey: ['dms', 'reports', projectId, 'Submitted'],
    queryFn: () => listReports({ projectId, status: 'Submitted' }),
    enabled: !!projectId,
    retry: false,
  });

  const openReport = pendingQuery.data?.find((r) => r.id === openReportId);

  const cyclesQuery = useQuery({
    queryKey: ['dms', 'cycles', openReportId],
    queryFn: () => listCyclesForReport({ reportId: openReportId as string }),
    enabled: !!openReportId,
    retry: false,
  });

  const stoppagesQuery = useQuery({
    queryKey: ['dms', 'stoppages', openReportId],
    queryFn: () => listStoppagesForReport({ reportId: openReportId as string }),
    enabled: !!openReportId,
    retry: false,
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

  // The route guard refuses this too; a component that assumes it was guarded
  // breaks quietly the day the route moves.
  if (!actor || actor.role !== 'VesselSupervisor') {
    return (
      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
        <Card>
          <CardContent className="py-8 space-y-2">
            <h2 className="font-semibold">
              {t('supervisorOnlyTitle', {
                defaultValue: 'This screen belongs to the Vessel Supervisor role',
              })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('supervisorOnlyBody', {
                defaultValue:
                  'Only the vessel supervisor reviews a submitted day. Change role to continue.',
              })}
            </p>
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
            {t('approvalsTitle', { defaultValue: 'Approvals' })}
          </ToolbarTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <span className="text-sm text-muted-foreground">{actor.userName}</span>
        </ToolbarActions>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
        <Card>
          <CardContent className="py-4 space-y-3">
            <label className="text-sm font-medium block" htmlFor="dms-approval-project">
              {t('project', { defaultValue: 'Project' })}
            </label>
            <Select
              value={projectId || undefined}
              onValueChange={(value) => {
                setProjectId(value);
                setOpenReportId(null);
              }}
            >
              <SelectTrigger id="dms-approval-project" className="w-full">
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
          </CardContent>
        </Card>
      </div>

      {/* FAILURE PATH ONE — the store rejected. */}
      {projectId && pendingQuery.isError && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
          <Card>
            <CardContent className="py-8 space-y-3">
              <h2 className="font-semibold">
                {t('loadFailedTitle', {
                  defaultValue: 'This project’s days could not be loaded',
                })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {describeError(pendingQuery.error)}
              </p>
              <Button variant="outline" onClick={() => void pendingQuery.refetch()}>
                {t('retry', { defaultValue: 'Try again' })}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* FAILURE PATH TWO — loaded fine, nothing waiting. Not the same thing,
          and the screen says which. */}
      {projectId && pendingQuery.isSuccess && pendingQuery.data.length === 0 && (
        <Card>
          <CardContent className="py-8 space-y-2">
            <h2 className="font-semibold">
              {t('nothingPendingTitle', { defaultValue: 'Nothing to review' })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('nothingPendingBody', {
                defaultValue:
                  'No submitted days are waiting for this project.',
              })}
            </p>
          </CardContent>
        </Card>
      )}

      {projectId && pendingQuery.isSuccess && pendingQuery.data.length > 0 && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
          <Card>
            <CardContent className="py-4 space-y-3">
              <h2 className="font-medium">
                {t('pendingDays', { defaultValue: 'Days awaiting review' })}
              </h2>
              <ul className="divide-y divide-border">
                {pendingQuery.data.map((r) => (
                  <li key={r.id} className="py-2 flex items-center justify-between gap-4">
                    <span className="text-sm">{r.reportDate}</span>
                    <Badge variant={STATUS_BADGE[r.approvalStatus].variant}>
                      {t(STATUS_BADGE[r.approvalStatus].key, {
                        defaultValue: STATUS_BADGE[r.approvalStatus].fallback,
                      })}
                    </Badge>
                    <Button
                      variant={openReportId === r.id ? 'primary' : 'outline'}
                      onClick={() =>
                        setOpenReportId(openReportId === r.id ? null : r.id)
                      }
                    >
                      {t('review', { defaultValue: 'Review' })}
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {openReport && (
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
          <div className="space-y-6">
            {/* The supervisor reviews; nothing here is editable, so there is
                no fieldset to disable — the sections are read-only by being
                display-only, and the store would refuse an edit from this role
                in any case. */}
            <div className="[&_div.rounded-xl.bg-card.bg-card]:border-sky-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-sky-500!">
              <CyclesSection
                cycles={cyclesQuery.data ?? []}
                isLoading={cyclesQuery.isLoading}
                error={cyclesQuery.error}
              />
            </div>

            <div className="[&_div.rounded-xl.bg-card.bg-card]:border-amber-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-amber-500!">
              <StoppagesSection
                stoppages={stoppagesQuery.data ?? []}
                isLoading={stoppagesQuery.isLoading}
                error={stoppagesQuery.error}
              />
            </div>

            <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
              <DecisionSection
                report={openReport}
                actor={actor}
                onDecided={() => setOpenReportId(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function describeError(error: unknown): string {
  if (isDmsError(error)) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'Unknown error';
}
