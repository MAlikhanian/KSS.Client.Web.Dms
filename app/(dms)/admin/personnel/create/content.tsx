'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Toolbar, ToolbarHeading, ToolbarTitle } from '@/components/common/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError } from '@/lib/dms/errors';
import { createPersonnel } from '@/lib/dms/mock-store';
import { useDmsActor } from '../../../_lib/use-dms-actor';

/**
 * Add a person — ۲-۵.
 *
 * ⚠ ONE FIELD, AND THE SPARSENESS IS THE SPECIFICATION. ۲-۵ gives «نام و نام
 * خانوادگی» as ONE column, not a first/last split — the estate's Person model
 * splits names, and importing that split here would invent structure the
 * eventual API cannot fill.
 *
 * The third column, «سایر اطلاعات فردی», has no fields and no types in the FRD
 * and is deliberately absent rather than guessed at. A screen that looks
 * unfinished is the honest rendering of a specification that is.
 */
export function CreatePersonnelContent() {
  const { t } = useTranslation('dms');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { actor, ready } = useDmsActor();
  const [fullName, setFullName] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      if (!actor) throw new Error('No actor');
      return createPersonnel({ fullName, actor });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dms', 'personnel'] });
      toast.success(t('personCreated', { defaultValue: 'The person has been added.' }));
      router.push('/admin/personnel');
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
          <ToolbarTitle>{t('addPerson', { defaultValue: 'Add a person' })}</ToolbarTitle>
        </ToolbarHeading>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
        <Card>
          <CardHeader>
            <CardTitle>{t('personDetails', { defaultValue: 'Person' })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="per-new-name">
                {t('fullName', { defaultValue: 'Name' })}
              </Label>
              <Input
                id="per-new-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('fullNameHint', {
                  defaultValue:
                    'Full name in one field, as the specification records it — not a first and last name.',
                })}
              </p>
            </div>

            {mutation.isError && (
              <p className="text-sm text-destructive">
                {isDmsError(mutation.error)
                  ? `${mutation.error.message} (${mutation.error.code})`
                  : t('personCreateFailed', {
                      defaultValue: 'The person could not be added.',
                    })}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                disabled={fullName.trim() === '' || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {t('save', { defaultValue: 'Save' })}
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/personnel">
                  {t('cancel', { defaultValue: 'Cancel' })}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
