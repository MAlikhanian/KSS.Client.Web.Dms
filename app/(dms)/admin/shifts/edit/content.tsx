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
import { getShift, updateShift } from '@/lib/dms/mock-store';
import { useDmsActor } from '../../../_lib/use-dms-actor';

/**
 * Correct a shift — FRD «شیفت».
 *
 * ⚠ THERE IS NO REMOVE HERE, AND ITS ABSENCE IS THE FEATURE. A shift is
 * referenced by ۲-۶ assignments; deleting one would leave those rows pointing
 * at nothing, and an assignment whose shift was deleted is indistinguishable
 * from one that never had a shift. The store offers no delete path at all, so
 * this is not a button someone forgot — see `createShift` for the reasoning.
 *
 * A shift that is no longer worked is corrected or simply stops being chosen.
 */
export function EditShiftContent() {
  const { t } = useTranslation('dms');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { actor, ready } = useDmsActor();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [name, setName] = useState('');
  const [timeRangeText, setTimeRangeText] = useState('');
  const [loaded, setLoaded] = useState(false);

  const shiftQuery = useQuery({
    queryKey: ['dms', 'shift', id],
    queryFn: () => getShift({ id: id as string }),
    enabled: ready && !!id,
    retry: false,
  });

  useEffect(() => {
    if (shiftQuery.data && !loaded) {
      setName(shiftQuery.data.name);
      setTimeRangeText(shiftQuery.data.timeRangeText);
      setLoaded(true);
    }
  }, [shiftQuery.data, loaded]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!actor || !id) throw new Error('Not ready');
      return updateShift({ id, patch: { name, timeRangeText }, actor });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dms', 'shifts'] });
      void queryClient.invalidateQueries({ queryKey: ['dms', 'shift'] });
      toast.success(t('shiftSaved', { defaultValue: 'Shift saved' }));
      router.push('/admin/shifts');
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
            {t('noShiftSelected', { defaultValue: 'No shift selected' })}
          </p>
          <Button asChild variant="outline">
            <Link href="/admin/shifts">
              {t('backToShifts', { defaultValue: 'Back to shifts' })}
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
          <ToolbarTitle>{t('editShift', { defaultValue: 'Shift' })}</ToolbarTitle>
        </ToolbarHeading>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
        <Card>
          <CardHeader>
            <CardTitle>{t('shiftDetails', { defaultValue: 'Shift' })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {shiftQuery.isLoading && (
              <p className="text-sm text-muted-foreground">
                {t('loading', { defaultValue: 'Loading…' })}
              </p>
            )}

            {!!shiftQuery.error && (
              <p className="text-sm text-destructive">
                {isDmsError(shiftQuery.error)
                  ? `${shiftQuery.error.message} (${shiftQuery.error.code})`
                  : t('shiftLoadFailed', { defaultValue: 'The shift could not be loaded.' })}
              </p>
            )}

            {shiftQuery.isSuccess && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="shift-edit-name">
                      {t('shiftName', { defaultValue: 'Shift name' })}
                    </Label>
                    <Input
                      id="shift-edit-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="shift-edit-range">
                      {t('shiftTimeRange', { defaultValue: 'Time range' })}
                    </Label>
                    <Input
                      id="shift-edit-range"
                      value={timeRangeText}
                      onChange={(e) => setTimeRangeText(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('shiftTimeRangeNote', {
                        defaultValue:
                          'Recorded as text, exactly as written. It is a label shown beside the shift, not a duration the system calculates with.',
                      })}
                    </p>
                  </div>
                </div>

                {mutation.isError && (
                  <p className="text-sm text-destructive">
                    {isDmsError(mutation.error)
                      ? `${mutation.error.message} (${mutation.error.code})`
                      : t('shiftSaveFailed', { defaultValue: 'The shift could not be saved.' })}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    disabled={
                      name.trim() === '' || timeRangeText.trim() === '' || mutation.isPending
                    }
                    onClick={() => mutation.mutate()}
                  >
                    {t('save', { defaultValue: 'Save' })}
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/admin/shifts">{t('cancel', { defaultValue: 'Cancel' })}</Link>
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
