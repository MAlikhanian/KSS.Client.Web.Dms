'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { deletePersonnel, listPersonnel } from '@/lib/dms/mock-store';
import { useDmsActor } from '../../_lib/use-dms-actor';

/**
 * ۲-۵ جدول مشخصات پرسنل — the personnel master table.
 *
 * ⚠ TWO COLUMNS, NOT THREE, AND THE THIRD IS MISSING ON PURPOSE. ۲-۵ lists
 * شناسه پرسنل, نام پرسنل and «سایر اطلاعات فردی» — "other personal
 * information", with no fields and no types. It is unspecified at source, so it
 * is not modelled and not shown. Inventing personal-data fields for the
 * customer's own staff is not ours, and it is far more expensive to remove once
 * he has seen it than to add once he has specified it.
 *
 * ⚠ «کلید اصلی» ON شناسه پرسنل IS CORRECT HERE. The identical row appears in
 * ۲-۶ and is wrong there — one row per person is what a master table is, while
 * in ۲-۶ the row is an assignment and a key on the person would permit one
 * assignment per person ever. Same characters, opposite meanings, because the
 * meaning comes from the table.
 */
export function PersonnelContent() {
  const { t } = useTranslation('dms');
  const queryClient = useQueryClient();
  const { actor, ready } = useDmsActor();

  const personnelQuery = useQuery({
    queryKey: ['dms', 'personnel'],
    queryFn: () => listPersonnel(),
    enabled: ready,
    retry: false,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => {
      if (!actor) throw new Error('No actor');
      return deletePersonnel({ id, actor });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dms', 'personnel'] });
    },
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
            {t('personnelTitle', { defaultValue: 'Personnel' })}
          </ToolbarTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <Button asChild variant="primary">
            <Link href="/admin/personnel/create">
              {t('addPerson', { defaultValue: 'Add a person' })}
            </Link>
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
        <Card>
          <CardContent className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('personnelExplain', {
                defaultValue:
                  'The people who can be assigned to projects. Assigning someone to a project, with dates and a shift, is done on the personnel assignment screen.',
              })}
            </p>

            {personnelQuery.isLoading && (
              <p className="text-sm text-muted-foreground">
                {t('loading', { defaultValue: 'Loading…' })}
              </p>
            )}

            {!!personnelQuery.error && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  {isDmsError(personnelQuery.error)
                    ? `${personnelQuery.error.message} (${personnelQuery.error.code})`
                    : t('personnelLoadFailed', {
                        defaultValue: 'Personnel could not be loaded.',
                      })}
                </p>
                <Button variant="outline" onClick={() => void personnelQuery.refetch()}>
                  {t('retry', { defaultValue: 'Try again' })}
                </Button>
              </div>
            )}

            {/*
              The refusal to delete someone who has assignments arrives here,
              with its reason. It is a 409 from the store, not a disabled
              button — a person with only ENDED assignments looks free, and a
              greyed-out button would not say why they are not.
            */}
            {removeMutation.isError && (
              <p className="text-sm text-destructive">
                {isDmsError(removeMutation.error)
                  ? `${removeMutation.error.message} (${removeMutation.error.code})`
                  : t('personnelRemoveFailed', {
                      defaultValue: 'The person could not be removed.',
                    })}
              </p>
            )}

            {personnelQuery.isSuccess && personnelQuery.data.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('noPersonnel', {
                  defaultValue:
                    'Nobody has been recorded yet. Add a person before assigning anyone to a project.',
                })}
              </p>
            )}

            {personnelQuery.isSuccess && personnelQuery.data.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('fullName', { defaultValue: 'Name' })}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {personnelQuery.data.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.fullName}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Button asChild variant="outline">
                            <Link href={`/admin/personnel/edit?id=${p.id}`}>
                              {t('edit', { defaultValue: 'Edit' })}
                            </Link>
                          </Button>{' '}
                          <Button
                            variant="destructive"
                            disabled={removeMutation.isPending}
                            onClick={() => removeMutation.mutate(p.id)}
                          >
                            {t('remove', { defaultValue: 'Remove' })}
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
