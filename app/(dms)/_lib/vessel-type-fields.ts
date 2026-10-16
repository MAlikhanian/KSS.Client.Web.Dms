import type { DmsVessel } from '@/lib/dms/types';
import { VESSEL_FIELDS, type VesselFieldDef, type VesselFieldKey } from './vessel-fields';

/**
 * The fields each vessel type's form shows, in the customer's order: his four
 * forms, each mapped onto the columns that already exist. An item of his with
 * no existing column is not here; nothing stands in for it.
 *
 * His «طول» is the overall length and the cutter's «توان کل» is the engine
 * power; both are shown with his own titles (VESSEL_TYPE_TITLES_FA).
 *
 * A vessel with no type, or a type not listed here, gets every field, as
 * before.
 */
export const VESSEL_TYPE_FIELDS: Readonly<Record<string, readonly VesselFieldKey[]>> = {
  HOPPER_SUCTION: [
    'name', 'vesselType', 'manufacturer', 'buildYear', 'refitYear', 'model', 'portOfRegistry',
    'overallLengthM', 'lengthWithLadderM', 'beamM',
    'dredgingDepthM', 'pumpShaftPower', 'speed',
  ],
  CUTTER_SUCTION: [
    'name', 'vesselType', 'manufacturer', 'buildYear', 'refitYear', 'portOfRegistry', 'model',
    'overallLengthM', 'lengthWithLadderM', 'beamM', 'heightM', 'draftM',
    'dredgingDepthM', 'cutterPowerKw', 'enginePower',
  ],
  SPLIT_BARGE: [
    'name', 'vesselType', 'manufacturer', 'buildYear', 'refitYear', 'model', 'portOfRegistry',
    'overallLengthM', 'beamM',
    'dredgingDepthM', 'speed',
  ],
  MULTICAT: [
    'name', 'vesselType', 'manufacturer', 'buildYear', 'refitYear', 'portOfRegistry',
    'overallLengthM', 'beamM',
    'enginePower', 'speed',
  ],
};

/**
 * HIS TITLES ON THE TYPED FORMS, in Persian. English keeps our labels, and the
 * full form for a vessel with no type keeps today's labels.
 *
 * The rule, for every field: the WORD is his, byte for byte as written in his
 * four forms; the spacing and the unit in brackets are the same on all four,
 * written "word (unit)" like the other vessel labels, with the unit shown when
 * any of his forms gives one. He wrote some titles with and some without a
 * space before the bracket, and gave a unit on some forms only; that is typing,
 * not meaning. A field whose WORD differs between his forms keeps each form's
 * own word (engine power: «توان کل» on the cutter, «توان موتور» on the
 * multicat). Only titles that differ from the shared label are listed.
 */
export const VESSEL_TYPE_TITLES_FA: Readonly<
  Record<string, Readonly<Partial<Record<VesselFieldKey, string>>>>
> = {
  HOPPER_SUCTION: { overallLengthM: 'طول (متر)' },
  CUTTER_SUCTION: { overallLengthM: 'طول (متر)', enginePower: 'توان کل (کیلووات)' },
  SPLIT_BARGE: { overallLengthM: 'طول (متر)' },
  MULTICAT: { overallLengthM: 'طول (متر)' },
};

/** True when the type has its own form. */
export function hasTypeForm(vesselType: string | undefined): boolean {
  return typeof vesselType === 'string' && Object.prototype.hasOwnProperty.call(VESSEL_TYPE_FIELDS, vesselType);
}

/** His title for this field on this type's form, or undefined where the shared label applies. */
export function typeTitleFa(vesselType: string | undefined, key: VesselFieldKey): string | undefined {
  if (!hasTypeForm(vesselType)) return undefined;
  return VESSEL_TYPE_TITLES_FA[vesselType as string][key];
}

/** The fields the form shows for this type, in order; every field when it has no form of its own. */
export function fieldsForType(vesselType: string | undefined): readonly VesselFieldDef[] {
  if (!hasTypeForm(vesselType)) return VESSEL_FIELDS;
  const byKey = new Map(VESSEL_FIELDS.map((f) => [f.key, f]));
  return VESSEL_TYPE_FIELDS[vesselType as string].map((key) => byKey.get(key) as VesselFieldDef);
}

/**
 * The stored values of the fields a type's form does not show. An edit sends
 * the whole form as its patch, and a present key holding nothing reaches the
 * service as `null`, which clears it. So each hidden field goes back exactly as
 * it was read; one with nothing stored is left out ("unchanged").
 */
export function hiddenStoredValues(
  vessel: DmsVessel,
  shown: readonly VesselFieldDef[],
): Partial<Record<VesselFieldKey, string | number>> {
  const shownKeys = new Set(shown.map((f) => f.key));
  const out: Partial<Record<VesselFieldKey, string | number>> = {};
  for (const field of VESSEL_FIELDS) {
    if (shownKeys.has(field.key)) continue;
    const stored: unknown = vessel[field.key];
    if (typeof stored === 'string' || typeof stored === 'number') out[field.key] = stored;
  }
  return out;
}
