'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError, type DmsError } from '@/lib/dms/errors';
import { createStoppageType } from '@/lib/dms/mock-store';
import { useDmsActor } from '../../../_lib/use-dms-actor';

/**
 * A new downtime type — all four of Amir's columns.
 *
 * ⚠ NOT A TWO-FIELD SEED, AND THAT IS NOT A DEVIATION. The create-page
 * convention says capture the fields needed to make a VALID row and complete
 * the rest on the edit page. For this lookup all four ARE needed: a row without
 * a category cannot be bucketed and a row without a planned flag has no default
 * to give a stoppage. There is no "rest" to defer.
 *
 * The duplicate-code refusal renders in place rather than as a toast — it is
 * the model explaining a constraint, not a transient failure to dismiss.
 */
export function CreateStoppageTypeContent() {
  const { t } = useTranslation('dms');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { actor, ready } = useDmsActor();

  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [isPlanned, setIsPlanned] = useState(false);

  const isValid =
    code.trim().length > 0 &&
    category.trim().length > 0 &&
    name.trim().length > 0;

  const createMutation = useMutation({
    mutationFn: () => {
      if (!actor) throw new Error('No actor');
      return createStoppageType({ code, category, name, isPlanned, actor });
    },
    onSuccess: (created) => {
      toast.success(
        t('stoppageTypeCreated', { defaultValue: 'Downtime type created' }) +
          ` — ${created.code}`,
      );
      void queryClient.invalidateQueries({ queryKey: ['dms', 'stoppage-types'] });
      router.push('/admin/stoppage-types');
    },
    // No toast on a Conflict: a duplicate code is a rule being explained, and
    // it stays on screen to be read.
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

  const failure =
    createMutation.isError && isDmsError(createMutation.error)
      ? (createMutation.error as DmsError)
      : null;

  return (
    <div className="grid gap-5 lg:gap-7.5">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>
            {t('newStoppageType', { defaultValue: 'New downtime type' })}
          </ToolbarTitle>
        </ToolbarHeading>
      </Toolbar>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('stoppageTypeDetails', { defaultValue: 'Downtime type' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium block" htmlFor="dt-code">
              {t('downtimeCode', { defaultValue: 'Downtime code' })}{' '}
              <span className="text-destructive">*</span>
            </label>
            <Input
              id="dt-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                createMutation.reset();
              }}
            />
            <p className="text-xs text-muted-foreground">
              {t('downtimeCodeNote', {
                defaultValue:
                  'Identifies the type when an operator selects it, so it must be unique.',
              })}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium block" htmlFor="dt-category">
              {t('downtimeCategory', { defaultValue: 'Category' })}{' '}
              <span className="text-destructive">*</span>
            </label>
            <Input
              id="dt-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t('downtimeCategoryPlaceholder', {
                defaultValue: 'e.g. Technical, Operational, Planned',
              })}
            />
            <p className="text-xs text-muted-foreground">
              {t('downtimeCategoryNote', {
                defaultValue:
                  'The dashboard buckets technical and operational downtime by this value. A category outside those two is valid, and its time is reported separately rather than dropped.',
              })}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium block" htmlFor="dt-name">
              {t('downtimeName', { defaultValue: 'Name / description' })}{' '}
              <span className="text-destructive">*</span>
            </label>
            <Input
              id="dt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="dt-planned"
              checked={isPlanned}
              onCheckedChange={(checked) => setIsPlanned(checked === true)}
            />
            <label className="text-sm font-medium" htmlFor="dt-planned">
              {t('downtimeIsPlannedLabel', { defaultValue: 'Planned downtime' })}
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('downtimeIsPlannedNote', {
              defaultValue:
                'A DEFAULT for stoppages logged with this type. The logged stoppage keeps its own value, and that is what T_PD is computed from.',
            })}
          </p>
        </CardContent>
      </Card>

      {createMutation.isError && (
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
          <Card>
            <CardContent className="py-6 space-y-2">
              <h2 className="font-semibold">
                {failure?.code === 'Conflict'
                  ? t('duplicateCodeTitle', {
                      defaultValue: 'That code is already in use',
                    })
                  : t('stoppageTypeCreateFailedTitle', {
                      defaultValue: 'The downtime type could not be created',
                    })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {failure
                  ? `${failure.message} (${failure.code})`
                  : t('stoppageTypeCreateFailed', {
                      defaultValue: 'The downtime type could not be created.',
                    })}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="py-4 flex items-center gap-2">
          <Button
            variant="primary"
            disabled={createMutation.isPending || !isValid}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending
              ? t('creating', { defaultValue: 'Creating…' })
              : t('createStoppageType', { defaultValue: 'Create' })}
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/stoppage-types">
              {t('cancel', { defaultValue: 'Cancel' })}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
