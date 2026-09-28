'use client';

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
import { listShifts } from '@/lib/dms/mock-store';
import { useDmsActor } from '../../_lib/use-dms-actor';

/**
 * FRD «شیفت» — the shift reference table, unnumbered under ۲-۶.
 *
 * ⛔ HE POPULATES THIS AND THE TWO SEEDED ROWS ARE NOT THE SET. His column
 * reads «نام شیفت | متنی | مثال: روز، شب» — «مثال» marks those as EXAMPLES,
 * exactly as «و غیره» does on vessel types and «مانند فنی، عملیاتی» on stoppage
 * categories. The screen therefore offers Add and does not present the seeds as
 * a fixed list.
 *
 * ⚠ THE TIME RANGE IS DISPLAYED AS THE STRING IT IS, AND MUST STAY THAT WAY.
 * «بازه زمانی شیفت | متنی | مانند ۰۸:۰۰ الی ۱۶:۰۰» is ONE free-text field —
 * not a start/end pair and not a duration. Parsing it into times here would
 * invent structure the eventual API will not return, and it would resurrect a
 * question that is closed: a shift-based KPI denominator was ruled out
 * precisely because this field cannot be computed from.
 *
 * ⚠ NO DELETE, and that is the store's decision rather than a missing button —
 * a shift referenced by a ۲-۶ assignment must not vanish from under it. See
 * `createShift` in the store for why the lookup has no delete path at all.
 */
export function ShiftsContent() {
  const { t } = useTranslation('dms');
  const { actor, ready } = useDmsActor();

  const shiftsQuery = useQuery({
    queryKey: ['dms', 'shifts'],
    queryFn: () => listShifts(),
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
          <ToolbarTitle>{t('shiftsTitle', { defaultValue: 'Shifts' })}</ToolbarTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <Button asChild variant="primary">
            <Link href="/admin/shifts/create">
              {t('newShift', { defaultValue: 'New shift' })}
            </Link>
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
        <Card>
          <CardContent className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('shiftsExplain', {
                defaultValue:
                  'Entered once here, then chosen from when personnel are assigned to a project. The time range is recorded as free text, exactly as written — it is a label, not a duration the system calculates with.',
              })}
            </p>

            {shiftsQuery.isLoading && (
              <p className="text-sm text-muted-foreground">
                {t('loading', { defaultValue: 'Loading…' })}
              </p>
            )}

            {!!shiftsQuery.error && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  {isDmsError(shiftsQuery.error)
                    ? `${shiftsQuery.error.message} (${shiftsQuery.error.code})`
                    : t('shiftsLoadFailed', { defaultValue: 'Shifts could not be loaded.' })}
                </p>
                <Button variant="outline" onClick={() => void shiftsQuery.refetch()}>
                  {t('retry', { defaultValue: 'Try again' })}
                </Button>
              </div>
            )}

            {shiftsQuery.isSuccess && shiftsQuery.data.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('shiftsEmpty', {
                  defaultValue:
                    'No shifts are defined. Until one exists, an assignment cannot record which shift someone works.',
                })}
              </p>
            )}

            {shiftsQuery.isSuccess && shiftsQuery.data.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('shiftName', { defaultValue: 'Shift name' })}</TableHead>
                      <TableHead>{t('shiftTimeRange', { defaultValue: 'Time range' })}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shiftsQuery.data.map((sh) => (
                      <TableRow key={sh.id}>
                        <TableCell>{sh.name}</TableCell>
                        {/*
                          Rendered verbatim. Not split, not reformatted, not
                          localised into digits of another script — it is his
                          text and the screen is a viewer for it.
                        */}
                        <TableCell>{sh.timeRangeText}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Button asChild variant="outline">
                            <Link href={`/admin/shifts/edit?id=${sh.id}`}>
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
