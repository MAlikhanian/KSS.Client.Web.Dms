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
import { listProjects, listSubprojects } from '@/lib/dms/mock-store';
import { useDmsActor } from '../../_lib/use-dms-actor';

/**
 * Subprojects list — ۲-۲ جدول زیرپروژه‌ها.
 *
 * A subproject only exists inside a project, so the project comes first: there
 * is no "all subprojects" view, because ۲-۲ has no meaning without a parent and
 * a flat list across projects would invite exactly the re-parenting the code
 * format forbids.
 */
export function SubprojectsContent() {
  const { t } = useTranslation('dms');
  const { actor, ready } = useDmsActor();
  const [projectId, setProjectId] = useState('');
  const [query, setQuery] = useState('');

  const projectsQuery = useQuery({
    queryKey: ['dms', 'projects'],
    queryFn: () => listProjects({}),
    enabled: ready,
  });

  const subprojectsQuery = useQuery({
    queryKey: ['dms', 'subprojects', projectId, query],
    queryFn: () => listSubprojects({ projectId, query }),
    enabled: !!projectId,
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
            {t('subprojectsTitle', { defaultValue: 'Subprojects' })}
          </ToolbarTitle>
        </ToolbarHeading>
        <ToolbarActions>
          {projectId && (
            <Button asChild variant="primary">
              <Link href={`/admin/subprojects/create?projectId=${projectId}`}>
                {t('newSubproject', { defaultValue: 'New subproject' })}
              </Link>
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
        <Card>
          <CardContent className="py-4 space-y-4">
            <label
              className="text-sm font-medium block"
              htmlFor="dms-subproject-project"
            >
              {t('project', { defaultValue: 'Project' })}
            </label>
            <Select
              value={projectId || undefined}
              onValueChange={(value) => setProjectId(value)}
            >
              <SelectTrigger id="dms-subproject-project" className="w-full">
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

            {projectId && (
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchSubprojects', {
                  defaultValue: 'Search by title or code…',
                })}
              />
            )}

            {!projectId && (
              <p className="text-sm text-muted-foreground">
                {t('noProjectBody', {
                  defaultValue: 'Choose a project above to see its days.',
                })}
              </p>
            )}

            {projectId && subprojectsQuery.isLoading && (
              <p className="text-sm text-muted-foreground">
                {t('loading', { defaultValue: 'Loading…' })}
              </p>
            )}

            {/* FAILURE PATH ONE — the load failed. */}
            {projectId && subprojectsQuery.isError && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  {isDmsError(subprojectsQuery.error)
                    ? `${subprojectsQuery.error.message} (${subprojectsQuery.error.code})`
                    : t('subprojectsLoadFailed', {
                        defaultValue: 'Subprojects could not be loaded.',
                      })}
                </p>
                <Button
                  variant="outline"
                  onClick={() => void subprojectsQuery.refetch()}
                >
                  {t('retry', { defaultValue: 'Try again' })}
                </Button>
              </div>
            )}

            {/* FAILURE PATH TWO — loaded fine, nothing there. */}
            {projectId &&
              subprojectsQuery.isSuccess &&
              subprojectsQuery.data.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {query.trim()
                    ? t('subprojectsNoMatch', {
                        defaultValue: 'No subproject matches that search.',
                      })
                    : t('subprojectsEmpty', {
                        defaultValue:
                          'This project has no subprojects yet. Create the first one.',
                      })}
                </p>
              )}

            {projectId &&
              subprojectsQuery.isSuccess &&
              subprojectsQuery.data.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          {t('subprojectCode', { defaultValue: 'Code' })}
                        </TableHead>
                        <TableHead>
                          {t('subprojectTitle', { defaultValue: 'Title' })}
                        </TableHead>
                        <TableHead>
                          {t('location', { defaultValue: 'Location' })}
                        </TableHead>
                        <TableHead>
                          {t('initialVolume', {
                            defaultValue: 'Initial volume (m³)',
                          })}
                        </TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subprojectsQuery.data.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.subprojectCode}</TableCell>
                          <TableCell>{s.title}</TableCell>
                          <TableCell>{s.location ?? '—'}</TableCell>
                          <TableCell>{s.initialVolumeM3 ?? '—'}</TableCell>
                          <TableCell>
                            <Button asChild variant="outline">
                              <Link href={`/admin/subprojects/edit?id=${s.id}`}>
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
