'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Toolbar, ToolbarHeading, ToolbarTitle } from '@/components/common/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError } from '@/lib/dms/errors';
import { getPersonnel, updatePersonnel } from '@/lib/dms/mock-store';
import { useDmsActor } from '../../../_lib/use-dms-actor';

/**
 * Correct a person's name — ۲-۵.
 *
 * ⚠ THE ID IS NOT EDITABLE. It is ۲-۵ «کلید اصلی», and correctly so for a
 * master table — but it is also what every ۲-۶ assignment references. Changing
 * it would leave those rows pointing at nobody, which is the same history loss
 * the delete guard refuses, arriving by a quieter route. `PersonnelPatch`
 * excludes it, so the store refuses it regardless of what a caller sends.
 */
export function EditPersonnelContent() {
  const { t } = useTranslation('dms');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { actor, ready } = useDmsActor();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [fullName, setFullName] = useState('');
  const [loaded, setLoaded] = useState(false);

  const personQuery = useQuery({
    queryKey: ['dms', 'person', id],
    queryFn: () => getPersonnel({ id: id as string }),
    enabled: ready && !!id,
    retry: false,
  });

  useEffect(() => {
    if (personQuery.data && !loaded) {
      setFullName(personQuery.data.fullName);
      setLoaded(true);
    }
  }, [personQuery.data, loaded]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!actor || !id) throw new Error('Not ready');
      return updatePersonnel({ id, patch: { fullName }, actor });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dms', 'personnel'] });
      void queryClient.invalidateQueries({ queryKey: ['dms', 'person'] });
      toast.success(t('personSaved', { defaultValue: 'The person has been updated.' }));
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

  if (!id) {
    return (
      <Card>
        <CardContent className="py-8 space-y-2">
          <p className="text-sm text-muted-foreground">
            {t('noPersonSelected', { defaultValue: 'No person was given to edit.' })}
          </p>
          <Button asChild variant="outline">
            <Link href="/admin/personnel">
              {t('backToPersonnel', { defaultValue: 'Back to personnel' })}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>{t('editPerson', { defaultValue: 'Edit person' })}</ToolbarTitle>
        </ToolbarHeading>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
        <Card>
          <CardHeader>
            <CardTitle>{t('personDetails', { defaultValue: 'Person' })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {personQuery.isLoading && (
              <p className="text-sm text-muted-foreground">
                {t('loading', { defaultValue: 'Loading…' })}
              </p>
            )}

            {!!personQuery.error && (
              <p className="text-sm text-destructive">
                {isDmsError(personQuery.error)
                  ? `${personQuery.error.message} (${personQuery.error.code})`
                  : t('personLoadFailed', {
                      defaultValue: 'The person could not be loaded.',
                    })}
              </p>
            )}

            {personQuery.isSuccess && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="per-edit-name">
                    {t('fullName', { defaultValue: 'Name' })}
                  </Label>
                  <Input
                    id="per-edit-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                {mutation.isError && (
                  <p className="text-sm text-destructive">
                    {isDmsError(mutation.error)
                      ? `${mutation.error.message} (${mutation.error.code})`
                      : t('personSaveFailed', {
                          defaultValue: 'The person could not be updated.',
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
