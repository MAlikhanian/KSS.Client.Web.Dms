'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError } from '@/lib/dms/errors';
import { getProject } from '@/lib/dms/mock-store';
import { useDmsActor } from '../../../_lib/use-dms-actor';
import { ProjectForm } from './components';

/**
 * Project edit — the remaining 43 editable columns of ۲-۱.
 *
 * `?id=` rather than a localStorage context, for the reason given on the
 * vessel edit page: person/edit uses a context because its selection is shared
 * with sibling sub-pages, and projects have none. A URL naming the record is
 * linkable; a context is not.
 */
export function EditProjectContent() {
  const { t } = useTranslation('dms');
  const { actor, ready } = useDmsActor();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const projectQuery = useQuery({
    queryKey: ['dms', 'project', id],
    queryFn: () => getProject({ id: id as string }),
    enabled: ready && !!id,
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
            {t('editProject', { defaultValue: 'Contract detail' })}
          </ToolbarTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <Button asChild variant="outline">
            <Link href="/admin/projects">
              {t('backToProjects', { defaultValue: 'Back to projects' })}
            </Link>
          </Button>
        </ToolbarActions>
      </Toolbar>

      {!id && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
          <Card>
            <CardContent className="py-8 space-y-3">
              <h2 className="font-semibold">
                {t('noProjectSelectedTitle', {
                  defaultValue: 'No project selected',
                })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('noProjectSelectedBody', {
                  defaultValue:
                    'Choose a project from the list, or create a new one.',
                })}
              </p>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href="/admin/projects">
                    {t('projectsTitle', { defaultValue: 'Projects' })}
                  </Link>
                </Button>
                <Button asChild variant="primary">
                  <Link href="/admin/projects/create">
                    {t('newProject', { defaultValue: 'New project' })}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {id && projectQuery.isLoading && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {t('loading', { defaultValue: 'Loading…' })}
          </CardContent>
        </Card>
      )}

      {/* FAILURE PATH — a stale link, or the seeded fault project. Rendered as
          itself rather than as an empty form, which would look like a project
          with no data. */}
      {id && projectQuery.isError && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
          <Card>
            <CardContent className="py-8 space-y-3">
              <h2 className="font-semibold">
                {t('projectLoadFailedTitle', {
                  defaultValue: 'This project could not be loaded',
                })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isDmsError(projectQuery.error)
                  ? `${projectQuery.error.message} (${projectQuery.error.code})`
                  : t('projectLoadFailed', {
                      defaultValue: 'The project could not be loaded.',
                    })}
              </p>
              <Button asChild variant="outline">
                <Link href="/admin/projects">
                  {t('backToProjects', { defaultValue: 'Back to projects' })}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {projectQuery.isSuccess && (
        <ProjectForm project={projectQuery.data} actor={actor} />
      )}
    </div>
  );
}
