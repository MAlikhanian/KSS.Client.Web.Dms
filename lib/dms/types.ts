/**
 * Shared types for DMS — the Dredging Management System.
 *
 * The customer-facing Persian name lives in exactly one i18n string
 * (i18n/dms/fa.json) and never appears in code. Internally this is DMS
 * everywhere: slug, folder, identifiers.
 *
 * SCOPE: frontend and mock data only. There is no database and no backend
 * service behind these types. They describe the shape the eventual API will
 * return, so that swapping lib/dms/mock-store.ts for real calls is one line
 * per function rather than a rewrite of every call site.
 *
 * ⛔ PROVENANCE DESCRIBES WHERE A TERM CAME FROM. IT IS NOT A SCOPE FOR
 * CHECKING ANYTHING, AND MUST NOT BE USED AS ONE.
 *
 * It is the obvious filter — "his words are safe, ours need review" — which
 * is exactly why this warning sits here, where someone reaches for it.
 *
 * THREE COUNTEREXAMPLES, ALL FOUND ON 2026-09-09, ALL SHIPPED WRONG:
 *   phaseTransport  «حرکت به تخلیه»  — his words, from ۲-۸. Wrong: that names
 *                   a MOMENT ("start of movement to discharge"), and the slot
 *                   wanted the PHASE, which §4 calls «حمل».
 *   tOp             «زمان عملیاتی»    — his word. Wrong: the adjective clashes
 *                   with his own «توقف عملیاتی», a collision he had avoided by
 *                   naming the quantity «مجموع زمان عملیات».
 *   tAv             «زمان در دسترس»   — his word, respaced. Wrong: he writes
 *                   «کل زمان دردسترس», joined.
 *
 * ⚠ NOT ONE OF THE THREE WAS AUTHORED BY US. Each was his vocabulary,
 * correctly transcribed, and used in the wrong role — so a check scoped to
 * "the terms we wrote" would have excluded all three by construction. The
 * error a provenance filter cannot see is the one it is most likely to be
 * used against.
 *
 * CONSEQUENCE: every translated key gets a sense read, looked-up ones
 * included. There is no provenance shortcut.
 *
 * ─── PROVENANCE, THREE LEVELS ───────────────────────────────────────────────
 * Reconciled field-by-field against the FRD
 * (amir-kariz-dms-FRD-msg167-168-extracted.txt, 185 lines), read at source.
 *
 *   `FRD ۲-n <identifier> — PARSED`
 *       Tables ۲-۴ and ۲-۷ only. These are the two the document gives as
 *       Latin snake_case identifiers, so the NAME is the document's own. They
 *       arrive as run-together strings; the field boundaries are our reading,
 *       though the script changes at every boundary so only the descriptions
 *       could mis-split.
 *
 *   `PROPOSED — name ours, FRD ۲-n «label»`
 *       The seven Persian-labelled tables. The document gives a LABEL, never
 *       an identifier. The field is sourced; the English name is a translation
 *       and is ours until confirmed. The label is quoted so reconciliation is
 *       exact rather than interpretive.
 *
 *   `PROPOSED — not in FRD`
 *       Ours entirely, including fields we add for our own trace. The swap
 *       needs to know what it is adding or dropping.
 *
 * One grep for `PROPOSED` finds everything not yet confirmed as a name.
 *
 * ─── UNITS: THE SOURCE IS NOT CONSISTENT AND WE DO NOT PAPER OVER IT ────────
 * ۲-۹ gives stoppage duration «بر حسب ساعت» — DECIMAL HOURS. §4 computes
 * T_AV in MINUTES (۱۴۴۰ دقیقه). ۲-۸ gives cycles no duration field at all,
 * only timestamps. So there is no single unit in the source, and a silent
 * mismatch here would be invisible in every number it produced.
 *
 * The rule: each field keeps the FRD's own unit and says so in its name
 * (`durationHours`), and conversion happens in exactly ONE place — kpi.ts —
 * never at a call site.
 */

// ─── Roles ──────────────────────────────────────────────────────────────────

/**
 * The three DMS roles, §1. These are DMS's own roles — they do not exist in
 * the Auth service and never come from the next-auth session. lib/dms/session.ts
 * is the single module that resolves the current one.
 */
export type DmsRole =
  /**
   * کنترل پروژه (دفتر مرکزی) — head office. §1 scopes its full CRUD to the
   * DEFINITION tables: «تعریف پروژه‌ها، زیرپروژه‌ها، شناورها، قراردادها،
   * پرسنل و تخصیص عوامل» plus the dashboard. It is NOT a reviewer — §1 gives
   * review to سرپرست شناور alone, and ۲-۷'s `approved_by` is
   * «شناسه سرپرست تاییدکننده».
   */
  | 'ProjectControl'
  /** اپراتور (شناور) — enters the day; may edit until submission. */
  | 'Operator'
  /** سرپرست شناور — approves, or rejects with a mandatory reason. */
  | 'VesselSupervisor';

export const ALL_DMS_ROLES: readonly DmsRole[] = [
  'ProjectControl',
  'Operator',
  'VesselSupervisor',
] as const;

/** Who is performing a write. Supplied by lib/dms/session.ts, never by a component. */
export interface DmsActor {
  /**
   * ۲-۷ references `Users.id`, and no Users table is among the nine — the FRD
   * assumes an auth system it does not specify. With no backend that is our
   * session module.
   */
  userId: string; // PROPOSED — not in FRD (Users is referenced, never defined)
  userName: string; // PROPOSED — not in FRD
  role: DmsRole;
}

/**
 * ۲-۶ «نقش‌های پروژه (جدول یا لیست مرجع)» — the document itself hedges
 * whether this is a table or a reference list, so it is NOT one of the nine.
 * Seven values, given as Persian labels only.
 */
/**
 * ۲-۶'s seven project roles, as VALUES — the type is derived from them.
 *
 * It was a type-only union until ۲-۶ needed a role picker. A screen needs the
 * seven at runtime, and the obvious move is to write them out again in the
 * component; then there are two lists, they agree on the day they are written,
 * and nothing ever checks them again. Deriving the type from the array is the
 * same reasoning as `dmsRoles` in `lib/dms/menu.ts`: two lists that agree are
 * a convention, one list is a control.
 *
 * The union it produces is character-for-character what was declared before,
 * so this is a change of form and not of meaning.
 */
export const DMS_PROJECT_ROLES = [
  'SiteSupervisor', // PROPOSED — name ours, FRD ۲-۶ «سرپرست کارگاه»
  'ExecutionOfficer', // PROPOSED — name ours, FRD ۲-۶ «مسئول اجرا»
  'MachineManager', // PROPOSED — name ours, FRD ۲-۶ «مدیر ماشین»
  'DredgeOperator', // PROPOSED — name ours, FRD ۲-۶ «اپراتور لایروب»
  'Motorman', // PROPOSED — name ours, FRD ۲-۶ «موتوریست»
  'Sailor', // PROPOSED — name ours, FRD ۲-۶ «ملوان»
  'Welder', // PROPOSED — name ours, FRD ۲-۶ «جوشکار»
] as const;

export type DmsProjectRole = (typeof DMS_PROJECT_ROLES)[number];

/**
 * The derived type still equals the union that was written by hand, in BOTH
 * directions. This is what makes the change above safe rather than merely
 * plausible — remove a role from the array and this stops compiling, so the
 * two cannot part company silently.
 */
export const PROJECT_ROLES_UNCHANGED: AssertEqual<
  DmsProjectRole,
  | 'SiteSupervisor'
  | 'ExecutionOfficer'
  | 'MachineManager'
  | 'DredgeOperator'
  | 'Motorman'
  | 'Sailor'
  | 'Welder'
> = true;

// ─── Workflow status ────────────────────────────────────────────────────────

/**
 * ۲-۷ `approval_status VARCHAR(30)` — «وضعیت گزارش: Draft، Submitted،
 * Approved، Rejected». These four values are given in the document IN LATIN,
 * so unlike almost everything else here they are the source's own strings,
 * not a translation.
 *
 * §3 confirms the machine, including Approved ⇒ «کل داده‌های آن روز قفل دائم
 * شده و در محاسبات KPI شرکت داده می‌شوند».
 */
export type ReportStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';

export const ALL_REPORT_STATUSES: readonly ReportStatus[] = [
  'Draft',
  'Submitted',
  'Approved',
  'Rejected',
] as const;

/**
 * ۲-۹ «دسته‌بندی | متنی | مانند فنی، عملیاتی، برنامه‌ریزی‌شده».
 *
 * READ THAT TYPE AGAIN: the column is «متنی» — FREE TEXT — and «مانند» means
 * "such as". These three are EXAMPLES the document offers, not a closed set
 * it defines.
 *
 * SO THE TYPE IS `string`, NOT A UNION. Closing it would make a value the
 * source permits fail to typecheck, and the narrowing is load-bearing:
 * technical downtime % and operational downtime % are both computed from this
 * field, so a fourth value someone types belongs to neither bucket.
 *
 * What we refuse to do is LOSE it. kpi.ts carries a non-optional
 * `unclassified` total, so time in an unrecognised category is named rather
 * than silently dropped — one odd row must not break a dashboard over
 * historical data, and it must not vanish from it either. That is the
 * CashAdvance defect in its exact form: a total that quietly excluded rows.
 *
 * ۲-۹ also references «کد توقف | بر اساس جدول مرجع انواع توقف» — a reference
 * table of stoppage types that the FRD names and never specifies. That table
 * is where a closed set would properly come from, and it is on the open
 * questions register rather than invented here.
 */
export type StoppageCategory = string;

/**
 * The three the FRD offers as examples. A value outside this list is valid
 * data, not an error — that is why this is a list to check against and not a
 * type to validate by.
 */
export const KNOWN_STOPPAGE_CATEGORIES = [
  'Technical', // PROPOSED — name ours, FRD ۲-۹ «فنی» (example value)
  'Operational', // PROPOSED — name ours, FRD ۲-۹ «عملیاتی» (example value)
  'Planned', // PROPOSED — name ours, FRD ۲-۹ «برنامه‌ریزی‌شده» (example value)
] as const;

export type KnownStoppageCategory = (typeof KNOWN_STOPPAGE_CATEGORIES)[number];

export function isKnownStoppageCategory(
  value: string,
): value is KnownStoppageCategory {
  return (KNOWN_STOPPAGE_CATEGORIES as readonly string[]).includes(value);
}

/**
 * §5 «تحلیل توقفات بر اساس مسئول توقف (Master / Client / Dredge / Survey / CE)»
 * paired with ۲-۹ «طرف مسئول ... مانند فرمانده، کارفرما، لایروب، نقشه‌برداری،
 * ناظر».
 *
 * The ONLY closed enum in DMS whose members the document supplies in English
 * itself. Five values, both languages, positionally paired.
 */
export type ResponsibleParty =
  | 'Master' // FRD §5 — «فرمانده»
  | 'Client' // FRD §5 — «کارفرما»
  | 'Dredge' // FRD §5 — «لایروب»
  | 'Survey' // FRD §5 — «نقشه‌برداری»
  | 'CE'; // FRD §5 — «ناظر»

export const ALL_RESPONSIBLE_PARTIES: readonly ResponsibleParty[] = [
  'Master',
  'Client',
  'Dredge',
  'Survey',
  'CE',
] as const;

// ─── ۲-۱ جدول پروژه‌ها ───────────────────────────────────────────────────────
// A contract record, not a job record: 46 fields, most of them commercial.
// Every name below is ours; every label is the document's.

export interface DmsProject {
  /** Not listed in ۲-۱, but ۲-۴ declares `FK (Projects.id)`, so it exists. */
  id: string; // PROPOSED — not in FRD (implied by ۲-۴ FK Projects.id)
  projectCode: string; // PROPOSED — name ours, FRD ۲-۱ «کد پروژه» (auto-generated, unique)
  contractNumber: string; // PROPOSED — name ours, FRD ۲-۱ «شماره قرارداد پیمان»
  contractSubject: string; // PROPOSED — name ours, FRD ۲-۱ «موضوع پیمان/قرارداد»
  executionArea: string; // PROPOSED — name ours, FRD ۲-۱ «حوزه اجرایی پیمان/قرارداد»
  initialDredgingVolumeM3: number; // PROPOSED — name ours, FRD ۲-۱ «حجم اولیه عملیات لایروبی»
  workSummary?: string; // PROPOSED — name ours, FRD ۲-۱ «شرح مختصر کار و اهداف قرارداد»
  geographicScope?: string; // PROPOSED — name ours, FRD ۲-۱ «محدوده جغرافیایی اجرای کار»
  attachedMaps?: string; // PROPOSED — name ours, FRD ۲-۱ «نقشه‌های منضم به قرارداد»
  contractDate?: string; // PROPOSED — name ours, FRD ۲-۱ «تاریخ پیمان/قرارداد»
  contractNoticeLetterNumber?: string; // PROPOSED — name ours, FRD ۲-۱ «شماره نامه ابلاغ پیمان/قرارداد»
  contractNoticeLetterDate?: string; // PROPOSED — name ours, FRD ۲-۱ «تاریخ نامه ابلاغ پیمان/قرارداد»
  siteHandoverDate?: string; // PROPOSED — name ours, FRD ۲-۱ «تاریخ تحویل زمین»
  initialDuration?: number; // PROPOSED — name ours, FRD ۲-۱ «مدت اولیه پیمان/قرارداد» (days or months — the FRD says «روز یا ماه» and does not choose)
  extensionDuration?: number; // PROPOSED — name ours, FRD ۲-۱ «مدت تمدید»
  amountIncreaseNoticeDate?: string; // PROPOSED — name ours, FRD ۲-۱ «تاریخ ابلاغیه افزایش مبلغ پیمان/قرارداد»
  amountIncreaseNoticeNumber?: string; // PROPOSED — name ours, FRD ۲-۱ «شماره نامه ابلاغیه افزایش مبلغ»
  warrantyPeriodDuration?: number; // PROPOSED — name ours, FRD ۲-۱ «مدت دوره تضمین»
  contractorName?: string; // PROPOSED — name ours, FRD ۲-۱ «پیمانکار»
  supervisingConsultantName?: string; // PROPOSED — name ours, FRD ۲-۱ «مشاور نظارت»
  clientName?: string; // PROPOSED — name ours, FRD ۲-۱ «کارفرما»
  clientProjectManager?: string; // PROPOSED — name ours, FRD ۲-۱ «مدیر پروژه کارفرما»
  consultantProjectManager?: string; // PROPOSED — name ours, FRD ۲-۱ «مدیر پروژه مشاور نظارت»
  contractorProjectManager?: string; // PROPOSED — name ours, FRD ۲-۱ «مدیر پروژه پیمانکار»
  initialContractAmount?: number; // PROPOSED — name ours, FRD ۲-۱ «مبلغ اولیه قرارداد»
  approvedContractAmount?: number; // PROPOSED — name ours, FRD ۲-۱ «مبلغ قرارداد پس از آخرین تغییرات تایید شده»
  maxAmountIncreasePercent?: number; // PROPOSED — name ours, FRD ۲-۱ «درصد سقف افزایش مبلغ قرارداد»
  overheadFactor?: number; // PROPOSED — name ours, FRD ۲-۱ «ضریب بالاسری»
  proposedFactor?: number; // PROPOSED — name ours, FRD ۲-۱ «ضریب پیشنهادی»
  regionalFactor?: number; // PROPOSED — name ours, FRD ۲-۱ «ضریب منطقه‌ای»
  finalPaymentCertificateAmount?: number; // PROPOSED — name ours, FRD ۲-۱ «مبلغ صورت‌وضعیت یا گواهی پرداخت نهایی»
  finalAdjustmentCertificateAmount?: number; // PROPOSED — name ours, FRD ۲-۱ «مبلغ صورت‌وضعیت یا گواهی تعدیل نهایی»
  performanceBondAmount?: number; // PROPOSED — name ours, FRD ۲-۱ «مبلغ ضمانت‌نامه حسن انجام کار»
  performanceBondExpiryDate?: string; // PROPOSED — name ours, FRD ۲-۱ «تاریخ اعتبار ضمانت‌نامه»
  performanceBondNumber?: string; // PROPOSED — name ours, FRD ۲-۱ «شماره ضمانت‌نامه حسن انجام کار»
  performanceRetentionPercent?: number; // PROPOSED — name ours, FRD ۲-۱ «درصد کسور حسن انجام کار»
  estimateCriterionType?: string; // PROPOSED — name ours, FRD ۲-۱ «نوع معیار برآورد»
  advancePaymentPercent?: number; // PROPOSED — name ours, FRD ۲-۱ «درصد پیش‌پرداخت»
  hasAdjustment?: boolean; // PROPOSED — name ours, FRD ۲-۱ «آیا تعدیل دارد یا خیر»
  adjustmentBaseIndex?: string; // PROPOSED — name ours, FRD ۲-۱ «شاخص مبنای تعدیل»
  provisionalIndexFactorPercent?: number; // PROPOSED — name ours, FRD ۲-۱ «درصد ضریب شاخص‌های موقت»
  projectType?: string; // PROPOSED — name ours, FRD ۲-۱ «نوع پروژه» (عمرانی/غیرعمرانی)
  provisionalHandoverDate?: string; // PROPOSED — name ours, FRD ۲-۱ «تاریخ تحویل موقت»
  provisionalHandoverLetterNumber?: string; // PROPOSED — name ours, FRD ۲-۱ «شماره نامه تحویل موقت»
  warrantyStartDate?: string; // PROPOSED — name ours, FRD ۲-۱ «تاریخ شروع دوره تضمین»
  warrantyEndDate?: string; // PROPOSED — name ours, FRD ۲-۱ «تاریخ پایان دوره تضمین»
  finalHandoverDate?: string; // PROPOSED — name ours, FRD ۲-۱ «تاریخ تحویل قطعی»

  /**
   * Demo-only fault switch. Marks the one seeded project whose reads fail, so
   * the error path exists from day one and is deterministic rather than
   * random. Never sent to a real API.
   */
  simulateUnavailable?: boolean; // PROPOSED — not in FRD (mock only)
}

/**
 * NOTE — there is deliberately NO `vesselId` here. ۲-۴ makes the assignment
 * row the record of the one-to-one, and its `project_id` is UNIQUE. Two
 * records holding the same truth can disagree with nothing failing, so the
 * link is read through mock-store's getProjectVessel({ projectId }).
 */

// ─── ۲-۲ جدول زیرپروژه‌ها ───────────────────────────────────────────────────

export interface DmsSubproject {
  id: string; // PROPOSED — not in FRD
  projectId: string; // PROPOSED — not in FRD (۲-۲ links only via the composed code below)
  subprojectCode: string; // PROPOSED — name ours, FRD ۲-۲ «کد زیرپروژه» (auto: project code + row number)
  title: string; // PROPOSED — name ours, FRD ۲-۲ «عنوان زیرپروژه»
  subprojectNumber?: string; // PROPOSED — name ours, FRD ۲-۲ «شماره زیرپروژه»
  location?: string; // PROPOSED — name ours, FRD ۲-۲ «موقعیت جغرافیایی»
  initialVolumeM3?: number; // PROPOSED — name ours, FRD ۲-۲ «حجم اولیه»
  /**
   * ۲-۲ carries the vessel as free TEXT on the subproject, while ۲-۴ makes it
   * a FK on the project. That is a THIRD place a vessel appears and a second
   * source of the same truth. Kept because it is their schema; never read as
   * the authoritative link — getProjectVessel is that.
   */
  vesselType?: string; // PROPOSED — name ours, FRD ۲-۲ «نوع شناور»
  vesselNameUsed?: string; // PROPOSED — name ours, FRD ۲-۲ «نام شناور مورد استفاده»
  finalVolumeM3?: number; // PROPOSED — name ours, FRD ۲-۲ «حجم نهایی»
  initialMaps?: string; // PROPOSED — name ours, FRD ۲-۲ «نقشه‌های اولیه»
  summary?: string; // PROPOSED — name ours, FRD ۲-۲ «شرح مختصر زیرپروژه»
  asBuiltMaps?: string; // PROPOSED — name ours, FRD ۲-۲ «نقشه‌های چون‌ساخت»
  noticeDate?: string; // PROPOSED — name ours, FRD ۲-۲ «تاریخ ابلاغ»
  noticeLetterNumber?: string; // PROPOSED — name ours, FRD ۲-۲ «شماره نامه ابلاغ»
  initialDuration?: number; // PROPOSED — name ours, FRD ۲-۲ «مدت اولیه»
  startDate?: string; // PROPOSED — name ours, FRD ۲-۲ «تاریخ شروع»
  plannedEndDate?: string; // PROPOSED — name ours, FRD ۲-۲ «تاریخ اتمام بر اساس مدت اولیه»
  deliveryDate?: string; // PROPOSED — name ours, FRD ۲-۲ «تاریخ تحویل یا پایان عملیات»
  operatorEntityName?: string; // PROPOSED — name ours, FRD ۲-۲ «بهره‌بردار»
  operatorProjectManager?: string; // PROPOSED — name ours, FRD ۲-۲ «مدیر پروژه بهره‌بردار»
  siteManager?: string; // PROPOSED — name ours, FRD ۲-۲ «مدیر کارگاه»
  initialAmount?: number; // PROPOSED — name ours, FRD ۲-۲ «مبلغ اولیه»
  finalAmount?: number; // PROPOSED — name ours, FRD ۲-۲ «مبلغ نهایی»
  provisionalAdjustmentAmount?: number; // PROPOSED — name ours, FRD ۲-۲ «مبلغ تعدیل موقت»
  finalAdjustmentAmount?: number; // PROPOSED — name ours, FRD ۲-۲ «مبلغ تعدیل نهایی»
}

// ─── ۲-۳ جدول مشخصات فنی شناورها ────────────────────────────────────────────

export interface DmsVessel {
  id: string; // PROPOSED — not in FRD (implied by ۲-۴ FK Vessels.id)
  vesselCode: string; // PROPOSED — name ours, FRD ۲-۳ «کد شناور» (auto-generated)
  name: string; // PROPOSED — name ours, FRD ۲-۳ «نام شناور»
  /**
   * ۲-۳ «نوع شناور | متنی | کاترساکشن / هاپرساکشن و غیره».
   *
   * ⚠ «کاترساکشن» AND «هاپرساکشن» ARE HIS, NOT OUR TRANSLITERATIONS — they
   * appear in ۲-۳ and are what the seed uses. Nothing about vessel types is
   * an open question for the customer.
   *
   * ⛔ «و غیره» IS THE LOAD-BEARING PART: he marks these as EXAMPLES, not a
   * closed set — the same shape as ۲-۹'s «دسته‌بندی | مانند فنی، عملیاتی،
   * برنامه‌ریزی‌شده». So the column stays free TEXT and a seed carrying two
   * types is following his framing rather than narrowing it.
   *
   * DO NOT "complete" this into an enum or a lookup table on his behalf. The
   * absence of a fixed list is his decision, and it is written down.
   */
  vesselType?: string; // PROPOSED — name ours, FRD ۲-۳ «نوع شناور»
  manufacturer?: string; // PROPOSED — name ours, FRD ۲-۳ «سازنده»
  buildYear?: number; // PROPOSED — name ours, FRD ۲-۳ «سال ساخت»
  refitYear?: number; // PROPOSED — name ours, FRD ۲-۳ «سال بازسازی»
  portOfRegistry?: string; // PROPOSED — name ours, FRD ۲-۳ «بندر ثبت»
  model?: string; // PROPOSED — name ours, FRD ۲-۳ «مدل»
  heightM?: number; // PROPOSED — name ours, FRD ۲-۳ «ارتفاع»
  lengthWithLadderM?: number; // PROPOSED — name ours, FRD ۲-۳ «طول با نردبان»
  pontoonLengthM?: number; // PROPOSED — name ours, FRD ۲-۳ «طول پانتون»
  overallLengthM?: number; // PROPOSED — name ours, FRD ۲-۳ «طول کلی»
  beamM?: number; // PROPOSED — name ours, FRD ۲-۳ «عرض»
  weight?: number; // PROPOSED — name ours, FRD ۲-۳ «وزن» (tonnes or kg — the FRD says «تن یا کیلوگرم» and does not choose)
  draftM?: number; // PROPOSED — name ours, FRD ۲-۳ «آبخور»
  dredgingDepthM?: number; // PROPOSED — name ours, FRD ۲-۳ «عمق لایروبی»
  cutterPowerKw?: number; // PROPOSED — name ours, FRD ۲-۳ «توان کاتر»
  /** The denominator §5's physical-progress view needs. */
  actualDailyCapacityM3?: number; // PROPOSED — name ours, FRD ۲-۳ «ظرفیت واقعی روزانه»
  enginePower?: number; // PROPOSED — name ours, FRD ۲-۳ «توان موتور»
  pumpShaftPower?: number; // PROPOSED — name ours, FRD ۲-۳ «توان شفت پمپ»
  cutterShaftPower?: number; // PROPOSED — name ours, FRD ۲-۳ «توان شفت کاتر»
  speed?: number; // PROPOSED — name ours, FRD ۲-۳ «سرعت» (knots or an operational unit)
}

// ─── ۲-۴ جدول تخصیص شناور به پروژه ──────────────────────────────────────────

/**
 * The record of the project↔vessel one-to-one, and the one table whose
 * preamble states the invariant outright:
 * «ارتباط یک‌به‌یک جهت کنترل اینکه هر پروژه فقط و فقط یک شناور فعال داشته باشد.»
 *
 * `project_id` is FK **UNIQUE** — one row per project, ever. So there is no
 * swap in this model and no assignment history: a correction UPDATES the row.
 * `release_date` records when that vessel's work on the project ended, not a
 * handover to another vessel.
 */
export interface DmsVesselAssignment {
  id: string; // FRD ۲-۴ id — PARSED (PK INT)
  projectId: string; // FRD ۲-۴ project_id — PARSED (FK Projects.id, UNIQUE)
  vesselId: string; // FRD ۲-۴ vessel_id — PARSED (FK Vessels.id)
  /**
   * ۲-۴ «تاریخ تخصیص شناور به پروژه».
   *
   * ⚠ THE UI LABEL IS A TRUNCATION OF HIS PHRASE, NOT A COINAGE. The column
   * head reads «تاریخ تخصیص» because the screen already supplies "of vessel to
   * project" from its own context. Do not "restore" the full phrase into a
   * table header, and do not re-coin a different short form.
   *
   * ⛔ WHY THIS COMMENT EXISTS: ۲-۴ was recorded as PARSED — types and
   * constraints, no Persian — because that is what the model needed, and his
   * labels sit in a run-together schema blob with no separators or guillemets
   * for a search to find. A translator reading this file would conclude ۲-۴
   * has no Persian labels and invent some. That is the §4 omission again, in
   * a different table.
   */
  assignmentDate: string; // FRD ۲-۴ assignment_date «تاریخ تخصیص شناور به پروژه»

  /** ۲-۴ «تاریخ اتمام کار شناور در پروژه». UI shows the head, «تاریخ اتمام کار». */
  releaseDate?: string; // FRD ۲-۴ release_date «تاریخ اتمام کار شناور در پروژه»
}

// ─── ۲-۵ / ۲-۶ personnel, and the two reference lists ───────────────────────

export interface DmsPersonnel {
  /** ۲-۵ marks this «کلید اصلی». */
  id: string; // PROPOSED — name ours, FRD ۲-۵ «شناسه پرسنل»
  /**
   * ONE field in the source, not a first/last split — «نام و نام خانوادگی».
   * We do not decompose it: the estate's Person model splits names, and
   * inventing that split here would produce a field the API cannot fill.
   */
  fullName: string; // PROPOSED — name ours, FRD ۲-۵ «نام پرسنل»
  /**
   * ۲-۵'s third line is «سایر اطلاعات فردی» — "other personal information",
   * with no type and no fields. Deliberately unspecified at source; left
   * unmodelled rather than guessed.
   */
}

/**
 * ۲-۶ جدول تخصیص پرسنل به پروژه‌ها.
 *
 * TWO INCONSISTENCIES IN THE SOURCE, flagged and not silently fixed:
 *  1. The table is *assignment of personnel to PROJECTS* and has NO
 *     `project_id`.
 *  2. It marks «شناسه پرسنل» as «کلید اصلی» — the primary key — which would
 *     allow one assignment per person across all projects.
 * `projectId` below is therefore ours, added so the mock can answer "who is on
 * this project"; it is marked as ours so the swap knows it was not in ۲-۶.
 */
export interface DmsPersonnelAssignment {
  id: string; // PROPOSED — not in FRD
  personnelId: string; // PROPOSED — name ours, FRD ۲-۶ «شناسه پرسنل» (marked «کلید اصلی» — see note)
  projectId: string; // PROPOSED — not in FRD (۲-۶ has no project column; see note)
  shiftId?: string; // PROPOSED — name ours, FRD ۲-۶ «شناسه شیفت»
  roleId?: DmsProjectRole; // PROPOSED — name ours, FRD ۲-۶ «شناسه نقش»

  /**
   * The assignment window. `endDate` absent means OPEN — still assigned.
   *
   * ⚠ THESE ARE THE CUSTOMER'S, NOT THE FRD'S AND NOT OURS. ۲-۶ has exactly
   * three columns — شناسه پرسنل, شناسه شیفت, شناسه نقش — and NO dates. They
   * come from Amir's answer to question 4 (msg 194), in his own words:
   *
   *   "a better approach is to design an intermediary (junction) table where
   *    the employee ID is not a unique primary key. Instead, each employee is
   *    assigned to a project within a specific Start Date and End Date. For any
   *    new project assignment, a new record is created with a different project
   *    code and corresponding start/end dates. This way, the complete
   *    assignment history of personnel across different projects will be
   *    maintained."
   *
   * Same provenance class as the downtime-type column names: a customer answer,
   * which is STRONGER than `PROPOSED` and weaker than an FRD column. Note that
   * `projectId` beside them is genuinely ours — the two must not be flattened
   * into one marker.
   *
   * ⛔ THE LAST CLAUSE IS THE DESIGN CONSTRAINT: the dates exist SO THAT THE
   * HISTORY IS RETAINED. That is why an ended assignment is FILTERED OUT of the
   * read path and never deleted — deleting it would destroy the exact thing he
   * asked the fields to preserve. Ending and deleting are different acts.
   */
  startDate: string; // AMIR msg 194 — his words, not an FRD column
  endDate?: string; // AMIR msg 194 — absent = open assignment
}

/**
 * What may be changed on an existing assignment. An ALLOW-LIST, like
 * `ReportPatch` and `CyclePatch` — a deny list fails OPEN when a column is
 * added later, and this type has just gained two columns, which is exactly the
 * event that would have broken one.
 *
 * `personnelId` and `projectId` are excluded deliberately: changing either
 * makes the row a DIFFERENT assignment while keeping its id and its history.
 * Ending one and creating another is the honest representation, and it is the
 * one the overlap check can reason about.
 */
/**
 * What may be changed on a person. An allow-list, like every other patch type
 * here — and with exactly one field, since ۲-۵ has one editable column.
 *
 * `id` is excluded: it is ۲-۵ «کلید اصلی» and correctly so for a master table.
 * Changing it would silently orphan every ۲-۶ assignment that references it.
 */
export type PersonnelPatch = Partial<Pick<DmsPersonnel, 'fullName'>>;

/** Widening guard: the patch must never reach the key. */
export const PERSONNEL_PATCH_EXCLUDES_ID: AssertEqual<
  Extract<keyof PersonnelPatch, 'id'>,
  never
> = true;
export type PersonnelAssignmentPatch = Partial<
  Pick<DmsPersonnelAssignment, 'shiftId' | 'roleId' | 'startDate' | 'endDate'>
>;

/** Widening guard: the patch must never reach identity fields. */
export const ASSIGNMENT_PATCH_EXCLUDES_IDENTITY: AssertEqual<
  Extract<keyof PersonnelAssignmentPatch, 'personnelId' | 'projectId' | 'id'>,
  never
> = true;

/**
 * `شیفت` — appears UNNUMBERED under ۲-۶, so it is not one of the nine tables.
 * Reference data, and still real: ۲-۶ points at it.
 */
export interface DmsShift {
  id: string; // PROPOSED — name ours, FRD «شیفت» «شناسه شیفت» (کلید اصلی)
  name: string; // PROPOSED — name ours, FRD «شیفت» «نام شیفت» (e.g. روز، شب)
  /**
   * ONE TEXT field in the source — «بازه زمانی شیفت | متنی | مانند ۰۸:۰۰ الی
   * ۱۶:۰۰». Not a start/end pair and not a duration. Kept as the free text it
   * is; splitting it would invent structure the API will not return.
   */
  timeRangeText: string; // PROPOSED — name ours, FRD «شیفت» «بازه زمانی شیفت»
}

// ─── ۲-۷ جدول گزارش روزانه عملیات ───────────────────────────────────────────

/**
 * One vessel-day. Its approval is what admits the day into the KPI engine —
 * §3: Approved ⇒ «کل داده‌های آن روز قفل دائم شده و در محاسبات KPI شرکت داده
 * می‌شوند».
 *
 * NOTE THE ABSENCE OF TIMESTAMPS. ۲-۷ has `approved_by` with no `approved_at`,
 * and no created/updated columns anywhere in the FRD. Every timestamp below is
 * ours, marked as such, so the swap knows what it is adding.
 */
export interface DmsDailyOperationReport {
  id: string; // FRD ۲-۷ id — PARSED (PK INT)
  projectId: string; // FRD ۲-۷ project_id — PARSED (FK Projects.id)
  /**
   * ۲-۷ carries `vessel_id` while ۲-۴ already makes the vessel derivable from
   * the project. It is a denormalisation and the field stays, because it is
   * their schema and the API shape must match — but our store DERIVES it from
   * the active assignment on write and never accepts it from a caller, so the
   * two cannot diverge.
   */
  vesselId: string; // FRD ۲-۷ vessel_id — PARSED (FK Vessels.id; derived on write, never caller-supplied)
  reportDate: string; // FRD ۲-۷ report_date — PARSED (DATE)
  registeredBy: string; // FRD ۲-۷ registered_by — PARSED (FK Users.id — «شناسه اپراتور ثبت‌کننده»)
  approvedBy?: string; // FRD ۲-۷ approved_by — PARSED (FK Users.id — «شناسه سرپرست تاییدکننده»)
  approvalStatus: ReportStatus; // FRD ۲-۷ approval_status — PARSED (VARCHAR(30))
  /**
   * ۲-۷ gives this as plain TEXT with no NOT NULL. The requirement that it be
   * present comes from the workflow prose, not the column: §1 «به همراه درج
   * علت رد» and §3 «علت رد به عنوان یادداشت ثبت می‌شود». workflow.ts's
   * discriminated ReportAction plus its runtime refusal of '' implements that
   * prose — correctly attributed to §1/§3 rather than to a constraint that
   * does not exist.
   */
  rejectionNote?: string; // FRD ۲-۷ rejection_note — PARSED (TEXT)
  dailyNotes?: string; // FRD ۲-۷ daily_notes — PARSED (TEXT)

  /** Our own review trace. The FRD has no timestamp columns at all. */
  submittedAt?: string; // PROPOSED — not in FRD
  submittedBy?: string; // PROPOSED — not in FRD
  approvedAt?: string; // PROPOSED — not in FRD
  rejectedAt?: string; // PROPOSED — not in FRD
  rejectedBy?: string; // PROPOSED — not in FRD
  createdAt: string; // PROPOSED — not in FRD
  updatedAt: string; // PROPOSED — not in FRD
}

// ─── ۲-۸ جدول چرخه‌های عملیات روزانه ────────────────────────────────────────

/**
 * A cycle is FOUR PHASES, not one interval.
 *
 * ۲-۸ gives eight timestamps and NO duration column. §4 defines
 * T_OP = «حاصل‌جمع مدت‌زمان لایروبی، حمل، تخلیه و بازگشت برای تمام چرخه‌های
 * روزانه» — dredging + transport + discharge + return — so the four phase
 * durations must be derived from these eight times, and §5's time-share chart
 * needs exactly the same four. A single start/end pair could produce neither.
 *
 * There is no `report_id` in ۲-۸: the source links a cycle to its day by
 * «تاریخ» alone. Our `reportId` is ours, and cycles are reached only through
 * mock-store's listCyclesForReport() — so if the swap turns out to link by
 * date, that is a change inside the store and no call site moves.
 */
export interface DmsCycle {
  id: string; // PROPOSED — not in FRD
  reportId: string; // PROPOSED — not in FRD (۲-۸ links by «تاریخ» only)
  cycleDate: string; // PROPOSED — name ours, FRD ۲-۸ «تاریخ»
  cycleNumber: number; // PROPOSED — name ours, FRD ۲-۸ «شماره چرخه روزانه» (restarts at 1 daily)
  dredgingStart: string; // PROPOSED — name ours, FRD ۲-۸ «زمان شروع لایروبی»
  dredgingEnd: string; // PROPOSED — name ours, FRD ۲-۸ «زمان پایان لایروبی»
  transportStart: string; // PROPOSED — name ours, FRD ۲-۸ «زمان شروع حرکت به تخلیه»
  transportEnd: string; // PROPOSED — name ours, FRD ۲-۸ «زمان رسیدن به محل تخلیه»
  dischargeStart: string; // PROPOSED — name ours, FRD ۲-۸ «زمان شروع تخلیه»
  dischargeEnd: string; // PROPOSED — name ours, FRD ۲-۸ «زمان پایان تخلیه»
  returnStart: string; // PROPOSED — name ours, FRD ۲-۸ «زمان شروع بازگشت»
  returnEnd: string; // PROPOSED — name ours, FRD ۲-۸ «زمان رسیدن به محل لایروبی»
  dredgedVolumeM3?: number; // PROPOSED — name ours, FRD ۲-۸ «حجم لایروبی‌شده»
  notes?: string; // PROPOSED — name ours, FRD ۲-۸ «توضیحات»
}

/** The four phases §4 sums into T_OP and §5 charts as the time share. */
export type CyclePhase = 'Dredging' | 'Transport' | 'Discharge' | 'Return';

export const ALL_CYCLE_PHASES: readonly CyclePhase[] = [
  'Dredging',
  'Transport',
  'Discharge',
  'Return',
] as const;

// ─── ۲-۹ جدول ثبت توقفات ────────────────────────────────────────────────────

/**
 * TWO CLASSIFICATION FIELDS THAT CAN DISAGREE, both from the source:
 *   «دسته‌بندی» — free text, examples فنی / عملیاتی / برنامه‌ریزی‌شده
 *   «برنامه‌ریزی‌شده یا خیر» — a boolean, `is_planned`
 * A row can say category = Planned while is_planned = false, and nothing in
 * the schema stops it. They also feed different numbers: §4 computes T_PD
 * strictly from `is_planned = True`, while technical % and operational % come
 * from the category. Both are kept, neither is derived from the other, and
 * kpi.ts reads the one §4 names.
 *
 * UNIT: «مدت توقف | عددی اعشاری | بر حسب ساعت» — DECIMAL HOURS, while §4
 * works in minutes. The field keeps the source's unit in its name and kpi.ts
 * is the only place that converts.
 */
export interface DmsStoppage {
  id: string; // PROPOSED — not in FRD
  reportId: string; // PROPOSED — not in FRD (۲-۹ links by «تاریخ توقف» only)
  stoppageDate: string; // PROPOSED — name ours, FRD ۲-۹ «تاریخ توقف»
  /** «بر اساس جدول مرجع انواع توقف» — a reference table the FRD never specifies. */
  stoppageCode: string; // PROPOSED — name ours, FRD ۲-۹ «کد توقف»
  category: StoppageCategory; // PROPOSED — name ours, FRD ۲-۹ «دسته‌بندی» (free text at source — see StoppageCategory)
  rootCauseSystem?: string; // PROPOSED — name ours, FRD ۲-۹ «حوزه یا سیستم علت اصلی»
  notes?: string; // PROPOSED — name ours, FRD ۲-۹ «توضیحات»
  startTime: string; // PROPOSED — name ours, FRD ۲-۹ «زمان شروع»
  endTime: string; // PROPOSED — name ours, FRD ۲-۹ «زمان پایان»
  /** DECIMAL HOURS — the source's unit, kept in the name. See the note above. */
  durationHours: number; // PROPOSED — name ours, FRD ۲-۹ «مدت توقف» («بر حسب ساعت»)
  /** The one English identifier the FRD supplies for a Persian-labelled table (§4). */
  isPlanned: boolean; // FRD §4 `is_planned` — the identifier is the document's own
  responsibleParty?: ResponsibleParty; // PROPOSED — name ours, FRD ۲-۹ «طرف مسئول»
}

// ─── The approved-report brand ──────────────────────────────────────────────

/**
 * Phantom brand. Not exported, so no code outside this module can name the
 * key, and therefore no object literal anywhere can satisfy
 * ApprovedDailyReport. `declare const` means it has no runtime existence — the
 * brand is a compile-time fact only.
 */
declare const approvedBrand: unique symbol;

/**
 * A daily report that HAS BEEN APPROVED, proven by the type system.
 *
 * The KPI engine accepts these and nothing else. Handing it a
 * DmsDailyOperationReport[] fails `next build` — §3's approved-only rule is
 * refused by the compiler rather than remembered by a reviewer. This is the
 * property whose absence produced the CashAdvance total that included
 * rejected invoices.
 *
 * THE ONLY WAY TO OBTAIN ONE is mock-store's listApprovedReports(), which
 * applies the filter itself. No other store function returns this type —
 * listReports() does not, even when every row it happens to return is
 * approved.
 *
 * The one remaining way past it is `x as ApprovedDailyReport`, since a cast
 * defeats any brand. That cast is banned by the zone's own eslint config
 * everywhere except mock-store.ts, so the deliberate path fails
 * `npm run lint` and removing the ban is a visible diff in a file that is ours.
 */
export type ApprovedDailyReport = DmsDailyOperationReport & {
  readonly approvalStatus: 'Approved';
  readonly [approvedBrand]: true;
};

// ─── Query shapes ───────────────────────────────────────────────────────────
// EVERY store function takes an OBJECT, never positional arguments, so that a
// `tenantId` can be added as a field without moving a single call site.
// مشیران کاریز is a new tenant company and DMS is committed work; the estate
// has paid twice for retrofitting scoping (CashAdvance has no tenant column at
// all). Nothing tenant-related is implemented here — only the shape that keeps
// the answer cheap.

export interface DateRange {
  /** ISO date, inclusive. */
  from: string;
  /** ISO date, inclusive. */
  to: string;
}

export interface ProjectQuery {
  query?: string;
}

/**
 * What a project edit form may change.
 *
 * `id` is identity and `projectCode` is «تولید خودکار توسط سیستم» (۲-۱), so
 * both are excluded HERE, in the type — a form that tries to send either fails
 * the build rather than being refused at runtime. Same instrument as
 * `VesselPatch`.
 *
 * `simulateUnavailable` is excluded too: it is the mock's fault switch, not a
 * field of the record, and it must never be settable from a screen.
 */
export type ProjectPatch = Partial<
  Omit<DmsProject, 'id' | 'projectCode' | 'simulateUnavailable'>
>;

export interface ProjectRef {
  projectId: string;
}

export interface EntityRef {
  id: string;
}

export interface ReportQuery {
  projectId: string;
  status?: ReportStatus;
  from?: string;
  to?: string;
}

export interface ApprovedReportQuery {
  projectId: string;
  range?: DateRange;
}

export interface ReportRef {
  reportId: string;
}

export interface VesselQuery {
  query?: string;
}

/**
 * What a vessel edit form may change.
 *
 * `id` is identity and `vesselCode` is system-generated (۲-۳ «تولید خودکار
 * توسط سیستم»), so both are excluded HERE, in the type — a form that tries to
 * send either fails the build rather than being refused at runtime.
 */
export type VesselPatch = Partial<Omit<DmsVessel, 'id' | 'vesselCode'>>;

// ─── Required columns, derived from the types themselves ────────────────────
//
// WHY THIS EXISTS. `ProjectPatch`/`VesselPatch` are `Partial<…>`, and
// `Partial<T>` turns a required property into `T[K] | undefined` rather than
// making it absent. So `{ ...existing, ...patch }` can spread `undefined` OVER
// a required column and leave the stored record structurally invalid — while
// every line of it typechecks.
//
// The store refuses that (see mock-store), and the list it refuses against is
// DERIVED here rather than hand-maintained. A hand-written list is two
// definitions that agree today: add a required column to DmsProject and
// nothing would make anyone mark it.

/**
 * The keys of T that are NOT optional.
 *
 * An optional property's type includes `undefined`; a required one's does not.
 *
 * TWO COMPILER FLAGS THIS DEPENDS ON, and I had only documented one:
 *   - `exactOptionalPropertyTypes` OFF — verified estate-wide, template
 *     tsconfig, not ours to change.
 *   - `strictNullChecks` ON — which `strict: true` gives us. WITH IT OFF,
 *     `undefined` is assignable to everything, so `RequiredKeys` returns
 *     `never` for every key and the AssertEqual constants below stop
 *     compiling. Found by executing this file under a default (non-strict)
 *     tsc while testing something else.
 *
 * Both dependencies fail LOUDLY — a build error, not a silent inversion — which
 * is the direction that matters. But the second one was undocumented, and an
 * undocumented dependency is one nobody knows to preserve.
 */
export type RequiredKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

/**
 * Resolves to `true` only when A and B are the same union, and to `never`
 * otherwise — so assigning `true` to it fails the build when they diverge.
 */
export type AssertEqual<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : never
  : never;

/** Required project columns a patch may never blank. Identity is excluded. */
export type RequiredProjectKey = Exclude<
  RequiredKeys<DmsProject>,
  'id' | 'projectCode'
>;

export const REQUIRED_PROJECT_KEYS = [
  'contractNumber',
  'contractSubject',
  'executionArea',
  'initialDredgingVolumeM3',
] as const;

/** Build fails if a required column is added to DmsProject and not listed. */
export const REQUIRED_PROJECT_KEYS_EXHAUSTIVE: AssertEqual<
  RequiredProjectKey,
  (typeof REQUIRED_PROJECT_KEYS)[number]
> = true;

/** Required vessel columns. `vesselCode` is system-generated and excluded. */
export type RequiredVesselKey = Exclude<
  RequiredKeys<DmsVessel>,
  'id' | 'vesselCode'
>;

export const REQUIRED_VESSEL_KEYS = ['name'] as const;

export const REQUIRED_VESSEL_KEYS_EXHAUSTIVE: AssertEqual<
  RequiredVesselKey,
  (typeof REQUIRED_VESSEL_KEYS)[number]
> = true;

export interface SubprojectQuery {
  projectId: string;
  query?: string;
}

/**
 * What a subproject edit form may change.
 *
 * Three exclusions, each for a different reason:
 *   `id`             — identity.
 *   `subprojectCode` — ۲-۲ «تولید خودکار (ترکیب کد پروژه و شماره ردیف)».
 *   `projectId`      — the parent. Re-parenting a subproject is a structural
 *                      move, not a field edit, and ۲-۲'s code embeds the
 *                      parent's code, so changing one silently invalidates the
 *                      other. If re-parenting is ever wanted it needs its own
 *                      operation that reissues the code.
 */
export type SubprojectPatch = Partial<
  Omit<DmsSubproject, 'id' | 'projectId' | 'subprojectCode'>
>;

export type RequiredSubprojectKey = Exclude<
  RequiredKeys<DmsSubproject>,
  'id' | 'projectId' | 'subprojectCode'
>;

export const REQUIRED_SUBPROJECT_KEYS = ['title'] as const;

export const REQUIRED_SUBPROJECT_KEYS_EXHAUSTIVE: AssertEqual<
  RequiredSubprojectKey,
  (typeof REQUIRED_SUBPROJECT_KEYS)[number]
> = true;

// ─── Downtime types lookup — Amir, msg 194, answers 5 & 6 ───────────────────
//
// «Create a lookup table where the main administrator/operator enters the
// downtime types once. When users log downtimes in the daily reports, they
// should only be able to select from the predefined options in this table.»
//
// NOT one of the FRD's nine tables. It arrives from his answer, and unlike the
// Persian-labelled tables he named these columns HIMSELF, in English — so the
// identifiers below are his words rather than our translation, which is a
// stronger provenance than anything in ۲-۱ to ۲-۹.

export interface DmsStoppageType {
  id: string; // PROPOSED — not in FRD (no id in his list; every row needs one)
  code: string; // AMIR msg 194 — «Downtime Code»
  /**
   * ⚠ THE LOOKUP CONSTRAINS ENTRY; IT DOES NOT RE-TYPE THE COLUMN.
   * `DmsStoppage.category` stays `string`. Closing it to an enum here would
   * re-narrow his spec on our authority — the same thing we declined to do
   * when ۲-۹ gave «مانند» examples. The closed set is a UI and data
   * constraint, enforced where rows are entered, not in the shape of the type.
   */
  category: StoppageCategory; // AMIR msg 194 — «Downtime Type/Category»
  name: string; // AMIR msg 194 — «Downtime Name/Description»
  /**
   * ⚠ THIS IS A DEFAULT, NOT A REPLACEMENT FOR THE ROW'S OWN FLAG.
   *
   * §4 computes T_PD from the STOPPAGE ROW's `is_planned`, and that stays the
   * source of truth. Selecting a type may PREFILL the row's flag; the row's
   * value is what the KPI reads. Deriving one from the other in either
   * direction would silently change what T_PD means, and his answer gives the
   * lookup a default — it does not move the field.
   */
  isPlanned: boolean; // AMIR msg 194 — «Is Planned (Yes/No/Boolean)»
}

export interface StoppageTypeQuery {
  query?: string;
}

/**
 * What a shift edit may change. Omit-style like the stoppage-type patch beside
 * it, because DmsShift has exactly one non-key field beyond the name and both
 * are editable — there is nothing to allow-list AWAY from.
 *
 * `id` is excluded: it is FRD «شناسه شیفت | کلید اصلی», and ۲-۶ assignments
 * reference it. Changing it would orphan every assignment carrying that shift.
 */
export type ShiftPatch = Partial<Omit<DmsShift, 'id'>>;

export type RequiredShiftKey = Exclude<RequiredKeys<DmsShift>, 'id'>;

export const REQUIRED_SHIFT_KEYS = ['name', 'timeRangeText'] as const;

/** Both required fields are listed; a new one fails this rather than slipping through. */
export const REQUIRED_SHIFT_KEYS_EXHAUSTIVE: AssertEqual<
  RequiredShiftKey,
  (typeof REQUIRED_SHIFT_KEYS)[number]
> = true;
export type StoppageTypePatch = Partial<Omit<DmsStoppageType, 'id'>>;

export type RequiredStoppageTypeKey = Exclude<
  RequiredKeys<DmsStoppageType>,
  'id'
>;

export const REQUIRED_STOPPAGE_TYPE_KEYS = [
  'code',
  'category',
  'name',
  'isPlanned',
] as const;

export const REQUIRED_STOPPAGE_TYPE_KEYS_EXHAUSTIVE: AssertEqual<
  RequiredStoppageTypeKey,
  (typeof REQUIRED_STOPPAGE_TYPE_KEYS)[number]
> = true;

// ─── Stoppage entry ─────────────────────────────────────────────────────────

/**
 * What a stoppage edit may change.
 *
 * `id` and `reportId` are excluded: moving a stoppage to another day is not a
 * field edit, and it would silently move minutes between two days' KPIs — one
 * of which may already be approved and locked.
 */
export type StoppagePatch = Partial<Omit<DmsStoppage, 'id' | 'reportId'>>;

export type RequiredStoppageKey = Exclude<
  RequiredKeys<DmsStoppage>,
  'id' | 'reportId'
>;

export const REQUIRED_STOPPAGE_KEYS = [
  'stoppageDate',
  'stoppageCode',
  'category',
  'startTime',
  'endTime',
  'durationHours',
  'isPlanned',
] as const;

export const REQUIRED_STOPPAGE_KEYS_EXHAUSTIVE: AssertEqual<
  RequiredStoppageKey,
  (typeof REQUIRED_STOPPAGE_KEYS)[number]
> = true;

// ─── Report editing ─────────────────────────────────────────────────────────

/**
 * Fields the STATE MACHINE owns. `workflow.ts` writes every one of these, and
 * nothing else may.
 *
 * Enumerated here rather than left implicit so the assertion below can check
 * against it — see `REPORT_PATCH_EXCLUDES_WORKFLOW_FIELDS`.
 */
export type WorkflowWrittenReportKey =
  | 'approvalStatus'
  | 'submittedAt'
  | 'submittedBy'
  | 'approvedAt'
  | 'approvedBy'
  | 'rejectedAt'
  | 'rejectedBy'
  | 'rejectionNote'
  | 'updatedAt';

/**
 * What an operator may change on their own report.
 *
 * ⚠ AN ALLOW-LIST, NOT AN OMIT LIST, AND THE DIRECTION IS THE POINT.
 * `Partial<Omit<…, 'id' | 'projectId' | …>>` would express the same thing today
 * and FAIL OPEN tomorrow: the moment a column is added to ۲-۷ — and ۲-۱ to ۲-۹
 * are still provisional — it becomes operator-editable silently, because
 * nobody has to remember to add it to a deny list. A `Pick` fails closed. A new
 * field is not editable until somebody says it is, in a diff.
 *
 * ⚠ THIS IS DELIBERATELY A ONE-FIELD TYPE, AND IT IS CORRECTLY SCOPED RATHER
 * THAN UNDER-DELIVERED. §1 promises the operator «امکان ویرایش اطلاعات تا پیش
 * از ارسال به سرپرست», and that promise is met across THREE write paths — the
 * stoppage writes, the cycle writes, and this. The information an operator
 * needs to correct before submitting is the CHILD records; the report row
 * itself carries identity, parentage, date and workflow state, none of which
 * may change after creation. So this being the smallest of the three is the
 * design, not a shortfall.
 *
 * Written here because a one-field patch type invites widening: the next
 * reader sees a thin type beside a broad promise and concludes the promise is
 * unmet. Everything else is excluded for a reason:
 *
 *  - `id`, `projectId`, `vesselId`, `reportDate` — moving a report moves its
 *    minutes and its volume between two KPI populations, one of which may
 *    already be approved and locked. Same reasoning as `reportId` on a
 *    stoppage.
 *  - `registeredBy`, `createdAt` — a record of who entered the day and when.
 *  - Every `WorkflowWrittenReportKey` — only `transitionReport` writes those.
 *    Admitting `approvalStatus` would undo the state machine silently.
 *  - `rejectionNote` MOST OF ALL. It is the supervisor's record of WHY a day
 *    came back, kept deliberately through resubmission because with no backend
 *    there is nowhere else for the review to live. An operator who could clear
 *    it could revise and resubmit as though never rejected — erasing the only
 *    trace that a review happened.
 */
export type ReportPatch = Partial<Pick<DmsDailyOperationReport, 'dailyNotes'>>;

/**
 * Build fails if `ReportPatch` is ever widened to include a field the state
 * machine owns — which is the specific way this type would be weakened, since
 * "just let them fix the status" is the reasonable-sounding request.
 */
export const REPORT_PATCH_EXCLUDES_WORKFLOW_FIELDS: Extract<
  keyof ReportPatch,
  WorkflowWrittenReportKey
> extends never
  ? true
  : never = true;

// ─── Cycle entry ────────────────────────────────────────────────────────────

/**
 * What an operator may change on a cycle.
 *
 * ALLOW-LIST, same direction as `ReportPatch` and for the same reason: ۲-۸ is
 * provisional like the rest, and a column added later must not become editable
 * because nobody remembered to deny it. Adjacent types should not switch
 * styles.
 *
 * Excluded: `id` and `reportId` — moving a cycle between days moves its volume
 * and its operating minutes between two KPI populations, one of which may
 * already be approved — and `cycleNumber`, which the store assigns. ۲-۸ says
 * «شماره چرخه (هر روز از ۱ شروع می‌شود)», so it is per-day sequence rather
 * than anyone's to type, the same as `vesselCode` and `projectCode`.
 */
export type CyclePatch = Partial<
  Pick<
    DmsCycle,
    | 'cycleDate'
    | 'dredgingStart'
    | 'dredgingEnd'
    | 'transportStart'
    | 'transportEnd'
    | 'dischargeStart'
    | 'dischargeEnd'
    | 'returnStart'
    | 'returnEnd'
    | 'dredgedVolumeM3'
    | 'notes'
  >
>;

/** Build fails if the patch is ever widened to admit the assigned sequence. */
export const CYCLE_PATCH_EXCLUDES_ASSIGNED_KEYS: Extract<
  keyof CyclePatch,
  'id' | 'reportId' | 'cycleNumber'
> extends never
  ? true
  : never = true;
