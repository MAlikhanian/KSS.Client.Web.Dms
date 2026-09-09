'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError } from '@/lib/dms/errors';
import { updateVessel } from '@/lib/dms/mock-store';
import type { DmsActor, DmsVessel, VesselPatch } from '@/lib/dms/types';
import { parseOptionalNumber, toEnglishDigits } from '../../../../_lib/digits';
import {
  VESSEL_FIELDS,
  VESSEL_FIELD_GROUPS,
  type VesselFieldDef,
} from '../../../../_lib/vessel-fields';

/**
 * ۲-۳'s specification, as ONE section.
 *
 * The reasoning for a single section rather than three is in
 * `_lib/vessel-fields.ts`: ۲-۳ is a flat table of scalars, the sub-groups here
 * are visual sub-headings that assert nothing about the schema, and splitting
 * them into numbered sections would mint two new kind→colour pairs in a table
 * that is estate-wide semantics and not ours to extend.
 *
 * Blue — "base info (flat fields)", which is an existing row in that table.
 */
export function VesselForm({
  vessel,
  actor,
}: {
  vessel: DmsVessel;
  actor: DmsActor;
}) {
  const { t } = useTranslation('dms');
  const queryClient = useQueryClient();

  // Form state is strings: a number input that has been cleared is '' rather
  // than 0, and '' must not become a measurement of zero on save.
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(vessel),
  );

  useEffect(() => {
    setValues(initialValues(vessel));
  }, [vessel]);

  const saveMutation = useMutation({
    mutationFn: () => updateVessel({ id: vessel.id, patch: toPatch(values), actor }),
    onSuccess: (saved) => {
      toast.success(t('vesselSaved', { defaultValue: 'Vessel saved' }));
      queryClient.setQueryData(['dms', 'vessel', vessel.id], saved);
      void queryClient.invalidateQueries({ queryKey: ['dms', 'vessels'] });
    },
    onError: (error) => {
      toast.error(
        isDmsError(error)
          ? `${error.message} (${error.code})`
          : t('vesselSaveFailed', { defaultValue: 'The vessel could not be saved.' }),
      );
    },
  });

  // Every non-optional column on DmsVessel — see toPatch for why an empty
  // required field must not reach the store.
  const missingRequired = VESSEL_FIELDS.filter(
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
        <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  1
                </span>
                {t('vesselSpecification', {
                  defaultValue: 'Technical specification',
                })}
                <span className="text-sm font-normal text-muted-foreground">
                  {vessel.vesselCode}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {VESSEL_FIELD_GROUPS.map((group) => (
                <div key={group.id} className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {t(`vesselGroup_${group.id}`, { defaultValue: group.label })}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {VESSEL_FIELDS.filter((f) => f.group === group.id).map((field) => (
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
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Operations card — INSIDE the fieldset, as its last child. */}
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
                      t(`vesselField_${f.key}`, { defaultValue: f.label }),
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
  field: VesselFieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation('dms');
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium block" htmlFor={`vessel-${field.key}`}>
        {t(`vesselField_${field.key}`, { defaultValue: field.label })}
      </label>
      <Input
        id={`vessel-${field.key}`}
        value={value}
        inputMode={field.kind === 'number' ? 'decimal' : undefined}
        onChange={(e) =>
          onChange(
            // Normalised on the way in, so a Persian-keyboard '۱۹۹۸' does not
            // reach Number() as NaN and get stored as a missing value.
            field.kind === 'number'
              ? toEnglishDigits(e.target.value)
              : e.target.value,
          )
        }
      />
    </div>
  );
}

function initialValues(vessel: DmsVessel): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of VESSEL_FIELDS) {
    const current = vessel[field.key];
    out[field.key] = current === undefined || current === null ? '' : String(current);
  }
  return out;
}

/**
 * Only fields the user actually filled are sent. A cleared number becomes
 * `undefined` — absent — rather than 0, which would be a measurement.
 */
function toPatch(values: Record<string, string>): VesselPatch {
  const patch: Record<string, string | number | undefined> = {};
  for (const field of VESSEL_FIELDS) {
    const raw = values[field.key] ?? '';
    if (field.kind === 'number') {
      patch[field.key] = parseOptionalNumber(raw);
    } else {
      const trimmed = raw.trim();
      patch[field.key] = trimmed.length > 0 ? trimmed : undefined;
    }

    // Never clear a required field to undefined — VesselPatch is a Partial,
    // so spreading undefined over a required property would leave the record
    // structurally invalid while still typechecking.
    if (patch[field.key] === undefined && field.required) {
      delete patch[field.key];
    }
  }
  return patch as VesselPatch;
}
