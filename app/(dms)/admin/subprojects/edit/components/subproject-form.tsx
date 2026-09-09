'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError } from '@/lib/dms/errors';
import { updateSubproject } from '@/lib/dms/mock-store';
import type {
  DmsActor,
  DmsSubproject,
  SubprojectPatch,
} from '@/lib/dms/types';
import { parseOptionalNumber, toEnglishDigits } from '../../../../_lib/digits';
import { SECTION_COLOUR } from '../../../../_lib/section-colour';
import {
  SUBPROJECT_FIELDS,
  SUBPROJECT_SECTIONS,
  type SubprojectFieldDef,
} from '../../../../_lib/subproject-fields';

/**
 * ۲-۲, five sections. Four are blue — all scalars, so "base info (flat
 * fields)" — and section 5, Amounts, is AMBER: Financial, kind 13. Colour
 * follows the kind, so it matches projects sections 5 and 6.
 *
 * `subprojectCode` is displayed and not editable. ۲-۲ composes it from the
 * parent project's code plus a row number, so it is neither the user's to set
 * nor meaningful apart from its parent.
 */
export function SubprojectForm({
  subproject,
  actor,
}: {
  subproject: DmsSubproject;
  actor: DmsActor;
}) {
  const { t } = useTranslation('dms');
  const queryClient = useQueryClient();

  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(subproject),
  );

  useEffect(() => {
    setValues(initialValues(subproject));
  }, [subproject]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateSubproject({ id: subproject.id, patch: toPatch(values), actor }),
    onSuccess: (saved) => {
      toast.success(t('subprojectSaved', { defaultValue: 'Subproject saved' }));
      queryClient.setQueryData(['dms', 'subproject', subproject.id], saved);
      void queryClient.invalidateQueries({ queryKey: ['dms', 'subprojects'] });
    },
    onError: (error) => {
      toast.error(
        isDmsError(error)
          ? `${error.message} (${error.code})`
          : t('subprojectSaveFailed', {
              defaultValue: 'The subproject could not be saved.',
            }),
      );
    },
  });

  const missingRequired = SUBPROJECT_FIELDS.filter(
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
        {SUBPROJECT_SECTIONS.map((section) => (
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
                  {t(`subprojectSection_${section.id}`, {
                    defaultValue: section.label,
                  })}
                  {section.id === 'identity' && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {subproject.subprojectCode}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {SUBPROJECT_FIELDS.filter(
                    (f) => f.section === section.id,
                  ).map((field) => (
                    <FieldInput
                      key={field.key}
                      field={field}
                      value={values[field.key] ?? ''}
                      onChange={(v) =>
                        setValues((prev) => ({ ...prev, [field.key]: v }))
                      }
                    />
                  ))}
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
                  {t('requiredFieldsMissing', { defaultValue: 'Required:' })}{' '}
                  {missingRequired
                    .map((f) =>
                      t(`subprojectField_${f.key}`, { defaultValue: f.label }),
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
  field: SubprojectFieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation('dms');
  const id = `subproject-${field.key}`;
  const label = t(`subprojectField_${field.key}`, { defaultValue: field.label });

  return (
    <div
      className={
        field.kind === 'longtext'
          ? 'space-y-1.5 md:col-span-2 xl:col-span-3'
          : 'space-y-1.5'
      }
    >
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

function initialValues(subproject: DmsSubproject): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of SUBPROJECT_FIELDS) {
    const current = subproject[field.key];
    out[field.key] =
      current === undefined || current === null ? '' : String(current);
  }
  return out;
}

/** A cleared value is absent, never 0 — and a required key is never blanked. */
function toPatch(values: Record<string, string>): SubprojectPatch {
  const patch: Record<string, string | number | undefined> = {};
  for (const field of SUBPROJECT_FIELDS) {
    const raw = values[field.key] ?? '';
    if (field.kind === 'number') {
      patch[field.key] = parseOptionalNumber(raw);
    } else {
      const trimmed = raw.trim();
      patch[field.key] = trimmed.length > 0 ? trimmed : undefined;
    }

    // See project-form: Partial<T> types a required property as `T[K] |
    // undefined`, so sending undefined would spread over it. The store refuses
    // this independently; omitting the key here is the affordance in front.
    if (patch[field.key] === undefined && field.required) {
      delete patch[field.key];
    }
  }
  return patch as SubprojectPatch;
}
