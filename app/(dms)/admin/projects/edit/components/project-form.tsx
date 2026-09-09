'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError } from '@/lib/dms/errors';
import { updateProject } from '@/lib/dms/mock-store';
import type { DmsActor, DmsProject, ProjectPatch } from '@/lib/dms/types';
import { parseOptionalNumber, toEnglishDigits } from '../../../../_lib/digits';
import { SECTION_COLOUR } from '../../../../_lib/section-colour';
import {
  PROJECT_FIELDS,
  PROJECT_SECTIONS,
  type ProjectFieldDef,
} from '../../../../_lib/project-fields';

/**
 * ۲-۱, six sections.
 *
 * The colour reasoning is in `_lib/project-fields.ts`: `DmsProject` has no
 * arrays and no nested objects, so sections 1–4 are "base info (flat fields)"
 * — an existing row in the estate's table, and blue. Sections 5 and 6 are
 * AMBER: Financial, kind 13, assigned 2026-09-08. Sectioning is for
 * readability at 46 columns; the COLOUR is the claim about kind.
 *
 * The Operations card is the last child INSIDE the fieldset, so the pending
 * state disables it along with everything else.
 */
export function ProjectForm({
  project,
  actor,
}: {
  project: DmsProject;
  actor: DmsActor;
}) {
  const { t } = useTranslation('dms');
  const queryClient = useQueryClient();

  // Strings throughout: a cleared number is '' and must not be saved as 0.
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(project),
  );

  useEffect(() => {
    setValues(initialValues(project));
  }, [project]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateProject({ id: project.id, patch: toPatch(values), actor }),
    onSuccess: (saved) => {
      toast.success(t('projectSaved', { defaultValue: 'Project saved' }));
      queryClient.setQueryData(['dms', 'project', project.id], saved);
      void queryClient.invalidateQueries({ queryKey: ['dms', 'projects'] });
    },
    onError: (error) => {
      toast.error(
        isDmsError(error)
          ? `${error.message} (${error.code})`
          : t('projectSaveFailed', {
              defaultValue: 'The project could not be saved.',
            }),
      );
    },
  });

  // Every non-optional column on DmsProject, not just the obvious one. A
  // required field left empty must not reach the store at all — see toPatch.
  const missingRequired = PROJECT_FIELDS.filter(
    (f) => f.required && (values[f.key] ?? '').trim().length === 0,
  );

  return (
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
        {PROJECT_SECTIONS.map((section) => (
          <div
            key={section.id}
            className={SECTION_COLOUR[section.colour].border}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className={SECTION_COLOUR[section.colour].badge}>
                    {section.number}
                  </span>
                  {t(`projectSection_${section.id}`, {
                    defaultValue: section.label,
                  })}
                  {section.id === 'identity' && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {project.projectCode}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {PROJECT_FIELDS.filter((f) => f.section === section.id).map(
                    (field) => (
                      <FieldInput
                        key={field.key}
                        field={field}
                        value={values[field.key] ?? ''}
                        onChange={(v) =>
                          setValues((prev) => ({ ...prev, [field.key]: v }))
                        }
                      />
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}

        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
          <Card>
            <CardContent className="py-4 flex items-center gap-2">
              <Button
                variant="primary"
                disabled={saveMutation.isPending || missingRequired.length > 0}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending
                  ? t('saving', { defaultValue: 'Saving…' })
                  : t('save', { defaultValue: 'Save' })}
              </Button>
              {missingRequired.length > 0 && (
                <span className="text-sm text-destructive">
                  {t('requiredFieldsMissing', {
                    defaultValue: 'Required:',
                  })}{' '}
                  {missingRequired
                    .map((f) =>
                      t(`projectField_${f.key}`, { defaultValue: f.label }),
                    )
                    .join(', ')}
                </span>
              )}
            </CardContent>
          </Card>
        </div>
      </fieldset>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ProjectFieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation('dms');
  const id = `project-${field.key}`;
  const label = t(`projectField_${field.key}`, { defaultValue: field.label });

  if (field.kind === 'boolean') {
    return (
      <div className="flex items-center gap-2 pt-6">
        <Checkbox
          id={id}
          checked={value === 'true'}
          onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')}
        />
        <label className="text-sm font-medium" htmlFor={id}>
          {label}
        </label>
      </div>
    );
  }

  return (
    <div className={field.kind === 'longtext' ? 'space-y-1.5 md:col-span-2 xl:col-span-3' : 'space-y-1.5'}>
      <label className="text-sm font-medium block" htmlFor={id}>
        {label}
      </label>
      {field.kind === 'longtext' ? (
        <Textarea
          id={id}
          className="min-h-20"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          id={id}
          type={field.kind === 'date' ? 'date' : undefined}
          inputMode={field.kind === 'number' ? 'decimal' : undefined}
          value={value}
          onChange={(e) =>
            onChange(
              // Normalised on the way in: a Persian-keyboard '۱۴۰۱' must not
              // reach Number() as NaN and be stored as a missing value.
              field.kind === 'number'
                ? toEnglishDigits(e.target.value)
                : e.target.value,
            )
          }
        />
      )}
    </div>
  );
}

function initialValues(project: DmsProject): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of PROJECT_FIELDS) {
    const current = project[field.key];
    out[field.key] =
      current === undefined || current === null ? '' : String(current);
  }
  return out;
}

/**
 * A cleared value becomes `undefined` — absent — never 0 or false. A contract
 * with an overhead factor of zero and one where nobody entered it are
 * different facts, and only one of them is a number.
 */
function toPatch(values: Record<string, string>): ProjectPatch {
  const patch: Record<string, string | number | boolean | undefined> = {};
  for (const field of PROJECT_FIELDS) {
    const raw = values[field.key] ?? '';
    if (field.kind === 'number') {
      patch[field.key] = parseOptionalNumber(raw);
    } else if (field.kind === 'boolean') {
      patch[field.key] = raw === 'true' ? true : raw === 'false' ? false : undefined;
    } else {
      const trimmed = raw.trim();
      patch[field.key] = trimmed.length > 0 ? trimmed : undefined;
    }

    // A REQUIRED field is never sent as undefined. ProjectPatch is a Partial,
    // so `{ ...existing, ...patch }` would spread undefined OVER a required
    // property and leave the stored record structurally invalid — while still
    // typechecking, because Partial permits undefined. The save button already
    // refuses this state; omitting the key here is the second refusal behind it.
    if (patch[field.key] === undefined && field.required) {
      delete patch[field.key];
    }
  }
  return patch as ProjectPatch;
}
