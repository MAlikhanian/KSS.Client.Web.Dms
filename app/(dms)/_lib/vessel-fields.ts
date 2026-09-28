import type { DmsVessel } from '@/lib/dms/types';

/**
 * ۲-۳ جدول مشخصات فنی شناورها, as a field list rather than as sections.
 *
 * WHY THIS IS ONE SECTION AND NOT SEVERAL. person/edit splits into numbered,
 * colour-coded sections because ITS data has kinds — emails, phones, addresses
 * are different sorts of thing. ۲-۳ is a single flat table of scalar
 * specifications with no sub-structure in the source. Splitting it into
 * "dimensions" and "power" would be structure we invented, and it would mint
 * two new kind→colour pairs — and the colour table is estate-wide semantics
 * that is not ours to extend. One section, blue ("base info, flat fields"),
 * which is an existing row in that table.
 *
 * The `group` field below is a plain visual sub-heading inside that one card.
 * It carries no colour and asserts nothing about the schema.
 */

export type VesselFieldKey = Exclude<keyof DmsVessel, 'id' | 'vesselCode'>;

export interface VesselFieldDef {
  key: VesselFieldKey;
  /** Non-optional on DmsVessel — see ProjectFieldDef.required. */
  required?: true;
  kind: 'text' | 'number';
  /** English default; the Persian label is the customer's own wording, quoted for reference. */
  label: string;
  specLabel: string;
  group: 'identity' | 'dimensions' | 'capability';
}

export const VESSEL_FIELDS: readonly VesselFieldDef[] = [
  { key: 'name', required: true, kind: 'text', label: 'Vessel name', specLabel: 'نام شناور', group: 'identity' },
  { key: 'vesselType', kind: 'text', label: 'Vessel type', specLabel: 'نوع شناور', group: 'identity' },
  { key: 'manufacturer', kind: 'text', label: 'Manufacturer', specLabel: 'سازنده', group: 'identity' },
  { key: 'buildYear', kind: 'number', label: 'Build year', specLabel: 'سال ساخت', group: 'identity' },
  { key: 'refitYear', kind: 'number', label: 'Refit year', specLabel: 'سال بازسازی', group: 'identity' },
  { key: 'portOfRegistry', kind: 'text', label: 'Port of registry', specLabel: 'بندر ثبت', group: 'identity' },
  { key: 'model', kind: 'text', label: 'Model', specLabel: 'مدل', group: 'identity' },

  { key: 'heightM', kind: 'number', label: 'Height (m)', specLabel: 'ارتفاع', group: 'dimensions' },
  { key: 'lengthWithLadderM', kind: 'number', label: 'Length with ladder (m)', specLabel: 'طول با نردبان', group: 'dimensions' },
  { key: 'pontoonLengthM', kind: 'number', label: 'Pontoon length (m)', specLabel: 'طول پانتون', group: 'dimensions' },
  { key: 'overallLengthM', kind: 'number', label: 'Overall length (m)', specLabel: 'طول کلی', group: 'dimensions' },
  { key: 'beamM', kind: 'number', label: 'Beam (m)', specLabel: 'عرض', group: 'dimensions' },
  // The FRD says «بر حسب تن یا کیلوگرم» and does not choose, so the label does
  // not claim a unit the source has not fixed.
  { key: 'weight', kind: 'number', label: 'Weight', specLabel: 'وزن', group: 'dimensions' },
  { key: 'draftM', kind: 'number', label: 'Draft (m)', specLabel: 'آبخور', group: 'dimensions' },

  { key: 'dredgingDepthM', kind: 'number', label: 'Dredging depth (m)', specLabel: 'عمق لایروبی', group: 'capability' },
  { key: 'cutterPowerKw', kind: 'number', label: 'Cutter power (kW)', specLabel: 'توان کاتر', group: 'capability' },
  { key: 'actualDailyCapacityM3', kind: 'number', label: 'Actual daily capacity (m³/day)', specLabel: 'ظرفیت واقعی روزانه', group: 'capability' },
  { key: 'enginePower', kind: 'number', label: 'Engine power', specLabel: 'توان موتور', group: 'capability' },
  { key: 'pumpShaftPower', kind: 'number', label: 'Pump shaft power', specLabel: 'توان شفت پمپ', group: 'capability' },
  { key: 'cutterShaftPower', kind: 'number', label: 'Cutter shaft power', specLabel: 'توان شفت کاتر', group: 'capability' },
  // «بر حسب گره یا واحد عملیاتی» — knots or an operational unit, unfixed.
  { key: 'speed', kind: 'number', label: 'Speed', specLabel: 'سرعت', group: 'capability' },
] as const;

export const VESSEL_FIELD_GROUPS: ReadonlyArray<{
  id: VesselFieldDef['group'];
  label: string;
}> = [
  { id: 'identity', label: 'Identification' },
  { id: 'dimensions', label: 'Dimensions' },
  { id: 'capability', label: 'Capability and power' },
];
