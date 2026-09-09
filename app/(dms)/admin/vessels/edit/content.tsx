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
import { getVessel } from '@/lib/dms/mock-store';
import { useDmsActor } from '../../../_lib/use-dms-actor';
import { VesselForm } from './components';

/**
 * Vessel edit — the remaining 20 columns of ۲-۳.
 *
 * THE SELECTED VESSEL COMES FROM `?id=`, not from a localStorage context.
 * person/edit uses a context because its selection is shared with sibling
 * sub-pages (access, security) that must stay in step. Vessels have no such
 * siblings, so a context would be machinery with nothing to synchronise — and
 * a URL that names the record is linkable, which a context is not.
 */
export function EditVesselContent() {
  const { t } = useTranslation('dms');
  const { actor, ready } = useDmsActor();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const vesselQuery = useQuery({
    queryKey: ['dms', 'vessel', id],
    queryFn: () => getVessel({ id: id as string }),
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
          <CardContent className="py-8 space-y-2">
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
            {t('editVessel', { defaultValue: 'Vessel specification' })}
          </ToolbarTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <Button asChild variant="outline">
            <Link href="/admin/vessels">
              {t('backToVessels', { defaultValue: 'Back to vessels' })}
            </Link>
          </Button>
        </ToolbarActions>
      </Toolbar>

      {/* No vessel named in the URL. The create page is linked from here, per
          the edit-page convention that a "no selection" state points at it. */}
      {!id && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
          <Card>
            <CardContent className="py-8 space-y-3">
              <h2 className="font-semibold">
                {t('noVesselSelectedTitle', {
                  defaultValue: 'No vessel selected',
                })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('noVesselSelectedBody', {
                  defaultValue:
                    'Choose a vessel from the list, or create a new one.',
                })}
              </p>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href="/admin/vessels">
                    {t('vesselsTitle', { defaultValue: 'Vessels' })}
                  </Link>
                </Button>
                <Button asChild variant="primary">
                  <Link href="/admin/vessels/create">
                    {t('newVessel', { defaultValue: 'New vessel' })}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {id && vesselQuery.isLoading && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {t('loading', { defaultValue: 'Loading…' })}
          </CardContent>
        </Card>
      )}

      {/* FAILURE PATH — reachable by editing the URL, which is exactly how a
          stale link behaves. NotFound is rendered as itself rather than as an
          empty form, which would look like a vessel with no data. */}
      {id && vesselQuery.isError && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
          <Card>
            <CardContent className="py-8 space-y-3">
              <h2 className="font-semibold">
                {t('vesselLoadFailedTitle', {
                  defaultValue: 'This vessel could not be loaded',
                })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isDmsError(vesselQuery.error)
                  ? `${vesselQuery.error.message} (${vesselQuery.error.code})`
                  : t('vesselLoadFailed', {
                      defaultValue: 'The vessel could not be loaded.',
                    })}
              </p>
              <Button asChild variant="outline">
                <Link href="/admin/vessels">
                  {t('backToVessels', { defaultValue: 'Back to vessels' })}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {vesselQuery.isSuccess && (
        <VesselForm vessel={vesselQuery.data} actor={actor} />
      )}
    </div>
  );
}
