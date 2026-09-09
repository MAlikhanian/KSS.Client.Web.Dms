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
import { listVessels } from '@/lib/dms/mock-store';
import { useDmsActor } from '../../_lib/use-dms-actor';

/**
 * Vessels list — ۲-۳ جدول مشخصات فنی شناورها.
 *
 * §1 scopes the definition tables to کنترل پروژه, so this is ProjectControl's.
 * The route is already gated by middleware; the component checks again because
 * a component that assumes it was guarded breaks quietly the day a route moves.
 *
 * BOTH FAILURE PATHS ARE REACHABLE HERE, which is the point of the search box
 * as much as of the error card: a search that matches nothing is a genuine
 * empty result, distinct from a load that failed, and the screen says which.
 */
export function VesselsContent() {
  const { t } = useTranslation('dms');
  const { actor, ready } = useDmsActor();
  const [query, setQuery] = useState('');

  const vesselsQuery = useQuery({
    queryKey: ['dms', 'vessels', query],
    queryFn: () => listVessels({ query }),
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
            {t('vesselsTitle', { defaultValue: 'Vessels' })}
          </ToolbarTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <Button asChild variant="primary">
            {/* No '/dms' prefix — Next adds basePath to Link itself. */}
            <Link href="/admin/vessels/create">
              {t('newVessel', { defaultValue: 'New vessel' })}
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
              placeholder={t('searchVessels', {
                defaultValue: 'Search by name, code or type…',
              })}
            />

            {vesselsQuery.isLoading && (
              <p className="text-sm text-muted-foreground">
                {t('loading', { defaultValue: 'Loading…' })}
              </p>
            )}

            {/* FAILURE PATH ONE — the load failed. */}
            {vesselsQuery.isError && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  {isDmsError(vesselsQuery.error)
                    ? `${vesselsQuery.error.message} (${vesselsQuery.error.code})`
                    : t('vesselsLoadFailed', {
                        defaultValue: 'Vessels could not be loaded.',
                      })}
                </p>
                <Button variant="outline" onClick={() => void vesselsQuery.refetch()}>
                  {t('retry', { defaultValue: 'Try again' })}
                </Button>
              </div>
            )}

            {/* FAILURE PATH TWO — loaded fine, and there is genuinely nothing.
                Worded differently for "no vessels at all" and "none matched",
                because they call for different next actions. */}
            {vesselsQuery.isSuccess && vesselsQuery.data.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {query.trim()
                  ? t('vesselsNoMatch', {
                      defaultValue: 'No vessel matches that search.',
                    })
                  : t('vesselsEmpty', {
                      defaultValue:
                        'No vessels are defined yet. Create the first one.',
                    })}
              </p>
            )}

            {vesselsQuery.isSuccess && vesselsQuery.data.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('vesselCode', { defaultValue: 'Code' })}</TableHead>
                      <TableHead>{t('vesselName', { defaultValue: 'Name' })}</TableHead>
                      <TableHead>{t('vesselType', { defaultValue: 'Type' })}</TableHead>
                      <TableHead>
                        {t('dailyCapacity', { defaultValue: 'Daily capacity (m³)' })}
                      </TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vesselsQuery.data.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>{v.vesselCode}</TableCell>
                        <TableCell>{v.name}</TableCell>
                        <TableCell>{v.vesselType ?? '—'}</TableCell>
                        <TableCell>{v.actualDailyCapacityM3 ?? '—'}</TableCell>
                        <TableCell>
                          <Button asChild variant="outline">
                            <Link href={`/admin/vessels/edit?id=${v.id}`}>
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
