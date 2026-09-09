'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError } from '@/lib/dms/errors';
import { createSubproject, getProject } from '@/lib/dms/mock-store';
import { useDmsActor } from '../../../_lib/use-dms-actor';

/**
 * A SEED, NOT A FORM. ۲-۲ has 24 columns and this page asks for one.
 *
 * The parent project arrives as `?projectId=` rather than being chosen here:
 * a subproject cannot exist without one, and ۲-۲ composes the subproject code
 * from the parent's code — so the parent is a precondition of creation, not a
 * field of it.
 */
export function CreateSubprojectContent() {
  const { t } = useTranslation('dms');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { actor, ready } = useDmsActor();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [title, setTitle] = useState('');
  const isValid = title.trim().length > 0;

  const projectQuery = useQuery({
    queryKey: ['dms', 'project', projectId],
    queryFn: () => getProject({ id: projectId as string }),
    enabled: ready && !!projectId,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!actor || !projectId) throw new Error('No actor or project');
      return createSubproject({ projectId, title, actor });
    },
    onSuccess: (created) => {
      toast.success(
        t('subprojectCreated', { defaultValue: 'Subproject created' }) +
          ` — ${created.subprojectCode}`,
      );
      void queryClient.invalidateQueries({ queryKey: ['dms', 'subprojects'] });
      router.push(`/admin/subprojects/edit?id=${created.id}`);
    },
    onError: (error) => {
      toast.error(
        isDmsError(error)
          ? `${error.message} (${error.code})`
          : t('subprojectCreateFailed', {
              defaultValue: 'The subproject could not be created.',
            }),
      );
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

  // No parent named, or a parent that will not load: both refuse creation
  // rather than offering a form that cannot succeed.
  if (!projectId || projectQuery.isError) {
    return (
      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
        <Card>
          <CardContent className="py-8 space-y-3">
            <h2 className="font-semibold">
              {/*
               * ⚠ DMS-PROVISIONAL-TERM — «پروژه والد» (parent project)
               *
               * Our coinage. Amir has not confirmed it: it was chosen because a search
               * of his FRD returned nothing for the concept, not because he named it.
               * Caroline will put it to him alongside the working screen, as an
               * invitation to correct rather than a question to answer.
               *
               * ⛔ IF HE CORRECTS IT, THIS IS A GREP AND NOT AN AUDIT:
               *     grep -r "DMS-PROVISIONAL-TERM" "app/(dms)"
               * finds every site. The term itself lives in i18n/dms/fa.json under this
               * key — change it there; this marker only says where to look.
              */}
              {t('noParentProjectTitle', {
                defaultValue: 'A subproject needs a parent project',
              })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {projectQuery.isError && isDmsError(projectQuery.error)
                ? `${projectQuery.error.message} (${projectQuery.error.code})`
                : t('noParentProjectBody', {
                    defaultValue:
                      'Open the subprojects list, choose a project, and create it from there.',
                  })}
            </p>
            <Button asChild variant="outline">
              <Link href="/admin/subprojects">
                {t('subprojectsTitle', { defaultValue: 'Subprojects' })}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:gap-7.5">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>
            {t('newSubproject', { defaultValue: 'New subproject' })}
          </ToolbarTitle>
        </ToolbarHeading>
      </Toolbar>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('subprojectSeedTitle', { defaultValue: 'Basic information' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {/*
             * ⚠ DMS-PROVISIONAL-TERM — «پروژه والد» (parent project)
             *
             * Our coinage. Amir has not confirmed it: it was chosen because a search
             * of his FRD returned nothing for the concept, not because he named it.
             * Caroline will put it to him alongside the working screen, as an
             * invitation to correct rather than a question to answer.
             *
             * ⛔ IF HE CORRECTS IT, THIS IS A GREP AND NOT AN AUDIT:
             *     grep -r "DMS-PROVISIONAL-TERM" "app/(dms)"
             * finds every site. The term itself lives in i18n/dms/fa.json under this
             * key — change it there; this marker only says where to look.
            */}
            {t('subprojectSeedExplain', {
              defaultValue:
                'Enough to create the record. The rest is completed on the next screen. The subproject code is generated from the parent project’s code.',
            })}
          </p>

          <div className="text-sm">
            <span className="text-muted-foreground">
              {t('project', { defaultValue: 'Project' })}:{' '}
            </span>
            <span className="font-medium">
              {projectQuery.data
                ? `${projectQuery.data.projectCode} — ${projectQuery.data.contractSubject}`
                : '…'}
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium block" htmlFor="subproject-title">
              {t('subprojectTitle', { defaultValue: 'Subproject title' })}{' '}
              <span className="text-destructive">*</span>
            </label>
            <Input
              id="subproject-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 flex items-center gap-2">
          <Button
            variant="primary"
            disabled={createMutation.isPending || !isValid}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending
              ? t('creating', { defaultValue: 'Creating…' })
              : t('createSubproject', { defaultValue: 'Create subproject' })}
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/subprojects">
              {t('cancel', { defaultValue: 'Cancel' })}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
