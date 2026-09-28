'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError, type DmsError } from '@/lib/dms/errors';
import { getStoppageType, updateStoppageType } from '@/lib/dms/mock-store';
import { useDmsActor } from '../../../_lib/use-dms-actor';

/** Edit a downtime type. Same four columns; the code stays unique. */
export function EditStoppageTypeContent() {
  const { t } = useTranslation('dms');
  const queryClient = useQueryClient();
  const { actor, ready } = useDmsActor();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [isPlanned, setIsPlanned] = useState(false);

  const typeQuery = useQuery({
    queryKey: ['dms', 'stoppage-type', id],
    queryFn: () => getStoppageType({ id: id as string }),
    enabled: ready && !!id,
    retry: false,
  });

  useEffect(() => {
    const row = typeQuery.data;
    if (!row) return;
    setCode(row.code);
    setCategory(row.category);
    setName(row.name);
    setIsPlanned(row.isPlanned);
  }, [typeQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!actor || !id) throw new Error('No actor or id');
      return updateStoppageType({
        id,
        patch: { code, category, name, isPlanned },
        actor,
      });
    },
    onSuccess: (saved) => {
      toast.success(t('stoppageTypeSaved', { defaultValue: 'Downtime type saved' }));
      queryClient.setQueryData(['dms', 'stoppage-type', id], saved);
      void queryClient.invalidateQueries({ queryKey: ['dms', 'stoppage-types'] });
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

  const isValid =
    code.trim().length > 0 &&
    category.trim().length > 0 &&
    name.trim().length > 0;

  const failure =
    saveMutation.isError && isDmsError(saveMutation.error)
      ? (saveMutation.error as DmsError)
      : null;

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>
            {t('editStoppageType', { defaultValue: 'Downtime type' })}
          </ToolbarTitle>
        </ToolbarHeading>
        <ToolbarActions>
          <Button asChild variant="outline">
            <Link href="/admin/stoppage-types">
              {t('backToStoppageTypes', { defaultValue: 'Back to downtime types' })}
            </Link>
          </Button>
        </ToolbarActions>
      </Toolbar>

      {!id && (
        <Card>
          <CardContent className="py-8 space-y-3">
            <h2 className="font-semibold">
              {t('noStoppageTypeSelected', {
                defaultValue: 'No downtime type selected',
              })}
            </h2>
            <Button asChild variant="outline">
              <Link href="/admin/stoppage-types">
                {t('stoppageTypesTitle', { defaultValue: 'Downtime types' })}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {id && typeQuery.isLoading && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {t('loading', { defaultValue: 'Loading…' })}
          </CardContent>
        </Card>
      )}

      {/* FAILURE PATH — a stale link. Rendered as itself, not an empty form. */}
      {id && typeQuery.isError && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
          <Card>
            <CardContent className="py-8 space-y-3">
              <h2 className="font-semibold">
                {t('stoppageTypeLoadFailedTitle', {
                  defaultValue: 'This downtime type could not be loaded',
                })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isDmsError(typeQuery.error)
                  ? `${typeQuery.error.message} (${typeQuery.error.code})`
                  : t('stoppageTypeLoadFailed', {
                      defaultValue: 'It could not be loaded.',
                    })}
              </p>
              <Button asChild variant="outline">
                <Link href="/admin/stoppage-types">
                  {t('backToStoppageTypes', {
                    defaultValue: 'Back to downtime types',
                  })}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {typeQuery.isSuccess && (
        <div
          className={
            '[&_div.rounded-xl.bg-card]:bg-blue-50! ' +
            '[&_div.rounded-xl.bg-card]:border-blue-100! ' +
            'dark:[&_div.rounded-xl.bg-card]:bg-blue-950/25! ' +
            'dark:[&_div.rounded-xl.bg-card]:border-blue-900! ' +
            '[&_div.rounded-xl.bg-card]:shadow-lg ' +
            '[&_div.rounded-xl.bg-card]:shadow-black/5'
          }
        >
          <fieldset disabled={saveMutation.isPending} className="space-y-6 contents">
            <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                      1
                    </span>
                    {t('stoppageTypeDetails', { defaultValue: 'Downtime type' })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium block" htmlFor="dte-code">
                        {t('downtimeCode', { defaultValue: 'Downtime code' })}
                      </label>
                      <Input
                        id="dte-code"
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value);
                          saveMutation.reset();
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium block" htmlFor="dte-category">
                        {t('downtimeCategory', { defaultValue: 'Category' })}
                      </label>
                      <Input
                        id="dte-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium block" htmlFor="dte-name">
                        {t('downtimeName', { defaultValue: 'Name / description' })}
                      </label>
                      <Input
                        id="dte-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="dte-planned"
                      checked={isPlanned}
                      onCheckedChange={(checked) => setIsPlanned(checked === true)}
                    />
                    <label className="text-sm font-medium" htmlFor="dte-planned">
                      {t('downtimeIsPlannedLabel', {
                        defaultValue: 'Planned downtime',
                      })}
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('downtimeIsPlannedNote', {
                      defaultValue:
                        'A DEFAULT for stoppages logged with this type. The logged stoppage keeps its own value, and that is what T_PD is computed from.',
                    })}
                  </p>

                  {saveMutation.isError && (
                    <p className="text-sm text-destructive">
                      {failure
                        ? `${failure.message} (${failure.code})`
                        : t('stoppageTypeSaveFailed', {
                            defaultValue: 'It could not be saved.',
                          })}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
              <Card>
                <CardContent className="py-4 flex items-center gap-2">
                  <Button
                    variant="primary"
                    disabled={saveMutation.isPending || !isValid}
                    onClick={() => saveMutation.mutate()}
                  >
                    {saveMutation.isPending
                      ? t('saving', { defaultValue: 'Saving…' })
                      : t('save', { defaultValue: 'Save' })}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
}
