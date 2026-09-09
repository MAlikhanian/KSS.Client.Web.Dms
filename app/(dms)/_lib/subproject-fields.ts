import type { DmsSubproject } from '@/lib/dms/types';
import type { SectionColour } from './section-colour';

/**
 * ۲-۲ جدول زیرپروژه‌ها — 24 FRD columns, each carrying its Persian label.
 *
 * Same shape and same colour reasoning as `project-fields.ts`: `DmsSubproject`
 * is all scalars, no arrays and no nested objects, so the sections are "base
 * info (flat fields)" — blue — EXCEPT Amounts, which is Financial, kind 13,
 * amber. Colour follows the kind, not the screen.
 *
 * `subprojectCode` is shown read-only and is not in this list: ۲-۲ generates it
 * from the parent project's code plus a row number.
 */

export type SubprojectFieldKey = Exclude<
  keyof DmsSubproject,
  'id' | 'projectId' | 'subprojectCode'
>;

export interface SubprojectFieldDef {
  key: SubprojectFieldKey;
  /** Non-optional on DmsSubproject — see ProjectFieldDef.required. */
  required?: true;
  kind: 'text' | 'longtext' | 'number' | 'date';
  label: string;
  frdLabel: string;
  section: SubprojectSectionId;
}

export type SubprojectSectionId =
  | 'identity'
  | 'periods'
  | 'parties'
  | 'maps'
  | 'amounts';

export const SUBPROJECT_SECTIONS: ReadonlyArray<{
  id: SubprojectSectionId;
  number: number;
  label: string;
  colour: SectionColour;
}> = [
  { id: 'identity', number: 1, label: 'Identity and scope', colour: 'blue' },
  { id: 'periods', number: 2, label: 'Dates, durations and notices', colour: 'blue' },
  { id: 'parties', number: 3, label: 'Parties', colour: 'blue' },
  { id: 'maps', number: 4, label: 'Maps and attachments', colour: 'blue' },
  // Financial, kind 13 — the same kind as projects' sections 5 and 6. Colour
  // follows the KIND, not the screen: the same sort of data has to look the
  // same wherever it appears, or the palette stops carrying information.
  { id: 'amounts', number: 5, label: 'Amounts', colour: 'amber' },
];

export const SUBPROJECT_FIELDS: readonly SubprojectFieldDef[] = [
  // ── 1. Identity and scope (8) ──
  { key: 'title', required: true, kind: 'text', label: 'Subproject title', frdLabel: 'عنوان زیرپروژه', section: 'identity' },
  { key: 'subprojectNumber', kind: 'text', label: 'Subproject number', frdLabel: 'شماره زیرپروژه', section: 'identity' },
  { key: 'location', kind: 'text', label: 'Location', frdLabel: 'موقعیت جغرافیایی', section: 'identity' },
  { key: 'summary', kind: 'longtext', label: 'Summary', frdLabel: 'شرح مختصر زیرپروژه', section: 'identity' },
  /**
   * ۲-۲ carries the vessel as free TEXT. This is the THIRD place a vessel
   * appears — ۲-۴ is the authoritative one-to-one and ۲-۷ denormalises it — so
   * these two are recorded because they are in the schema and are never read
   * as the link. getProjectVessel is the link.
   */
  { key: 'vesselType', kind: 'text', label: 'Vessel type', frdLabel: 'نوع شناور', section: 'identity' },
  { key: 'vesselNameUsed', kind: 'text', label: 'Vessel used', frdLabel: 'نام شناور مورد استفاده', section: 'identity' },
  { key: 'initialVolumeM3', kind: 'number', label: 'Initial volume (m³)', frdLabel: 'حجم اولیه', section: 'identity' },
  { key: 'finalVolumeM3', kind: 'number', label: 'Final volume (m³)', frdLabel: 'حجم نهایی', section: 'identity' },

  // ── 2. Dates, durations and notices (6) ──
  { key: 'noticeDate', kind: 'date', label: 'Notice date', frdLabel: 'تاریخ ابلاغ', section: 'periods' },
  { key: 'noticeLetterNumber', kind: 'text', label: 'Notice letter number', frdLabel: 'شماره نامه ابلاغ', section: 'periods' },
  // «بر حسب روز یا ماه» — the FRD does not choose, so the label does not claim one.
  { key: 'initialDuration', kind: 'number', label: 'Initial duration', frdLabel: 'مدت اولیه', section: 'periods' },
  { key: 'startDate', kind: 'date', label: 'Start date', frdLabel: 'تاریخ شروع', section: 'periods' },
  { key: 'plannedEndDate', kind: 'date', label: 'Planned end date', frdLabel: 'تاریخ اتمام بر اساس مدت اولیه', section: 'periods' },
  { key: 'deliveryDate', kind: 'date', label: 'Delivery date', frdLabel: 'تاریخ تحویل یا پایان عملیات', section: 'periods' },

  // ── 3. Parties (3) ──
  { key: 'operatorEntityName', kind: 'text', label: 'Operator', frdLabel: 'بهره‌بردار', section: 'parties' },
  { key: 'operatorProjectManager', kind: 'text', label: 'Operator project manager', frdLabel: 'مدیر پروژه بهره‌بردار', section: 'parties' },
  { key: 'siteManager', kind: 'text', label: 'Site manager', frdLabel: 'مدیر کارگاه', section: 'parties' },

  // ── 4. Maps and attachments (2) ──
  { key: 'initialMaps', kind: 'longtext', label: 'Initial maps', frdLabel: 'نقشه‌های اولیه', section: 'maps' },
  { key: 'asBuiltMaps', kind: 'longtext', label: 'As-built maps', frdLabel: 'نقشه‌های چون‌ساخت', section: 'maps' },

  // ── 5. Amounts (4) ──
  { key: 'initialAmount', kind: 'number', label: 'Initial amount', frdLabel: 'مبلغ اولیه', section: 'amounts' },
  { key: 'finalAmount', kind: 'number', label: 'Final amount', frdLabel: 'مبلغ نهایی', section: 'amounts' },
  { key: 'provisionalAdjustmentAmount', kind: 'number', label: 'Provisional adjustment amount', frdLabel: 'مبلغ تعدیل موقت', section: 'amounts' },
  { key: 'finalAdjustmentAmount', kind: 'number', label: 'Final adjustment amount', frdLabel: 'مبلغ تعدیل نهایی', section: 'amounts' },
] as const;
