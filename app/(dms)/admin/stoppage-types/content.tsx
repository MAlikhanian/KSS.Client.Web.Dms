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
import { Badge } from '@/components/ui/badge';
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
import { listStoppageTypes } from '@/lib/dms/mock-store';
import { isKnownStoppageCategory } from '@/lib/dms/types';
import { useDmsActor } from '../../_lib/use-dms-actor';

/**
 * The downtime types lookup — Amir, msg 194: «Create a lookup table where the
 * main administrator/operator enters the downtime types once. When users log
 * downtimes in the daily reports, they should only be able to select from the
 * predefined options in this table.»
 *
 * Maintained by کنترل پروژه, like the other definition tables.
 *
 * ⚠ `Is Planned` HERE IS A DEFAULT, NOT THE VALUE §4 READS. The stoppage row
 * keeps its own `is_planned`, and T_PD is computed from that. Selecting a type
 * prefills the row; it does not replace the row's field. Deriving one from the
 * other would silently change what T_PD means.
 */
export function StoppageTypesContent() {
  const { t } = useTranslation('dms');
  const { actor, ready } = useDmsActor();
  const [query, setQuery] = useState('');

  const typesQuery = useQuery({
    queryKey: ['dms', 'stoppage-types', query],
    queryFn: () => listStoppageTypes({ query }),
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
            {t('stoppageTypesTitle', { defaultValue: 'Downtime types' })}
          </ToolbarTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <Button asChild variant="primary">
            <Link href="/admin/stoppage-types/create">
              {t('newStoppageType', { defaultValue: 'New downtime type' })}
            </Link>
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
        <Card>
          <CardContent className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('stoppageTypesExplain', {
                defaultValue:
                  'Entered once here, then chosen from when a stoppage is logged. “Planned” is the default a stoppage inherits when this type is selected — the logged stoppage keeps its own value, and that is what the KPI figures use.',
              })}
            </p>

            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchStoppageTypes', {
                defaultValue: 'Search by code, name or category…',
              })}
            />

            {typesQuery.isLoading && (
              <p className="text-sm text-muted-foreground">
                {t('loading', { defaultValue: 'Loading…' })}
              </p>
            )}

            {/* FAILURE PATH ONE — the load failed. */}
            {typesQuery.isError && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  {isDmsError(typesQuery.error)
                    ? `${typesQuery.error.message} (${typesQuery.error.code})`
                    : t('stoppageTypesLoadFailed', {
                        defaultValue: 'Downtime types could not be loaded.',
                      })}
                </p>
                <Button variant="outline" onClick={() => void typesQuery.refetch()}>
                  {t('retry', { defaultValue: 'Try again' })}
                </Button>
              </div>
            )}

            {/* FAILURE PATH TWO — loaded, nothing there. Worded differently for
                "none at all" and "none matched": an empty lookup means operators
                cannot log a stoppage at all, which is worth saying plainly. */}
            {typesQuery.isSuccess && typesQuery.data.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {query.trim()
                  ? t('stoppageTypesNoMatch', {
                      defaultValue: 'No downtime type matches that search.',
                    })
                  : t('stoppageTypesEmpty', {
                      defaultValue:
                        'No downtime types are defined. Until one exists, an operator has nothing to choose from when logging a stoppage.',
                    })}
              </p>
            )}

            {typesQuery.isSuccess && typesQuery.data.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t('downtimeCode', { defaultValue: 'Code' })}
                      </TableHead>
                      <TableHead>
                        {t('downtimeCategory', { defaultValue: 'Category' })}
                      </TableHead>
                      <TableHead>
                        {t('downtimeName', { defaultValue: 'Name / description' })}
                      </TableHead>
                      <TableHead>
                        {t('downtimeIsPlanned', { defaultValue: 'Planned (default)' })}
                      </TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typesQuery.data.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.code}</TableCell>
                        <TableCell>
                          <span>{row.category}</span>
                          {/* The FRD lists three example categories. A fourth is
                              valid data — his lookup is what closes the set —
                              but the KPI tiles bucket only the two it names, so
                              a category outside them is marked rather than
                              silently landing in neither. */}
                          {!isKnownStoppageCategory(row.category) && (
                            <Badge variant="warning" className="ms-2">
                              {t('notBucketed', {
                                defaultValue: 'Not in a KPI bucket',
                              })}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>
                          {row.isPlanned
                            ? t('yes', { defaultValue: 'Yes' })
                            : t('no', { defaultValue: 'No' })}
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="outline">
                            <Link href={`/admin/stoppage-types/edit?id=${row.id}`}>
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
