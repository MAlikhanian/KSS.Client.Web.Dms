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
import { createShift } from '@/lib/dms/mock-store';
import { useDmsActor } from '../../../_lib/use-dms-actor';

/**
 * Add a shift — FRD «شیفت».
 *
 * ⚠ THE TIME RANGE IS A FREE-TEXT INPUT ON PURPOSE, not two time pickers.
 * His column is «بازه زمانی شیفت | متنی | مانند ۰۸:۰۰ الی ۱۶:۰۰» — one text
 * field. Two pickers would be a nicer form and would invent a start/end pair
 * the eventual API has nowhere to put, and would silently answer a question
 * that is closed: whether a shift yields a computable duration. It does not.
 *
 * The placeholder is HIS example, so the operator sees the shape he specified
 * rather than one we designed.
 */
export function CreateShiftContent() {
  const { t } = useTranslation('dms');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { actor, ready } = useDmsActor();
  const [name, setName] = useState('');
  const [timeRangeText, setTimeRangeText] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      if (!actor) throw new Error('No actor');
      return createShift({ name, timeRangeText, actor });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dms', 'shifts'] });
      toast.success(t('shiftCreated', { defaultValue: 'Shift created' }));
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

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>{t('newShift', { defaultValue: 'New shift' })}</ToolbarTitle>
        </ToolbarHeading>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
        <Card>
          <CardHeader>
            <CardTitle>{t('shiftDetails', { defaultValue: 'Shift' })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="shift-new-name">
                  {t('shiftName', { defaultValue: 'Shift name' })}
                </Label>
                <Input
                  id="shift-new-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('shiftNamePlaceholder', { defaultValue: 'e.g. day, night' })}
                />
                <p className="text-xs text-muted-foreground">
                  {t('shiftNameNote', {
                    defaultValue:
                      'How the shift is chosen when assigning personnel, so two shifts cannot share a name.',
                  })}
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="shift-new-range">
                  {t('shiftTimeRange', { defaultValue: 'Time range' })}
                </Label>
                <Input
                  id="shift-new-range"
                  value={timeRangeText}
                  onChange={(e) => setTimeRangeText(e.target.value)}
                  placeholder={t('shiftTimeRangePlaceholder', {
                    defaultValue: 'e.g. 08:00 to 16:00',
                  })}
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
                  : t('shiftCreateFailed', { defaultValue: 'The shift could not be created.' })}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                disabled={name.trim() === '' || timeRangeText.trim() === '' || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending
                  ? t('creating', { defaultValue: 'Creating…' })
                  : t('createShift', { defaultValue: 'Create shift' })}
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/shifts">{t('cancel', { defaultValue: 'Cancel' })}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
