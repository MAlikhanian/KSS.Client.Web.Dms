'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError } from '@/lib/dms/errors';
import { listProjects } from '@/lib/dms/mock-store';
import { useDmsActor } from '../../_lib/use-dms-actor';

/**
 * Projects list — ۲-۱ جدول پروژه‌ها.
 *
 * §1 scopes the definition tables to کنترل پروژه. The route is gated by
 * middleware; the component checks again, because a component that assumes it
 * was guarded breaks quietly the day a route moves.
 */
export function ProjectsContent() {
  const { t } = useTranslation('dms');
  const { actor, ready } = useDmsActor();
  const [query, setQuery] = useState('');

  const projectsQuery = useQuery({
    queryKey: ['dms', 'projects', query],
    queryFn: () => listProjects({ query }),
    enabled: ready,
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

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>
            {t('projectsTitle', { defaultValue: 'Projects' })}
          </ToolbarTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <Button asChild variant="primary">
            <Link href="/admin/projects/create">
              {t('newProject', { defaultValue: 'New project' })}
            </Link>
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
        <Card>
          <CardContent className="py-4 space-y-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchProjects', {
                defaultValue: 'Search by code or contract subject…',
              })}
            />

            {projectsQuery.isLoading && (
              <p className="text-sm text-muted-foreground">
                {t('loading', { defaultValue: 'Loading…' })}
              </p>
            )}

            {/* FAILURE PATH ONE — the load failed. */}
            {projectsQuery.isError && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  {isDmsError(projectsQuery.error)
                    ? `${projectsQuery.error.message} (${projectsQuery.error.code})`
                    : t('projectsLoadFailed', {
                        defaultValue: 'Projects could not be loaded.',
                      })}
                </p>
                <Button
                  variant="outline"
                  onClick={() => void projectsQuery.refetch()}
                >
                  {t('retry', { defaultValue: 'Try again' })}
                </Button>
              </div>
            )}

            {/* FAILURE PATH TWO — loaded fine, and there is genuinely nothing.
                Worded differently for "none at all" and "none matched", because
                they call for different next actions. */}
            {projectsQuery.isSuccess && projectsQuery.data.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {query.trim()
                  ? t('projectsNoMatch', {
                      defaultValue: 'No project matches that search.',
                    })
                  : t('projectsEmpty', {
                      defaultValue:
                        'No projects are defined yet. Create the first one.',
                    })}
              </p>
            )}

            {projectsQuery.isSuccess && projectsQuery.data.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t('projectCode', { defaultValue: 'Code' })}
                      </TableHead>
                      <TableHead>
                        {t('contractNumber', { defaultValue: 'Contract number' })}
                      </TableHead>
                      <TableHead>
                        {t('contractSubject', {
                          defaultValue: 'Contract subject',
                        })}
                      </TableHead>
                      <TableHead>
                        {t('executionArea', { defaultValue: 'Execution area' })}
                      </TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectsQuery.data.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.projectCode}</TableCell>
                        <TableCell>{p.contractNumber}</TableCell>
                        <TableCell>{p.contractSubject}</TableCell>
                        <TableCell>{p.executionArea || '—'}</TableCell>
                        <TableCell>
                          <Button asChild variant="outline">
                            <Link href={`/admin/projects/edit?id=${p.id}`}>
                              {t('edit', { defaultValue: 'Edit' })}
                            </Link>
                          </Button>
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
    </div>
  );
}
