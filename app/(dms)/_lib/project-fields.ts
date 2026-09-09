import type { DmsProject } from '@/lib/dms/types';
import type { SectionColour } from './section-colour';

/**
 * ۲-۱ جدول پروژه‌ها — 46 FRD columns, as a field list carrying each one's
 * Persian label from the source.
 *
 * THE LABEL TRAVELS WITH THE FORM, not only with the type. When the FRD's
 * column names are confirmed, reconciliation happens against the thing the
 * screen actually renders rather than against a type definition one file away.
 *
 * ─── WHY ALL SIX SECTIONS ARE BLUE ──────────────────────────────────────────
 * The estate's kind→colour table classifies LIST-SHAPED sub-records — emails,
 * phones, addresses, documents, relationships — which is what makes "the same
 * data type looks identical across entities" a promise worth keeping. Row 2 is
 * the exception and it is the relevant one: "Base info (flat fields)", blue.
 *
 * `DmsProject` contains no arrays and no nested objects. All 46 columns are
 * scalars, so every section here is flat fields, and blue is the CORRECT
 * classification rather than a repeat for want of an alternative.
 *
 * Two mappings were considered and refused as stretches:
 *   - Parties as "Relationships" (pink) would promise a linked-record list and
 *     deliver six text boxes.
 *   - Notices and maps as "Documents" (cyan) would promise uploaded files,
 *     where ۲-۱ says «توضیح یا مسیر فایل نقشه‌ها» — a text description.
 *
 * The financial sections (5 and 6) now take AMBER — "Financial", kind 13,
 * assigned by Amanda on 2026-09-08 after DMS proposed it. They were blue until
 * then and blue was not wrong: money scalars ARE flat fields, so it was
 * correct-but-uninformative. Amber says which kind they are.
 *
 * The pair was proposed rather than minted here, because a design-system value
 * is not a per-zone decision — picking one locally is how a system acquires
 * thirteen shades of money.
 */

export type ProjectFieldKey = Exclude<
  keyof DmsProject,
  'id' | 'projectCode' | 'simulateUnavailable'
>;

export interface ProjectFieldDef {
  key: ProjectFieldKey;
  /**
   * Non-optional on DmsProject. A required field must never be cleared to
   * `undefined`: ProjectPatch is a Partial, so spreading an undefined value
   * over a required property would leave the record structurally invalid at
   * runtime while still typechecking.
   */
  required?: true;
  kind: 'text' | 'longtext' | 'number' | 'date' | 'boolean';
  /** English default. The Persian label is the FRD's own. */
  label: string;
  frdLabel: string;
  section: ProjectSectionId;
}

export type ProjectSectionId =
  | 'identity'
  | 'parties'
  | 'periods'
  | 'notices'
  | 'amounts'
  | 'guarantees';

export const PROJECT_SECTIONS: ReadonlyArray<{
  id: ProjectSectionId;
  number: number;
  label: string;
  colour: SectionColour;
}> = [
  { id: 'identity', number: 1, label: 'Contract identity', colour: 'blue' },
  { id: 'parties', number: 2, label: 'Parties', colour: 'blue' },
  { id: 'periods', number: 3, label: 'Dates, durations and periods', colour: 'blue' },
  { id: 'notices', number: 4, label: 'Official notices and attachments', colour: 'blue' },
  // Financial, kind 13 — assigned 2026-09-08. Not a correction of blue: money
  // scalars ARE flat fields, so blue was correct-but-uninformative. Amber says
  // which KIND they are.
  { id: 'amounts', number: 5, label: 'Amounts and factors', colour: 'amber' },
  { id: 'guarantees', number: 6, label: 'Guarantees and adjustment', colour: 'amber' },
];

export const PROJECT_FIELDS: readonly ProjectFieldDef[] = [
  // ── 1. Contract identity (7 editable; projectCode is shown read-only) ──
  { key: 'contractNumber', required: true, kind: 'text', label: 'Contract number', frdLabel: 'شماره قرارداد پیمان', section: 'identity' },
  { key: 'contractSubject', required: true, kind: 'text', label: 'Contract subject', frdLabel: 'موضوع پیمان/قرارداد', section: 'identity' },
  { key: 'executionArea', required: true, kind: 'text', label: 'Execution area', frdLabel: 'حوزه اجرایی پیمان/قرارداد', section: 'identity' },
  { key: 'projectType', kind: 'text', label: 'Project type', frdLabel: 'نوع پروژه', section: 'identity' },
  { key: 'initialDredgingVolumeM3', required: true, kind: 'number', label: 'Initial dredging volume (m³)', frdLabel: 'حجم اولیه عملیات لایروبی', section: 'identity' },
  { key: 'workSummary', kind: 'longtext', label: 'Work summary', frdLabel: 'شرح مختصر کار و اهداف قرارداد', section: 'identity' },
  { key: 'geographicScope', kind: 'longtext', label: 'Geographic scope', frdLabel: 'محدوده جغرافیایی اجرای کار', section: 'identity' },

  // ── 2. Parties (6) ──
  { key: 'contractorName', kind: 'text', label: 'Contractor', frdLabel: 'پیمانکار', section: 'parties' },
  { key: 'supervisingConsultantName', kind: 'text', label: 'Supervising consultant', frdLabel: 'مشاور نظارت', section: 'parties' },
  { key: 'clientName', kind: 'text', label: 'Client', frdLabel: 'کارفرما', section: 'parties' },
  { key: 'clientProjectManager', kind: 'text', label: 'Client project manager', frdLabel: 'مدیر پروژه کارفرما', section: 'parties' },
  { key: 'consultantProjectManager', kind: 'text', label: 'Consultant project manager', frdLabel: 'مدیر پروژه مشاور نظارت', section: 'parties' },
  { key: 'contractorProjectManager', kind: 'text', label: 'Contractor project manager', frdLabel: 'مدیر پروژه پیمانکار', section: 'parties' },

  // ── 3. Dates, durations and periods (9) ──
  { key: 'contractDate', kind: 'date', label: 'Contract date', frdLabel: 'تاریخ پیمان/قرارداد', section: 'periods' },
  { key: 'siteHandoverDate', kind: 'date', label: 'Site handover date', frdLabel: 'تاریخ تحویل زمین', section: 'periods' },
  // «بر حسب روز یا ماه» — the FRD does not choose, so the label does not claim one.
  { key: 'initialDuration', kind: 'number', label: 'Initial duration', frdLabel: 'مدت اولیه پیمان/قرارداد', section: 'periods' },
  { key: 'extensionDuration', kind: 'number', label: 'Extension duration', frdLabel: 'مدت تمدید', section: 'periods' },
  { key: 'warrantyPeriodDuration', kind: 'number', label: 'Warranty period duration', frdLabel: 'مدت دوره تضمین', section: 'periods' },
  { key: 'provisionalHandoverDate', kind: 'date', label: 'Provisional handover date', frdLabel: 'تاریخ تحویل موقت', section: 'periods' },
  { key: 'warrantyStartDate', kind: 'date', label: 'Warranty start date', frdLabel: 'تاریخ شروع دوره تضمین', section: 'periods' },
  { key: 'warrantyEndDate', kind: 'date', label: 'Warranty end date', frdLabel: 'تاریخ پایان دوره تضمین', section: 'periods' },
  { key: 'finalHandoverDate', kind: 'date', label: 'Final handover date', frdLabel: 'تاریخ تحویل قطعی', section: 'periods' },

  // ── 4. Official notices and attachments (6) ──
  { key: 'contractNoticeLetterNumber', kind: 'text', label: 'Contract notice letter number', frdLabel: 'شماره نامه ابلاغ پیمان/قرارداد', section: 'notices' },
  { key: 'contractNoticeLetterDate', kind: 'date', label: 'Contract notice letter date', frdLabel: 'تاریخ نامه ابلاغ پیمان/قرارداد', section: 'notices' },
  { key: 'amountIncreaseNoticeNumber', kind: 'text', label: 'Amount-increase notice number', frdLabel: 'شماره نامه ابلاغیه افزایش مبلغ', section: 'notices' },
  { key: 'amountIncreaseNoticeDate', kind: 'date', label: 'Amount-increase notice date', frdLabel: 'تاریخ ابلاغیه افزایش مبلغ پیمان/قرارداد', section: 'notices' },
  { key: 'provisionalHandoverLetterNumber', kind: 'text', label: 'Provisional handover letter number', frdLabel: 'شماره نامه تحویل موقت', section: 'notices' },
  { key: 'attachedMaps', kind: 'longtext', label: 'Attached maps', frdLabel: 'نقشه‌های منضم به قرارداد', section: 'notices' },

  // ── 5. Amounts and factors (10) ──
  { key: 'initialContractAmount', kind: 'number', label: 'Initial contract amount', frdLabel: 'مبلغ اولیه قرارداد', section: 'amounts' },
  { key: 'approvedContractAmount', kind: 'number', label: 'Approved contract amount', frdLabel: 'مبلغ قرارداد پس از آخرین تغییرات تایید شده', section: 'amounts' },
  { key: 'maxAmountIncreasePercent', kind: 'number', label: 'Max amount increase (%)', frdLabel: 'درصد سقف افزایش مبلغ قرارداد', section: 'amounts' },
  { key: 'overheadFactor', kind: 'number', label: 'Overhead factor', frdLabel: 'ضریب بالاسری', section: 'amounts' },
  { key: 'proposedFactor', kind: 'number', label: 'Proposed factor', frdLabel: 'ضریب پیشنهادی', section: 'amounts' },
  { key: 'regionalFactor', kind: 'number', label: 'Regional factor', frdLabel: 'ضریب منطقه‌ای', section: 'amounts' },
  { key: 'finalPaymentCertificateAmount', kind: 'number', label: 'Final payment certificate amount', frdLabel: 'مبلغ صورت‌وضعیت یا گواهی پرداخت نهایی', section: 'amounts' },
  { key: 'finalAdjustmentCertificateAmount', kind: 'number', label: 'Final adjustment certificate amount', frdLabel: 'مبلغ صورت‌وضعیت یا گواهی تعدیل نهایی', section: 'amounts' },
  { key: 'advancePaymentPercent', kind: 'number', label: 'Advance payment (%)', frdLabel: 'درصد پیش‌پرداخت', section: 'amounts' },
  { key: 'estimateCriterionType', kind: 'text', label: 'Estimate criterion type', frdLabel: 'نوع معیار برآورد', section: 'amounts' },

  // ── 6. Guarantees and adjustment (7) ──
  { key: 'performanceBondAmount', kind: 'number', label: 'Performance bond amount', frdLabel: 'مبلغ ضمانت‌نامه حسن انجام کار', section: 'guarantees' },
  { key: 'performanceBondNumber', kind: 'text', label: 'Performance bond number', frdLabel: 'شماره ضمانت‌نامه حسن انجام کار', section: 'guarantees' },
  { key: 'performanceBondExpiryDate', kind: 'date', label: 'Performance bond expiry', frdLabel: 'تاریخ اعتبار ضمانت‌نامه', section: 'guarantees' },
  { key: 'performanceRetentionPercent', kind: 'number', label: 'Performance retention (%)', frdLabel: 'درصد کسور حسن انجام کار', section: 'guarantees' },
  { key: 'hasAdjustment', kind: 'boolean', label: 'Subject to adjustment', frdLabel: 'آیا تعدیل دارد یا خیر', section: 'guarantees' },
  { key: 'adjustmentBaseIndex', kind: 'text', label: 'Adjustment base index', frdLabel: 'شاخص مبنای تعدیل', section: 'guarantees' },
  { key: 'provisionalIndexFactorPercent', kind: 'number', label: 'Provisional index factor (%)', frdLabel: 'درصد ضریب شاخص‌های موقت', section: 'guarantees' },
] as const;
