'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  createReport,
  listProjects,
  listReports,
} from '@/lib/dms/mock-store';
import type { DmsDailyOperationReport } from '@/lib/dms/types';
import { useDmsActor } from '../_lib/use-dms-actor';
import { DailyReportForm } from './components';

/**
 * Operator screen — §1: «ثبت گزارش روزانه، چرخه‌های عملیاتی و توقفات مربوط به
 * شناورِ تخصیص‌یافته به پروژه خود. امکان ویرایش اطلاعات تا پیش از ارسال».
 *
 * THE FAILURE PATHS ARE BUILT HERE, NOT LATER. The seeded project that fails
 * to load and the project with no days both render as themselves — a UI whose
 * only path is the happy one gets its error states written under pressure, and
 * by then they are the least-tested code in the app.
 */
export function DailyReportContent() {
  const { t } = useTranslation('dms');
  const queryClient = useQueryClient();
  const { actor, ready } = useDmsActor();
  const [projectId, setProjectId] = useState<string>('');
  const [openReportId, setOpenReportId] = useState<string | null>(null);

  const projectsQuery = useQuery({
    queryKey: ['dms', 'projects'],
    queryFn: () => listProjects({}),
    enabled: ready,
  });

  const reportsQuery = useQuery({
    queryKey: ['dms', 'reports', projectId],
    queryFn: () => listReports({ projectId }),
    enabled: !!projectId,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (reportDate: string) => {
      if (!actor) throw new Error('No actor');
      return createReport({ projectId, reportDate, actor });
    },
    onSuccess: (created) => {
      setOpenReportId(created.id);
      void queryClient.invalidateQueries({ queryKey: ['dms', 'reports', projectId] });
    },
  });

  if (!ready) {
    return <LoadingCard label={t('loading', { defaultValue: 'Loading…' })} />;
  }

  // The route guard already refuses this, but a component that assumes it was
  // guarded is a component that breaks quietly the day the route moves.
  if (!actor || actor.role !== 'Operator') {
    return (
      <NoticeCard
        tone="red"
        title={t('operatorOnlyTitle', {
          defaultValue: 'This screen belongs to the Operator role',
        })}
        body={t('operatorOnlyBody', {
          defaultValue:
            'Only the vessel operator enters a daily report. Change role to continue.',
        })}
      />
    );
  }

  const openReport: DmsDailyOperationReport | undefined =
    reportsQuery.data?.find((r) => r.id === openReportId);

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>
            {t('dailyReportTitle', { defaultValue: 'Daily operation report' })}
          </ToolbarTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <span className="text-sm text-muted-foreground">{actor.userName}</span>
        </ToolbarActions>
      </Toolbar>

      {/* Title card outside the tint wrapper. */}
      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
        <Card>
          <CardContent className="py-4 space-y-3">
            <label className="text-sm font-medium block" htmlFor="dms-project">
              {t('project', { defaultValue: 'Project' })}
            </label>
            {/* Radix rejects an empty string as a SelectItem value, so the
                "nothing chosen" state is `undefined` plus a placeholder rather
                than a blank option row. */}
            <Select
              value={projectId || undefined}
              onValueChange={(value) => {
                setProjectId(value);
                setOpenReportId(null);
              }}
            >
              <SelectTrigger id="dms-project" className="w-full">
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
            {projectsQuery.isError && (
              <p className="text-sm text-destructive">
                {describeError(projectsQuery.error)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {!projectId && (
        <NoticeCard
          tone="black"
          title={t('noProjectTitle', { defaultValue: 'No project selected' })}
          body={t('noProjectBody', {
            defaultValue: 'Choose a project above to see its days.',
          })}
        />
      )}

      {/* FAILURE PATH ONE: the store rejected. */}
      {projectId && reportsQuery.isError && (
        <NoticeCard
          tone="red"
          title={t('loadFailedTitle', {
            defaultValue: 'This project’s days could not be loaded',
          })}
          body={describeError(reportsQuery.error)}
          action={
            <Button variant="outline" onClick={() => void reportsQuery.refetch()}>
              {t('retry', { defaultValue: 'Try again' })}
            </Button>
          }
        />
      )}

      {projectId && reportsQuery.isLoading && (
        <LoadingCard label={t('loadingDays', { defaultValue: 'Loading days…' })} />
      )}

      {/* FAILURE PATH TWO: loaded fine, and there is genuinely nothing. */}
      {projectId && reportsQuery.isSuccess && reportsQuery.data.length === 0 && (
        <NoticeCard
          tone="black"
          title={t('noDaysTitle', { defaultValue: 'No days recorded yet' })}
          body={t('noDaysBody', {
            defaultValue:
              'This project has no daily reports. Start the first one below.',
          })}
          action={<NewDayButton onCreate={(d) => createMutation.mutate(d)} />}
        />
      )}

      {projectId && reportsQuery.isSuccess && reportsQuery.data.length > 0 && !openReport && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">
                  {t('days', { defaultValue: 'Days' })}
                </h2>
                <NewDayButton onCreate={(d) => createMutation.mutate(d)} />
              </div>
              {createMutation.isError && (
                <p className="text-sm text-destructive">
                  {describeError(createMutation.error)}
                </p>
              )}
              <ul className="divide-y divide-border">
                {reportsQuery.data.map((r) => (
                  <li
                    key={r.id}
                    className="py-2 flex items-center justify-between gap-4"
                  >
                    <span className="text-sm">{r.reportDate}</span>
                    <span className="text-sm text-muted-foreground">
                      {r.approvalStatus}
                    </span>
                    <Button variant="outline" onClick={() => setOpenReportId(r.id)}>
                      {t('open', { defaultValue: 'Open' })}
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {openReport && actor && (
        <DailyReportForm
          report={openReport}
          actor={actor}
          onClose={() => setOpenReportId(null)}
        />
      )}
    </div>
  );
}

function NewDayButton({ onCreate }: { onCreate: (date: string) => void }) {
  const { t } = useTranslation('dms');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        className="w-auto"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <Button variant="primary" onClick={() => onCreate(date)}>
        {t('startDay', { defaultValue: 'Start day' })}
      </Button>
    </div>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-sm text-muted-foreground">
        {label}
      </CardContent>
    </Card>
  );
}

function NoticeCard({
  tone,
  title,
  body,
  action,
}: {
  tone: 'red' | 'black';
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const border =
    tone === 'red'
      ? '[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!'
      : '[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!';
  return (
    <div className={border}>
      <Card>
        <CardContent className="py-8 space-y-3">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{body}</p>
          {action}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Errors reach the UI as DmsError with the code the real API would have
 * returned, so this message survives the backend swap unchanged.
 */
function describeError(error: unknown): string {
  if (isDmsError(error)) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'Unknown error';
}
