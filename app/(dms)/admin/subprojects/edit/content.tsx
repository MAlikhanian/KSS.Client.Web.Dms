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
import { getSubproject } from '@/lib/dms/mock-store';
import { useDmsActor } from '../../../_lib/use-dms-actor';
import { SubprojectForm } from './components';

export function EditSubprojectContent() {
  const { t } = useTranslation('dms');
  const { actor, ready } = useDmsActor();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const subprojectQuery = useQuery({
    queryKey: ['dms', 'subproject', id],
    queryFn: () => getSubproject({ id: id as string }),
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
            {t('editSubproject', { defaultValue: 'Subproject detail' })}
          </ToolbarTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <Button asChild variant="outline">
            <Link href="/admin/subprojects">
              {t('backToSubprojects', { defaultValue: 'Back to subprojects' })}
            </Link>
          </Button>
        </ToolbarActions>
      </Toolbar>

      {!id && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
          <Card>
            <CardContent className="py-8 space-y-3">
              <h2 className="font-semibold">
                {t('noSubprojectSelectedTitle', {
                  defaultValue: 'No subproject selected',
                })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('noSubprojectSelectedBody', {
                  defaultValue:
                    'Choose a project, then a subproject from its list.',
                })}
              </p>
              <Button asChild variant="outline">
                <Link href="/admin/subprojects">
                  {t('subprojectsTitle', { defaultValue: 'Subprojects' })}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {id && subprojectQuery.isLoading && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {t('loading', { defaultValue: 'Loading…' })}
          </CardContent>
        </Card>
      )}

      {/* FAILURE PATH — a stale link. Rendered as itself rather than as an empty
          form, which would look like a subproject with no data. */}
      {id && subprojectQuery.isError && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
          <Card>
            <CardContent className="py-8 space-y-3">
              <h2 className="font-semibold">
                {t('subprojectLoadFailedTitle', {
                  defaultValue: 'This subproject could not be loaded',
                })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isDmsError(subprojectQuery.error)
                  ? `${subprojectQuery.error.message} (${subprojectQuery.error.code})`
                  : t('subprojectLoadFailed', {
                      defaultValue: 'The subproject could not be loaded.',
                    })}
              </p>
              <Button asChild variant="outline">
                <Link href="/admin/subprojects">
                  {t('backToSubprojects', {
                    defaultValue: 'Back to subprojects',
                  })}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {subprojectQuery.isSuccess && (
        <SubprojectForm subproject={subprojectQuery.data} actor={actor} />
      )}
    </div>
  );
}
