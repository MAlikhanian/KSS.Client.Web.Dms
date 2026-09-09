/**
 * The single module that owns all DMS data access. No component reads
 * localStorage, and no component constructs a domain record.
 *
 * THE SWAP RULE. Every exported function is `async` and returns a Promise,
 * even though nothing here is asynchronous yet, and every exported body is a
 * SINGLE call into the `mockRead` / `mockWrite` seam. When a backend lands,
 * replacing that one line with an http call is the whole change — no call site
 * moves, no signature changes, no component becomes async that was not already.
 * That is the difference between a backend PHASE and a frontend REWRITE.
 *
 * THE ARGUMENT RULE. Every function takes ONE OBJECT, never positional
 * arguments, so a `tenantId` becomes an added field rather than a signature
 * change at every call site. مشیران کاریز is a new tenant company and DMS is
 * committed work; nothing tenant-related is implemented here, only the shape
 * that keeps the answer cheap when it comes.
 *
 * Errors are DmsError, carrying the HTTP status the real API would return, so
 * the catch blocks written against this mock keep working afterwards.
 *
 * ⚠ WHERE THE DATA LIVES, AND WHERE IT DOES NOT FOLLOW YOU. Everything here
 * is in localStorage, which is scoped PER ORIGIN. Data entered against the
 * standalone dev server on localhost:3170 is NOT present when the zone is
 * later served under the Shell at /dms, and vice versa — different origin,
 * different store. Anyone testing needs to know their entries do not travel;
 * we cannot fix this, so it stays stated.
 */

import {
  conflict,
  forbidden,
  notFound,
  unavailable,
  validation,
} from './errors';
import type {
  ApprovedDailyReport,
  ApprovedReportQuery,
  DmsActor,
  DmsCycle,
  DmsDailyOperationReport,
  DmsPersonnel,
  DmsPersonnelAssignment,
  DmsProjectRole,
  DmsProject,
  DmsShift,
  DmsStoppage,
  DmsSubproject,
  DmsVessel,
  DmsVesselAssignment,
  EntityRef,
  CyclePatch,
  ProjectPatch,
  ProjectQuery,
  ProjectRef,
  PersonnelAssignmentPatch,
  PersonnelPatch,
  ShiftPatch,
  ReportPatch,
  ReportQuery,
  ReportRef,
  StoppagePatch,
  StoppageTypePatch,
  StoppageTypeQuery,
  DmsStoppageType,
  SubprojectPatch,
  SubprojectQuery,
  VesselPatch,
  VesselQuery,
} from './types';
import {
  REQUIRED_PROJECT_KEYS,
  REQUIRED_SHIFT_KEYS,
  REQUIRED_STOPPAGE_KEYS,
  REQUIRED_STOPPAGE_TYPE_KEYS,
  REQUIRED_SUBPROJECT_KEYS,
  REQUIRED_VESSEL_KEYS,
} from './types';
import {
  assertEditable,
  transition,
  type ReportAction,
} from './workflow';

// ─── Storage keys ───────────────────────────────────────────────────────────

const KEY_PROJECTS = 'dms:projects';
const KEY_SUBPROJECTS = 'dms:subprojects';
const KEY_VESSELS = 'dms:vessels';
const KEY_VESSEL_ASSIGNMENTS = 'dms:vessel-assignments';
const KEY_PERSONNEL = 'dms:personnel';
const KEY_PERSONNEL_ASSIGNMENTS = 'dms:personnel-assignments';
const KEY_SHIFTS = 'dms:shifts';
const KEY_REPORTS = 'dms:daily-reports';
const KEY_CYCLES = 'dms:cycles';
const KEY_STOPPAGES = 'dms:stoppages';
const KEY_STOPPAGE_TYPES = 'dms:stoppage-types';

/**
 * Constant latency on every call. Present so loading and skeleton states get
 * written NOW, while there is time, rather than discovered when a real API
 * makes every screen flicker.
 */
const MOCK_LATENCY_MS = 150;

// ─── The seam ───────────────────────────────────────────────────────────────

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * localStorage does not exist on the server, and returning an empty fallback
 * there — as the CustomerRisk store does — renders a page that is
 * indistinguishable from a real empty result. A silent wrong answer reads
 * better and costs more than a loud failure, so this fails loudly: a data page
 * missing its `'use client'` throws here instead of rendering a blank table.
 */
function assertBrowser(): void {
  if (!isBrowser()) {
    throw unavailable(
      'The DMS mock store is browser-only; this call ran during a server render. The calling component is missing "use client".',
    );
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Every exported read is one call to this. */
async function mockRead<T>(fn: () => T): Promise<T> {
  assertBrowser();
  await delay(MOCK_LATENCY_MS);
  return fn();
}

/** Every exported write is one call to this. */
async function mockWrite<T>(fn: () => T): Promise<T> {
  assertBrowser();
  await delay(MOCK_LATENCY_MS);
  return fn();
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw unavailable('Local storage is unavailable or full.');
  }
}

function uuid(): string {
  if (typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `dms-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ─── Seeds ──────────────────────────────────────────────────────────────────
// Field NAMES follow the FRD reconciliation in types.ts. Field VALUES are
// illustrative. Only the fields the day-one loop exercises are populated; the
// contract and technical-spec columns exist in the type and are left empty
// rather than invented, because a plausible contract figure in a mock is
// indistinguishable from a real one a hop later.

const SEED_VESSELS: DmsVessel[] = [
  {
    id: 'dms-vsl-1',
    vesselCode: 'KRZ-01',
    name: 'کاریز ۱',
    vesselType: 'کاترساکشن',
    actualDailyCapacityM3: 4500,
  },
  {
    id: 'dms-vsl-2',
    vesselCode: 'KRZ-02',
    name: 'کاریز ۲',
    vesselType: 'هاپرساکشن',
    actualDailyCapacityM3: 6200,
  },
  {
    id: 'dms-vsl-3',
    vesselCode: 'KRZ-03',
    name: 'کاریز ۳',
    vesselType: 'کاترساکشن',
    actualDailyCapacityM3: 3800,
  },
];

const SEED_PROJECTS: DmsProject[] = [
  {
    id: 'dms-prj-1',
    projectCode: 'PRJ-1401-A',
    contractNumber: '1401/114',
    contractSubject: 'لایروبی حوضچه بندر امام',
    executionArea: 'بندر امام خمینی',
    initialDredgingVolumeM3: 250000,
  },
  {
    /** The legitimately-empty collection: a real project with no reports yet. */
    id: 'dms-prj-empty',
    projectCode: 'PRJ-1401-B',
    contractNumber: '1401/115',
    contractSubject: 'لایروبی کانال دسترسی',
    executionArea: 'کانال دسترسی',
    initialDredgingVolumeM3: 90000,
  },
  {
    /**
     * The seeded failure path. Deterministic, not random, and confined to this
     * one record: reads scoped to it reject Unavailable so the error state of
     * every list and of the dashboard exists from day one.
     */
    id: 'dms-prj-fault',
    projectCode: 'PRJ-1401-C',
    contractNumber: '1401/116',
    contractSubject: 'پروژه آزمون خطا (داده در دسترس نیست)',
    executionArea: '—',
    initialDredgingVolumeM3: 120000,
    simulateUnavailable: true,
  },
];

/** One row per project — ۲-۴ `project_id` is UNIQUE. */
const SEED_VESSEL_ASSIGNMENTS: DmsVesselAssignment[] = [
  {
    id: 'dms-vas-1',
    projectId: 'dms-prj-1',
    vesselId: 'dms-vsl-1',
    assignmentDate: '2026-04-01',
  },
  {
    id: 'dms-vas-2',
    projectId: 'dms-prj-empty',
    vesselId: 'dms-vsl-2',
    assignmentDate: '2026-09-01',
  },
  {
    id: 'dms-vas-3',
    projectId: 'dms-prj-fault',
    vesselId: 'dms-vsl-3',
    assignmentDate: '2026-06-01',
  },
];

const SEED_SUBPROJECTS: DmsSubproject[] = [
  {
    id: 'dms-sub-1',
    projectId: 'dms-prj-1',
    subprojectCode: 'PRJ-1401-A-01',
    title: 'فاز یک — حوضچه شمالی',
    initialVolumeM3: 150000,
  },
  {
    id: 'dms-sub-2',
    projectId: 'dms-prj-1',
    subprojectCode: 'PRJ-1401-A-02',
    title: 'فاز دو — حوضچه جنوبی',
    initialVolumeM3: 100000,
  },
];

const SEED_SHIFTS: DmsShift[] = [
  { id: 'dms-shf-1', name: 'روز', timeRangeText: '۰۸:۰۰ الی ۱۶:۰۰' },
  { id: 'dms-shf-2', name: 'شب', timeRangeText: '۲۰:۰۰ الی ۰۴:۰۰' },
];

const SEED_PERSONNEL: DmsPersonnel[] = [
  { id: 'dms-per-1', fullName: 'رضا کریمی' },
  { id: 'dms-per-2', fullName: 'مهدی شریفی' },
];

/**
 * ⚠ ONE OPEN ASSIGNMENT AND ONE CLOSED ONE, DELIBERATELY.
 *
 * The seed set previously had no report in `Draft` — the state every report
 * starts in — so anyone working from seeded data never saw the entry path. The
 * same trap is available here and costs nothing to avoid: with both windows
 * open, a date filter that did nothing would look identical to one that
 * worked, and the first person to notice would be a user.
 *
 * `dms-pas-2` is closed in the past, so `listActivePersonnelForProject`
 * returns ONE person where `listPersonnelAssignments` returns two. If those
 * two ever agree, the filter has stopped filtering.
 */
const SEED_PERSONNEL_ASSIGNMENTS: DmsPersonnelAssignment[] = [
  {
    id: 'dms-pas-1',
    personnelId: 'dms-per-1',
    projectId: 'dms-prj-1',
    shiftId: 'dms-shf-1',
    roleId: 'DredgeOperator',
    startDate: '2026-01-01',
  },
  {
    id: 'dms-pas-2',
    personnelId: 'dms-per-2',
    projectId: 'dms-prj-1',
    shiftId: 'dms-shf-1',
    roleId: 'SiteSupervisor',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
  },
];

/** All four statuses, so every workflow path has data behind it on first load. */
const SEED_REPORTS: DmsDailyOperationReport[] = [
  {
    id: 'dms-rep-1',
    projectId: 'dms-prj-1',
    vesselId: 'dms-vsl-1',
    reportDate: '2026-09-01',
    registeredBy: 'dms-usr-op',
    approvedBy: 'dms-usr-sup',
    approvalStatus: 'Approved',
    dailyNotes: 'عملیات طبق برنامه.',
    createdAt: '2026-09-01T18:10:00.000Z',
    updatedAt: '2026-09-02T07:30:00.000Z',
    submittedAt: '2026-09-01T18:40:00.000Z',
    submittedBy: 'dms-usr-op',
    approvedAt: '2026-09-02T07:30:00.000Z',
  },
  {
    id: 'dms-rep-2',
    projectId: 'dms-prj-1',
    vesselId: 'dms-vsl-1',
    reportDate: '2026-09-02',
    registeredBy: 'dms-usr-op',
    approvedBy: 'dms-usr-sup',
    approvalStatus: 'Approved',
    createdAt: '2026-09-02T18:05:00.000Z',
    updatedAt: '2026-09-03T07:15:00.000Z',
    submittedAt: '2026-09-02T18:35:00.000Z',
    submittedBy: 'dms-usr-op',
    approvedAt: '2026-09-03T07:15:00.000Z',
  },
  {
    id: 'dms-rep-3',
    projectId: 'dms-prj-1',
    vesselId: 'dms-vsl-1',
    reportDate: '2026-09-03',
    registeredBy: 'dms-usr-op',
    approvalStatus: 'Submitted',
    createdAt: '2026-09-03T18:02:00.000Z',
    updatedAt: '2026-09-03T18:33:00.000Z',
    submittedAt: '2026-09-03T18:33:00.000Z',
    submittedBy: 'dms-usr-op',
  },
  {
    id: 'dms-rep-4',
    projectId: 'dms-prj-1',
    vesselId: 'dms-vsl-1',
    reportDate: '2026-09-04',
    registeredBy: 'dms-usr-op',
    approvalStatus: 'Rejected',
    rejectionNote: 'مدت توقف فنی با گزارش شیفت همخوانی ندارد.',
    createdAt: '2026-09-04T18:00:00.000Z',
    updatedAt: '2026-09-05T08:00:00.000Z',
    submittedAt: '2026-09-04T18:30:00.000Z',
    submittedBy: 'dms-usr-op',
    rejectedAt: '2026-09-05T08:00:00.000Z',
    rejectedBy: 'dms-usr-sup',
  },
];

/** Four phases per cycle, per ۲-۸ — eight timestamps, no duration column. */
const SEED_CYCLES: DmsCycle[] = [
  {
    id: 'dms-cyc-1',
    reportId: 'dms-rep-1',
    cycleDate: '2026-09-01',
    cycleNumber: 1,
    dredgingStart: '06:20',
    dredgingEnd: '07:35',
    transportStart: '07:35',
    transportEnd: '08:10',
    dischargeStart: '08:10',
    dischargeEnd: '08:40',
    returnStart: '08:40',
    returnEnd: '09:15',
    dredgedVolumeM3: 1040,
  },
  {
    id: 'dms-cyc-2',
    reportId: 'dms-rep-1',
    cycleDate: '2026-09-01',
    cycleNumber: 2,
    dredgingStart: '09:30',
    dredgingEnd: '10:45',
    transportStart: '10:45',
    transportEnd: '11:20',
    dischargeStart: '11:20',
    dischargeEnd: '11:50',
    returnStart: '11:50',
    returnEnd: '12:25',
    dredgedVolumeM3: 1030,
  },
  {
    id: 'dms-cyc-3',
    reportId: 'dms-rep-2',
    cycleDate: '2026-09-02',
    cycleNumber: 1,
    dredgingStart: '06:15',
    dredgingEnd: '07:40',
    transportStart: '07:40',
    transportEnd: '08:15',
    dischargeStart: '08:15',
    dischargeEnd: '08:45',
    returnStart: '08:45',
    returnEnd: '09:20',
    dredgedVolumeM3: 1450,
  },
];

/**
 * Note the two classification fields side by side, and that they are seeded
 * consistently here — the schema does not require that, which is the point of
 * the warning in types.ts.
 */
/**
 * Starter rows for the lookup. Amir asks the administrator to enter these
 * once, so these are a starting point rather than a fixed set — the screen
 * exists precisely so he can change them.
 *
 * `isPlanned` here is the DEFAULT a row inherits on selection. The stoppage
 * row keeps its own flag and that is what `4 reads for T_PD.
 */
const SEED_STOPPAGE_TYPES: DmsStoppageType[] = [
  { id: 'dms-stp-type-1', code: 'MAINT-SCHED', category: 'Planned', name: 'سرویس دوره‌ای برنامه‌ریزی‌شده', isPlanned: true },
  { id: 'dms-stp-type-2', code: 'PUMP-FAIL', category: 'Technical', name: 'خرابی پمپ مکش', isPlanned: false },
  { id: 'dms-stp-type-3', code: 'CUTTER-FAIL', category: 'Technical', name: 'خرابی کاتر', isPlanned: false },
  { id: 'dms-stp-type-4', code: 'WEATHER', category: 'Operational', name: 'توقف به دلیل شرایط جوی', isPlanned: false },
  { id: 'dms-stp-type-5', code: 'WAIT-BARGE', category: 'Operational', name: 'انتظار برای بارج', isPlanned: false },
];
const SEED_STOPPAGES: DmsStoppage[] = [
  {
    id: 'dms-stp-1',
    reportId: 'dms-rep-1',
    stoppageDate: '2026-09-01',
    stoppageCode: 'MAINT-SCHED',
    category: 'Planned',
    rootCauseSystem: 'پمپ',
    notes: 'سرویس دوره‌ای پمپ',
    startTime: '12:30',
    endTime: '13:30',
    durationHours: 1,
    isPlanned: true,
    responsibleParty: 'Dredge',
  },
  {
    id: 'dms-stp-2',
    reportId: 'dms-rep-1',
    stoppageCode: 'PUMP-FAIL',
    stoppageDate: '2026-09-01',
    category: 'Technical',
    rootCauseSystem: 'پمپ مکش',
    startTime: '14:00',
    endTime: '15:20',
    durationHours: 1.33,
    isPlanned: false,
    responsibleParty: 'Dredge',
  },
  {
    id: 'dms-stp-3',
    reportId: 'dms-rep-2',
    stoppageDate: '2026-09-02',
    stoppageCode: 'WEATHER',
    category: 'Operational',
    notes: 'توقف به دلیل شرایط جوی',
    startTime: '11:00',
    endTime: '13:15',
    durationHours: 2.25,
    isPlanned: false,
    responsibleParty: 'Client',
  },
];

// ─── Seeding ────────────────────────────────────────────────────────────────
//
// A collection is seeded IF AND ONLY IF it has never been seeded before, and
// "has been seeded" is recorded EXPLICITLY in its own marker key. Two failures
// are being avoided and they pull in opposite directions:
//
//   OVERWRITING entered data. The original design gated all ten collections on
//   a single SEED_VERSION constant whose own comment invited you to bump it to
//   reinstall the samples — and bumping it rewrote everything unconditionally.
//   Harmless while these keys held read-only samples; not harmless once the
//   admin and operator screens made every one of them user-writable.
//
//   RESURRECTING deleted data. Seeding when a collection is EMPTY would undo a
//   delete: ensureSeed runs from every read path, so deleting the last project
//   would restore all of them on the next accessor call. "Empty because I
//   deleted everything" and "empty because it was never seeded" are different
//   facts — the same distinction as a draft of zero versus a draft nobody
//   entered.
//
// Keying on absence of the collection itself would avoid both today, but only
// because `write(KEY, [])` stores "[]", which is truthy. That is safe by
// accident: the first `deleteX` implementation that calls removeItem when a
// list empties would silently re-arm the resurrection. An explicit marker does
// not depend on that unwritten property.
//
// There is deliberately NO way to reset the samples from the UI. The capability
// exists — clear the markers — and exposing it is a decision for whoever takes
// it deliberately, not a side effect of editing a constant.

const KEY_SEEDED_PREFIX = 'dms:seeded:';
const LEGACY_SEED_VERSION_KEY = 'dms:seed-version';

/**
 * The collections the legacy `dms:seed-version` covered.
 *
 * ⚠ FROZEN. This is a historical fact about what version 2 seeded — NOT a view
 * of what the store seeds now.
 *
 * IT IS IDENTICAL TO `ensureSeed`'S LIST TODAY, AND THAT IS WHY MERGING THEM
 * IS THE TIDY-UP A LATER READER MAKES. They are equal for a reason that
 * expires: the day an eleventh collection is added they diverge, and nothing
 * about the code at that moment will say they were ever meant to. Two things
 * equal today, for a reason nobody wrote down — so it is written down here.
 *
 * If an eleventh collection is added later and this list were live, a browser
 * migrating AFTER that change would receive a marker for a collection it has
 * never held — and would then never be seeded with it. Silently, and only for
 * whoever happened to migrate late.
 */
const LEGACY_SEEDED_COLLECTIONS = [
  'projects',
  'subprojects',
  'vessels',
  'vessel-assignments',
  'personnel',
  'personnel-assignments',
  'shifts',
  'daily-reports',
  'cycles',
  'stoppages',
] as const;

/**
 * Answered once per page load. The markers remain the durable truth; this only
 * avoids re-asking a question already answered, since ensureSeed runs on every
 * store read and the per-key check is ten lookups rather than one.
 *
 * ONE OBSERVABLE DIFFERENCE, since "nothing changes" would be overstated in
 * the optimistic direction: the old version gate re-read storage on every
 * call, so clearing localStorage in devtools mid-session reseeded on the next
 * read. With this flag it does not reseed until a reload. Clearing storage is
 * a deliberate developer act and a reload settles it.
 */
let seedCheckedThisLoad = false;

function seedMarkerKey(collection: string): string {
  return `${KEY_SEEDED_PREFIX}${collection}`;
}

function seedIfNeverSeeded<T>(
  collection: string,
  key: string,
  rows: readonly T[],
): void {
  const marker = seedMarkerKey(collection);
  if (window.localStorage.getItem(marker) !== null) return;
  write(key, rows);
  window.localStorage.setItem(marker, '1');
}

/**
 * One-time migration for browsers seeded under the old scheme.
 *
 * WITHOUT THIS, THE FIX FIRES THE DEFECT IT CLOSES — once, on everyone who has
 * already used the app. Such a browser holds real entered data and no markers,
 * so the first read would find every collection unseeded and overwrite the lot.
 *
 * A legacy `dms:seed-version` is therefore treated as proof that all ten
 * legacy collections were seeded: mark them, seed nothing, drop the old key.
 *
 * ─── WHEN TO DELETE THIS ────────────────────────────────────────────────
 * THIS IS A ONE-TIME MIGRATION, NOT A PERMANENT FEATURE. It exists only for
 * browsers that ran DMS under the version-gated seeding removed on
 * 2026-09-08, and it becomes dead code once every store in use has run it.
 *
 * DELETE IT — together with LEGACY_SEEDED_COLLECTIONS and
 * LEGACY_SEED_VERSION_KEY — once dev testing is finished and no store
 * predates that change. Without this note, a later reader finds a branch
 * handling a `dms:seed-version` key the store no longer has any concept of,
 * cannot tell whether it is live or a fossil, and leaves it forever. A
 * constraint with no expiry in a permanent file is read as live forever.
 *
 * ⚠ "EVERY STORE" IS PER ORIGIN, WHICH IS LONGER THAN IT SOUNDS. localStorage
 * is origin-scoped, so this fires separately at localhost:3170 and under the
 * Shell at /dms. A tester who has used both has two independent stores and
 * migrates twice; the condition is satisfied per origin, not per person.
 */
function migrateLegacySeedVersion(): void {
  if (window.localStorage.getItem(LEGACY_SEED_VERSION_KEY) === null) return;
  for (const collection of LEGACY_SEEDED_COLLECTIONS) {
    window.localStorage.setItem(seedMarkerKey(collection), '1');
  }
  window.localStorage.removeItem(LEGACY_SEED_VERSION_KEY);
}

function ensureSeed(): void {
  if (seedCheckedThisLoad) return;
  migrateLegacySeedVersion();
  seedIfNeverSeeded('vessels', KEY_VESSELS, SEED_VESSELS);
  seedIfNeverSeeded('projects', KEY_PROJECTS, SEED_PROJECTS);
  seedIfNeverSeeded('vessel-assignments', KEY_VESSEL_ASSIGNMENTS, SEED_VESSEL_ASSIGNMENTS);
  seedIfNeverSeeded('subprojects', KEY_SUBPROJECTS, SEED_SUBPROJECTS);
  seedIfNeverSeeded('shifts', KEY_SHIFTS, SEED_SHIFTS);
  seedIfNeverSeeded('personnel', KEY_PERSONNEL, SEED_PERSONNEL);
  seedIfNeverSeeded('personnel-assignments', KEY_PERSONNEL_ASSIGNMENTS, SEED_PERSONNEL_ASSIGNMENTS);
  seedIfNeverSeeded('daily-reports', KEY_REPORTS, SEED_REPORTS);
  seedIfNeverSeeded('cycles', KEY_CYCLES, SEED_CYCLES);
  seedIfNeverSeeded('stoppages', KEY_STOPPAGES, SEED_STOPPAGES);
  // Added after the marker scheme landed. It is deliberately NOT in
  // LEGACY_SEEDED_COLLECTIONS — that list is a frozen historical fact about
  // what dms:seed-version=2 covered — so a browser that migrated off the old
  // scheme still receives this one. That is the frozen list working.
  seedIfNeverSeeded('stoppage-types', KEY_STOPPAGE_TYPES, SEED_STOPPAGE_TYPES);
  seedCheckedThisLoad = true;
}

// ─── Internal helpers (never exported; not async) ───────────────────────────

function allProjects(): DmsProject[] {
  ensureSeed();
  return read<DmsProject[]>(KEY_PROJECTS, []);
}

function requireProject(projectId: string): DmsProject {
  const project = allProjects().find((p) => p.id === projectId);
  if (!project) throw notFound('Project', projectId);
  return project;
}

/**
 * The demo fault. Confined to the one seeded project that carries the flag, so
 * every other record behaves normally and the failure is reproducible rather
 * than intermittent.
 */
function assertProjectAvailable(projectId: string): DmsProject {
  const project = requireProject(projectId);
  if (project.simulateUnavailable) {
    throw unavailable(
      `Data for project '${project.projectCode}' is temporarily unavailable.`,
    );
  }
  return project;
}

function allReports(): DmsDailyOperationReport[] {
  ensureSeed();
  return read<DmsDailyOperationReport[]>(KEY_REPORTS, []);
}

function requireReport(reportId: string): DmsDailyOperationReport {
  const report = allReports().find((r) => r.id === reportId);
  if (!report) throw notFound('Daily operation report', reportId);
  return report;
}

/**
 * The single active assignment for a project. ۲-۴'s `project_id` is UNIQUE, so
 * more than one row is a corrupted store and throws rather than silently
 * taking the first.
 */
function requireAssignment(projectId: string): DmsVesselAssignment {
  const rows = read<DmsVesselAssignment[]>(KEY_VESSEL_ASSIGNMENTS, []).filter(
    (a) => a.projectId === projectId,
  );
  if (rows.length === 0) {
    throw notFound('Vessel assignment for project', projectId);
  }
  if (rows.length > 1) {
    throw conflict(
      `Project '${projectId}' has ${rows.length} vessel assignment rows; FRD ۲-۴ makes project_id UNIQUE, so exactly one is permitted.`,
    );
  }
  return rows[0];
}

function inRange(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

/**
 * Refuse a patch that would leave a REQUIRED column absent, empty or
 * `undefined`.
 *
 * THIS IS THE CONTROL, AND IT LIVES HERE ON PURPOSE. The forms disable their
 * save button and omit blank required keys, but those are affordances in the
 * component — a caller that does not go through the form is not bound by
 * them. The layer that owns the data is the layer that must refuse, which is
 * the same lesson as the CashAdvance total and the CustomerRisk menu.
 *
 * NOTE THE ABSENCE OF AN `!== undefined` SHORT-CIRCUIT. `Partial<T>` types a
 * required property as `T[K] | undefined`, so `undefined` is precisely the
 * failing value — a guard that skips it skips the bug. A key that is ABSENT
 * from the patch is fine (nothing is being changed); a key PRESENT with
 * `undefined` is not.
 *
 * The key list is derived from the interface in types.ts, so adding a
 * required column fails the build until it is listed.
 */
function assertRequiredNotBlanked(
  entity: string,
  patch: Record<string, unknown>,
  requiredKeys: readonly string[],
): void {
  const blanked = requiredKeys.filter((key) => {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) return false;
    const value = patch[key];
    if (value === undefined || value === null) return true;
    if (typeof value === 'string' && value.trim().length === 0) return true;
    return false;
  });
  if (blanked.length === 0) return;
  throw validation(
    `${entity}: these columns are required and cannot be cleared: ${blanked.join(
)}.`,
    Object.fromEntries(blanked.map((key) => [key, 'required'])),
  );
}
/**
 * THE SINGLE PRIVILEGED CAST IN DMS.
 *
 * The brand in types.ts is phantom, so the only way to produce an
 * ApprovedDailyReport is here, immediately after the filter that makes the
 * claim true. Every other `as ApprovedDailyReport` in the zone is banned by
 * our eslint config; this file is the one named exception, and the cast sits
 * two lines from the filter it depends on so a later edit cannot separate them
 * without it being obvious.
 */
function brandApproved(
  rows: DmsDailyOperationReport[],
): ApprovedDailyReport[] {
  const approved = rows.filter((r) => r.approvalStatus === 'Approved');
  return approved as ApprovedDailyReport[];
}

// ─── Projects ───────────────────────────────────────────────────────────────

export async function listProjects(
  query: ProjectQuery = {},
): Promise<DmsProject[]> {
  return mockRead(() =>
    allProjects().filter((p) => {
      if (query.query) {
        const q = query.query.trim();
        if (
          q &&
          !p.contractSubject.includes(q) &&
          !p.projectCode.includes(q)
        ) {
          return false;
        }
      }
      return true;
    }),
  );
}

export async function getProject({ id }: EntityRef): Promise<DmsProject> {
  return mockRead(() => requireProject(id));
}

/**
 * ۲-۱ «کد پروژه | تولید خودکار توسط سیستم، یکتا» — system-generated and
 * unique, so it is not a parameter. A seed record: the two fields needed to
 * exist, with the other 43 completed on the edit page.
 */
export async function createProject(args: {
  contractNumber: string;
  contractSubject: string;
  actor: DmsActor;
}): Promise<DmsProject> {
  return mockWrite(() => {
    if (args.actor.role !== 'ProjectControl') {
      throw forbidden(
        `Only ProjectControl may define a project; actor is ${args.actor.role}.`,
      );
    }
    const contractNumber = args.contractNumber.trim();
    const contractSubject = args.contractSubject.trim();
    if (contractNumber.length === 0) {
      throw validation('A contract number is required.', {
        contractNumber: 'required',
      });
    }
    if (contractSubject.length === 0) {
      throw validation('A contract subject is required.', {
        contractSubject: 'required',
      });
    }

    const all = allProjects();
    const created: DmsProject = {
      id: uuid(),
      projectCode: nextProjectCode(all),
      contractNumber,
      contractSubject,
      executionArea: '',
      initialDredgingVolumeM3: 0,
    };
    write(KEY_PROJECTS, [...all, created]);
    return created;
  });
}

export async function updateProject(args: {
  id: string;
  patch: ProjectPatch;
  actor: DmsActor;
}): Promise<DmsProject> {
  return mockWrite(() => {
    if (args.actor.role !== 'ProjectControl') {
      throw forbidden(
        `Only ProjectControl may edit a project; actor is ${args.actor.role}.`,
      );
    }
    const all = allProjects();
    const existing = all.find((p) => p.id === args.id);
    if (!existing) throw notFound('Project', args.id);

    assertRequiredNotBlanked('Project', args.patch, REQUIRED_PROJECT_KEYS);

    const next: DmsProject = { ...existing, ...args.patch };
    write(
      KEY_PROJECTS,
      all.map((p) => (p.id === args.id ? next : p)),
    );
    return next;
  });
}

/** ۲-۱'s auto-generated project code. Highest existing number plus one. */
function nextProjectCode(all: DmsProject[]): string {
  const year = new Date().getFullYear();
  const highest = all.reduce((max, p) => {
    const match = /^PRJ-\d+-(\d+)$/.exec(p.projectCode);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `PRJ-${year}-${String(highest + 1).padStart(3, '0')}`;
}

// ─── Vessels and the project↔vessel one-to-one ──────────────────────────────

export async function listVessels(
  query: VesselQuery = {},
): Promise<DmsVessel[]> {
  return mockRead(() => {
    ensureSeed();
    const all = read<DmsVessel[]>(KEY_VESSELS, []);
    const q = query.query?.trim();
    if (!q) return all;
    return all.filter(
      (v) =>
        v.name.includes(q) ||
        v.vesselCode.includes(q) ||
        (v.vesselType ?? '').includes(q),
    );
  });
}

export async function getVessel({ id }: EntityRef): Promise<DmsVessel> {
  return mockRead(() => {
    ensureSeed();
    const vessel = read<DmsVessel[]>(KEY_VESSELS, []).find((v) => v.id === id);
    if (!vessel) throw notFound('Vessel', id);
    return vessel;
  });
}

/**
 * ۲-۳ «کد شناور | تولید خودکار توسط سیستم» — the code is SYSTEM-GENERATED, so
 * it is not a parameter. A form that accepted it would be inventing a field
 * the eventual API assigns, and the first duplicate would arrive from a user.
 *
 * A seed record, per the estate's create-page convention: the few fields
 * needed to exist, then the edit page for the rest.
 */
export async function createVessel(args: {
  name: string;
  vesselType?: string;
  actor: DmsActor;
}): Promise<DmsVessel> {
  return mockWrite(() => {
    if (args.actor.role !== 'ProjectControl') {
      throw forbidden(
        `Only ProjectControl may define a vessel; actor is ${args.actor.role}.`,
      );
    }
    const name = args.name.trim();
    if (name.length === 0) {
      throw validation('A vessel name is required.', { name: 'required' });
    }

    ensureSeed();
    const all = read<DmsVessel[]>(KEY_VESSELS, []);
    const created: DmsVessel = {
      id: uuid(),
      vesselCode: nextVesselCode(all),
      name,
      vesselType: args.vesselType?.trim() || undefined,
    };
    write(KEY_VESSELS, [...all, created]);
    return created;
  });
}

/**
 * `id` and `vesselCode` are not patchable: one is identity and the other is
 * system-generated. Excluding them in the TYPE means a form that tries fails
 * the build rather than being refused at runtime.
 */
export async function updateVessel(args: {
  id: string;
  patch: VesselPatch;
  actor: DmsActor;
}): Promise<DmsVessel> {
  return mockWrite(() => {
    if (args.actor.role !== 'ProjectControl') {
      throw forbidden(
        `Only ProjectControl may edit a vessel; actor is ${args.actor.role}.`,
      );
    }
    ensureSeed();
    const all = read<DmsVessel[]>(KEY_VESSELS, []);
    const existing = all.find((v) => v.id === args.id);
    if (!existing) throw notFound('Vessel', args.id);

    assertRequiredNotBlanked('Vessel', args.patch, REQUIRED_VESSEL_KEYS);

    const next: DmsVessel = { ...existing, ...args.patch };
    write(
      KEY_VESSELS,
      all.map((v) => (v.id === args.id ? next : v)),
    );
    return next;
  });
}

/** ۲-۳'s auto-generated code. Highest existing number plus one, never reused. */
function nextVesselCode(all: DmsVessel[]): string {
  const highest = all.reduce((max, v) => {
    const match = /^KRZ-(\d+)$/.exec(v.vesselCode);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `KRZ-${String(highest + 1).padStart(2, '0')}`;
}

/**
 * The one-to-one, read through its single accessor.
 *
 * Returns the vessel or THROWS — deliberately not `DmsVessel | null`. ۲-۴
 * states the invariant outright («هر پروژه فقط و فقط یک شناور»), so a project
 * without a vessel is an error, not an empty state. Returning null would put
 * an optional check at every call site, and the forgotten ones would render
 * blank: the same phantom-empty failure the SSR guard above exists to prevent,
 * rebuilt by hand.
 */
export async function getProjectVessel({
  projectId,
}: ProjectRef): Promise<DmsVessel> {
  return mockRead(() => {
    assertProjectAvailable(projectId);
    const assignment = requireAssignment(projectId);
    const vessel = read<DmsVessel[]>(KEY_VESSELS, []).find(
      (v) => v.id === assignment.vesselId,
    );
    if (!vessel) throw notFound('Vessel', assignment.vesselId);
    return vessel;
  });
}

/**
 * Every assignment row, for the overview that shows which projects have a
 * vessel and which do not.
 *
 * Returns rows rather than a joined view: the join to projects and vessels is
 * presentation, and doing it here would invent a shape the eventual API does
 * not return.
 */
export async function listVesselAssignments(): Promise<DmsVesselAssignment[]> {
  return mockRead(() => {
    ensureSeed();
    return read<DmsVesselAssignment[]>(KEY_VESSEL_ASSIGNMENTS, []);
  });
}

export async function getVesselAssignment({
  projectId,
}: ProjectRef): Promise<DmsVesselAssignment> {
  return mockRead(() => {
    ensureSeed();
    return requireAssignment(projectId);
  });
}

/**
 * Create the project's one and only assignment row.
 *
 * ۲-۴ makes `project_id` UNIQUE: one row per project, ever. So this REFUSES a
 * second row rather than ending a previous one — there is no swap in this
 * model and therefore no assignment history. A correction goes through
 * `correctVesselAssignment`, which updates the single row.
 */
export async function assignVesselToProject(args: {
  projectId: string;
  vesselId: string;
  assignmentDate: string;
  actor: DmsActor;
}): Promise<DmsVesselAssignment> {
  return mockWrite(() => {
    if (args.actor.role !== 'ProjectControl') {
      throw forbidden(
        `Only ProjectControl may assign a vessel to a project; actor is ${args.actor.role}.`,
      );
    }
    requireProject(args.projectId);
    if (!read<DmsVessel[]>(KEY_VESSELS, []).some((v) => v.id === args.vesselId)) {
      throw notFound('Vessel', args.vesselId);
    }

    const all = read<DmsVesselAssignment[]>(KEY_VESSEL_ASSIGNMENTS, []);
    if (all.some((a) => a.projectId === args.projectId)) {
      throw conflict(
        `Project '${args.projectId}' already has a vessel assignment. FRD ۲-۴ makes project_id UNIQUE — correct the existing row rather than adding one.`,
      );
    }

    const created: DmsVesselAssignment = {
      id: uuid(),
      projectId: args.projectId,
      vesselId: args.vesselId,
      assignmentDate: args.assignmentDate,
    };
    write(KEY_VESSEL_ASSIGNMENTS, [...all, created]);
    return created;
  });
}

/** Correct the single assignment row. The UNIQUE constraint admits nothing else. */
export async function correctVesselAssignment(args: {
  projectId: string;
  vesselId?: string;
  assignmentDate?: string;
  releaseDate?: string;
  actor: DmsActor;
}): Promise<DmsVesselAssignment> {
  return mockWrite(() => {
    if (args.actor.role !== 'ProjectControl') {
      throw forbidden(
        `Only ProjectControl may correct a vessel assignment; actor is ${args.actor.role}.`,
      );
    }
    const existing = requireAssignment(args.projectId);
    if (
      args.vesselId &&
      !read<DmsVessel[]>(KEY_VESSELS, []).some((v) => v.id === args.vesselId)
    ) {
      throw notFound('Vessel', args.vesselId);
    }

    const next: DmsVesselAssignment = {
      ...existing,
      vesselId: args.vesselId ?? existing.vesselId,
      assignmentDate: args.assignmentDate ?? existing.assignmentDate,
      releaseDate: args.releaseDate ?? existing.releaseDate,
    };
    const all = read<DmsVesselAssignment[]>(KEY_VESSEL_ASSIGNMENTS, []).map(
      (a) => (a.id === existing.id ? next : a),
    );
    write(KEY_VESSEL_ASSIGNMENTS, all);
    return next;
  });
}

// ─── Subprojects, shifts, personnel ─────────────────────────────────────────

export async function listSubprojects(
  query: SubprojectQuery,
): Promise<DmsSubproject[]> {
  return mockRead(() => {
    assertProjectAvailable(query.projectId);
    const rows = read<DmsSubproject[]>(KEY_SUBPROJECTS, []).filter(
      (s) => s.projectId === query.projectId,
    );
    const q = query.query?.trim();
    if (!q) return rows;
    return rows.filter(
      (s) => s.title.includes(q) || s.subprojectCode.includes(q),
    );
  });
}

export async function getSubproject({
  id,
}: EntityRef): Promise<DmsSubproject> {
  return mockRead(() => {
    ensureSeed();
    const row = read<DmsSubproject[]>(KEY_SUBPROJECTS, []).find(
      (s) => s.id === id,
    );
    if (!row) throw notFound('Subproject', id);
    return row;
  });
}

/**
 * ۲-۲ «کد زیرپروژه | تولید خودکار (ترکیب کد پروژه و شماره ردیف)».
 *
 * THE ONE CONSTRAINT ۲-۲ CARRIES THAT ۲-۱ DOES NOT: this code is not merely
 * system-generated, it is COMPOSED — the parent project's code plus a row
 * number within that project. So it cannot be issued without reading the
 * parent, and it is why `projectId` is excluded from SubprojectPatch: an edit
 * that re-parented a subproject would leave its code naming a project it no
 * longer belongs to, with nothing failing.
 */
export async function createSubproject(args: {
  projectId: string;
  title: string;
  actor: DmsActor;
}): Promise<DmsSubproject> {
  return mockWrite(() => {
    if (args.actor.role !== 'ProjectControl') {
      throw forbidden(
        `Only ProjectControl may define a subproject; actor is ${args.actor.role}.`,
      );
    }
    const project = assertProjectAvailable(args.projectId);
    const title = args.title.trim();
    if (title.length === 0) {
      throw validation('A subproject title is required.', {
        title: 'required',
      });
    }

    const all = read<DmsSubproject[]>(KEY_SUBPROJECTS, []);
    const created: DmsSubproject = {
      id: uuid(),
      projectId: args.projectId,
      subprojectCode: nextSubprojectCode(project.projectCode, all, args.projectId),
      title,
    };
    write(KEY_SUBPROJECTS, [...all, created]);
    return created;
  });
}

export async function updateSubproject(args: {
  id: string;
  patch: SubprojectPatch;
  actor: DmsActor;
}): Promise<DmsSubproject> {
  return mockWrite(() => {
    if (args.actor.role !== 'ProjectControl') {
      throw forbidden(
        `Only ProjectControl may edit a subproject; actor is ${args.actor.role}.`,
      );
    }
    ensureSeed();
    const all = read<DmsSubproject[]>(KEY_SUBPROJECTS, []);
    const existing = all.find((s) => s.id === args.id);
    if (!existing) throw notFound('Subproject', args.id);

    assertRequiredNotBlanked('Subproject', args.patch, REQUIRED_SUBPROJECT_KEYS);

    const next: DmsSubproject = { ...existing, ...args.patch };
    write(
      KEY_SUBPROJECTS,
      all.map((s) => (s.id === args.id ? next : s)),
    );
    return next;
  });
}

/** `<parent project code>-NN`, numbered within that project. */
function nextSubprojectCode(
  projectCode: string,
  all: DmsSubproject[],
  projectId: string,
): string {
  const siblings = all.filter((s) => s.projectId === projectId);
  const highest = siblings.reduce((max, s) => {
    const match = /-(\d+)$/.exec(s.subprojectCode);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${projectCode}-${String(highest + 1).padStart(2, '0')}`;
}

/**
 * FRD «شیفت» — the shift reference table, an UNNUMBERED lookup under ۲-۶.
 *
 * ⛔ HE POPULATES THIS, WE DO NOT. His three columns are شناسه شیفت,
 * «نام شیفت | متنی | مثال: روز، شب» and «بازه زمانی شیفت | متنی | مانند
 * ۰۸:۰۰ الی ۱۶:۰۰». Both «مثال» and «مانند» mark EXAMPLES, not closed sets —
 * the same framing as «و غیره» on vessel types. Do not turn either into an
 * enum, and do not present the two seeded rows as the full set.
 *
 * ⚠ NO DELETE, MATCHING THE STOPPAGE-TYPE LOOKUP. A shift referenced by a
 * ۲-۶ assignment would be left pointing at nothing, and an assignment whose
 * shift has been deleted looks the same as one that never had a shift. If a
 * row is wrong it is corrected; there is no path here that orphans a
 * reference. The absence is deliberate and is not an unfinished screen.
 */
export async function listShifts(): Promise<DmsShift[]> {
  return mockRead(() => {
    ensureSeed();
    return read<DmsShift[]>(KEY_SHIFTS, []);
  });
}

export async function getShift({ id }: EntityRef): Promise<DmsShift> {
  return mockRead(() => {
    ensureSeed();
    const found = read<DmsShift[]>(KEY_SHIFTS, []).find((sh) => sh.id === id);
    if (!found) throw notFound('Shift', id);
    return found;
  });
}

export async function createShift(args: {
  name: string;
  timeRangeText: string;
  actor: DmsActor;
}): Promise<DmsShift> {
  return mockWrite(() => {
    if (args.actor.role !== 'ProjectControl') {
      throw forbidden(
        `Only ProjectControl may maintain the shifts; actor is ${args.actor.role}.`,
      );
    }
    const name = args.name.trim();
    const timeRangeText = args.timeRangeText.trim();
    const missing: Record<string, string> = {};
    if (name.length === 0) missing.name = 'required';
    if (timeRangeText.length === 0) missing.timeRangeText = 'required';
    if (Object.keys(missing).length > 0) {
      throw validation('A shift needs a name and a time range.', missing);
    }

    ensureSeed();
    const all = read<DmsShift[]>(KEY_SHIFTS, []);
    if (all.some((sh) => sh.name === name)) {
      throw conflict(
        `A shift named '${name}' already exists. The name is how an operator tells one shift from another when assigning personnel, so two with the same name cannot be told apart.`,
      );
    }

    const created: DmsShift = { id: uuid(), name, timeRangeText };
    write(KEY_SHIFTS, [...all, created]);
    return created;
  });
}

export async function updateShift(args: {
  id: string;
  patch: ShiftPatch;
  actor: DmsActor;
}): Promise<DmsShift> {
  return mockWrite(() => {
    if (args.actor.role !== 'ProjectControl') {
      throw forbidden(
        `Only ProjectControl may maintain the shifts; actor is ${args.actor.role}.`,
      );
    }
    ensureSeed();
    const all = read<DmsShift[]>(KEY_SHIFTS, []);
    const existing = all.find((sh) => sh.id === args.id);
    if (!existing) throw notFound('Shift', args.id);

    assertRequiredNotBlanked('Shift', args.patch, REQUIRED_SHIFT_KEYS);

    const nextName = args.patch.name?.trim() ?? existing.name;
    if (all.some((sh) => sh.id !== args.id && sh.name === nextName)) {
      throw conflict(`A shift named '${nextName}' already exists.`);
    }

    const next: DmsShift = { ...existing, ...args.patch, name: nextName };
    write(
      KEY_SHIFTS,
      all.map((sh) => (sh.id === args.id ? next : sh)),
    );
    return next;
  });
}

export async function listPersonnel(): Promise<DmsPersonnel[]> {
  return mockRead(() => {
    ensureSeed();
    return read<DmsPersonnel[]>(KEY_PERSONNEL, []);
  });
}

export async function getPersonnel({ id }: EntityRef): Promise<DmsPersonnel> {
  return mockRead(() => {
    ensureSeed();
    const found = read<DmsPersonnel[]>(KEY_PERSONNEL, []).find((p) => p.id === id);
    if (!found) throw notFound('Personnel', id);
    return found;
  });
}

/**
 * ۲-۵ جدول مشخصات پرسنل — the personnel MASTER table.
 *
 * ⚠ ۲-۵ MARKS «شناسه پرسنل» AS «کلید اصلی» AND HERE THAT IS CORRECT — which
 * is worth stating precisely because the IDENTICAL row appears in ۲-۶ and is
 * wrong there. One row per person is what a master table IS. In ۲-۶ the row is
 * an ASSIGNMENT, and a primary key on the person would allow one assignment
 * per person ever, which is exactly what Amir corrected in msg 194.
 *
 * The two rows are character-identical and mean opposite things. Do not carry
 * a finding from one to the other: a row's meaning comes from the table it
 * sits in.
 *
 * ⛔ ۲-۵ HAS A THIRD COLUMN, «سایر اطلاعات فردی», AND IT IS NOT MODELLED.
 * No fields, no types — genuinely unspecified at source. Inventing personal
 * fields for the customer's own staff is not ours to do, and it is expensive
 * to remove once it has been shown to him. If it needs answering it goes up
 * the line, never into a guess here.
 */
export async function createPersonnel(args: {
  fullName: string;
  actor: DmsActor;
}): Promise<DmsPersonnel> {
  return mockWrite(() => {
    if (args.actor.role !== 'ProjectControl') {
      throw forbidden(
        `Only ProjectControl may create personnel; actor is ${args.actor.role}.`,
      );
    }
    const fullName = args.fullName.trim();
    if (fullName === '') {
      throw validation('A person must have a name; ۲-۵ «نام پرسنل» is not optional.');
    }

    const created: DmsPersonnel = { id: uuid(), fullName };
    write(KEY_PERSONNEL, [...read<DmsPersonnel[]>(KEY_PERSONNEL, []), created]);
    return created;
  });
}

export async function updatePersonnel(args: {
  id: string;
  patch: PersonnelPatch;
  actor: DmsActor;
}): Promise<DmsPersonnel> {
  return mockWrite(() => {
    if (args.actor.role !== 'ProjectControl') {
      throw forbidden(
        `Only ProjectControl may change personnel; actor is ${args.actor.role}.`,
      );
    }
    const all = read<DmsPersonnel[]>(KEY_PERSONNEL, []);
    const existing = all.find((p) => p.id === args.id);
    if (!existing) throw notFound('Personnel', args.id);

    // A patch key present with `undefined` must not blank a required column.
    if ('fullName' in args.patch && args.patch.fullName === undefined) {
      throw validation('fullName is required and cannot be cleared.');
    }
    const fullName = (args.patch.fullName ?? existing.fullName).trim();
    if (fullName === '') {
      throw validation('A person must have a name; ۲-۵ «نام پرسنل» is not optional.');
    }

    const next: DmsPersonnel = { ...existing, fullName };
    write(KEY_PERSONNEL, all.map((p) => (p.id === next.id ? next : p)));
    return next;
  });
}

/**
 * Remove a person from the master table.
 *
 * ⛔ REFUSED WHILE ANY ASSIGNMENT REFERENCES THEM, INCLUDING ENDED ONES.
 * Deleting the person behind a historic assignment does not remove the
 * assignment — it leaves a row pointing at nothing, and the ۲-۶ screen would
 * then show a bare id where a name should be. That is precisely the history
 * Amir asked the date fields to preserve, destroyed from the other end.
 *
 * The ended assignments are the ones this protects that nobody would think to
 * check: an active assignment makes the person obviously in use, while a
 * finished one makes them look free.
 */
export async function deletePersonnel(args: {
  id: string;
  actor: DmsActor;
}): Promise<void> {
  return mockWrite(() => {
    if (args.actor.role !== 'ProjectControl') {
      throw forbidden(
        `Only ProjectControl may remove personnel; actor is ${args.actor.role}.`,
      );
    }
    const all = read<DmsPersonnel[]>(KEY_PERSONNEL, []);
    if (!all.some((p) => p.id === args.id)) throw notFound('Personnel', args.id);

    const refs = read<DmsPersonnelAssignment[]>(KEY_PERSONNEL_ASSIGNMENTS, []).filter(
      (a) => a.personnelId === args.id,
    );
    if (refs.length > 0) {
      throw conflict(
        `This person has ${refs.length} project assignment(s) recorded, including any that have ended, so removing them would leave those records pointing at nobody. Remove the assignments first if the person was recorded in error.`,
      );
    }

    write(KEY_PERSONNEL, all.filter((p) => p.id !== args.id));
  });
}

/** `YYYY-MM-DD`, the form every date in this store already takes. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Open-ended assignments compare as running forever. */
const OPEN_END = '9999-12-31';

function assertDate(value: string, field: string): void {
  if (!ISO_DATE.test(value)) {
    throw validation(`${field} must be a date in YYYY-MM-DD form; received '${value}'.`);
  }
}

/**
 * Do two assignment windows touch? INCLUSIVE AT BOTH ENDS.
 *
 * ⚠ THE WORKFLOW CONSEQUENCE, WHICH NOBODY WILL PREDICT FROM THE ERROR TEXT:
 * A SAME-DAY HANDOVER IS REFUSED. An assignment ending 2026-01-31 conflicts
 * with one starting 2026-01-31, because on that date the person holds both —
 * which is precisely what Amir's rule forbids. To hand over, end the outgoing
 * assignment on the 30th.
 *
 * This is deliberate and it is the conservative direction: it matches his
 * sentence as written, and it agrees with the last-day-inclusive boundary in
 * `listActivePersonnelForProject` — a person is ON a project on their end
 * date, so two end dates cannot both be "on" the same day.
 *
 * ⛔ IT IS ALSO THE FIRST THING SOMEONE WILL REPORT AS A BUG, which is why it
 * is stated here AND in the 409 text rather than left to be discovered. A
 * question is registered with Amir about whether a same-day handover should be
 * permitted; until he answers, DO NOT relax this to an exclusive comparison.
 */
function windowsOverlap(
  aStart: string,
  aEnd: string | undefined,
  bStart: string,
  bEnd: string | undefined,
): boolean {
  return aStart <= (bEnd ?? OPEN_END) && bStart <= (aEnd ?? OPEN_END);
}

/**
 * EVERY assignment row for one project, ended ones included.
 *
 * This is the ADMINISTRATION view and it is meant to show history — you cannot
 * correct or end an assignment you cannot see. It is deliberately NOT the
 * function that answers "who is on this project": see
 * `listActivePersonnelForProject`, and note that the two returning the same
 * thing is the symptom of the filter having gone.
 *
 * ⛔ SCOPED BY PROJECT IN THE STORE, NOT BY A FILTER IN A COMPONENT. This is
 * the CashAdvance defect in its general form — nothing there scopes the query,
 * so a second tenant would see every row and nothing would fail. A caller here
 * cannot obtain the unscoped set, because no function returns it.
 *
 * ⚠ DO NOT READ AMIR'S CASHADVANCE ANALOGY AS ENDORSING CASHADVANCE. His
 * msg 194 ends "the mechanism of these tables can be similar to how cash
 * advances are allocated to individuals in a Cash Advance System" — that
 * licenses the junction-table SHAPE and nothing else. The constraints in this
 * file exist because of how CashAdvance reads its rows, not in spite of it.
 * Same product, opposite polarity, one paragraph apart in the same answer.
 */
export async function listPersonnelAssignments({
  projectId,
}: ProjectRef): Promise<DmsPersonnelAssignment[]> {
  return mockRead(() => {
    assertProjectAvailable(projectId);
    return read<DmsPersonnelAssignment[]>(KEY_PERSONNEL_ASSIGNMENTS, []).filter(
      (a) => a.projectId === projectId,
    );
  });
}

/**
 * Who is assigned to this project ON A GIVEN DATE.
 *
 * ⛔ `onDate` IS REQUIRED, AND THAT IS THE CONTROL. It was optional in an
 * earlier draft and defaulting it would fail OPEN — a caller who omitted it
 * would silently get everyone ever assigned, people who have left included,
 * and the result would look completely normal.
 *
 * Same shape as the CashAdvance total that included rejected invoices: the
 * filter belonged in the read path and sat in a component, so one caller that
 * forgot it produced a wrong number nobody could see was wrong. Here there is
 * nothing to forget — the type refuses the call.
 *
 * Ended rows are FILTERED, never deleted: Amir asked for the dates so that
 * "the complete assignment history of personnel across different projects will
 * be maintained", so destroying the row would destroy the point of the field.
 */
export async function listActivePersonnelForProject({
  projectId,
  onDate,
}: ProjectRef & { onDate: string }): Promise<DmsPersonnel[]> {
  return mockRead(() => {
    assertProjectAvailable(projectId);
    assertDate(onDate, 'onDate');
    const ids = new Set(
      read<DmsPersonnelAssignment[]>(KEY_PERSONNEL_ASSIGNMENTS, [])
        .filter(
          (a) =>
            a.projectId === projectId &&
            a.startDate <= onDate &&
            (a.endDate ?? OPEN_END) >= onDate,
        )
        .map((a) => a.personnelId),
    );
    return read<DmsPersonnel[]>(KEY_PERSONNEL, []).filter((p) => ids.has(p.id));
  });
}

function requirePersonnelAssignment(id: string): DmsPersonnelAssignment {
  const found = read<DmsPersonnelAssignment[]>(KEY_PERSONNEL_ASSIGNMENTS, []).find(
    (a) => a.id === id,
  );
  if (!found) throw notFound('Personnel assignment', id);
  return found;
}

/**
 * Validate a window and refuse one that overlaps ANY existing assignment for
 * the same person, ON ANY PROJECT.
 *
 * ⛔ CROSS-PROJECT, AND THAT IS AMIR msg 194 VERBATIM, NOT OUR CAUTION:
 * "each employee can only be assigned to one project at any given time."
 *
 * An earlier draft of this function scoped the check to a single project,
 * reasoning that two sites at once was unusual but not absurd and that
 * refusing it would invent a rule we had not been given. That was wrong in the
 * one direction that matters: the rule already existed and the customer had
 * stated it. A guard narrowed on our own judgement would have admitted exactly
 * the rows he ruled out, and every one of them would have looked correct.
 */
function assertAssignmentWindow(args: {
  personnelId: string;
  projectId: string;
  startDate: string;
  endDate?: string;
  ignoreId?: string;
}): void {
  assertDate(args.startDate, 'startDate');
  if (args.endDate !== undefined) {
    assertDate(args.endDate, 'endDate');
    if (args.endDate < args.startDate) {
      throw validation(
        `endDate '${args.endDate}' is before startDate '${args.startDate}'.`,
      );
    }
  }
  const clash = read<DmsPersonnelAssignment[]>(KEY_PERSONNEL_ASSIGNMENTS, []).find(
    (a) =>
      a.id !== args.ignoreId &&
      a.personnelId === args.personnelId &&
      windowsOverlap(args.startDate, args.endDate, a.startDate, a.endDate),
  );
  if (clash) {
    throw conflict(
      `This person is already assigned to project '${clash.projectId}' from ${clash.startDate} to ${clash.endDate ?? 'open'}, which overlaps ${args.startDate} to ${args.endDate ?? 'open'}. Amir msg 194: an employee may hold only one project assignment at a time. End the existing assignment BEFORE the new one starts — the end date counts as a day on the project, so to start on ${args.startDate} the previous assignment must end on or before the day before.`,
    );
  }
}

export async function assignPersonnelToProject(args: {
  projectId: string;
  personnelId: string;
  startDate: string;
  endDate?: string;
  shiftId?: string;
  roleId?: DmsProjectRole;
  actor: DmsActor;
}): Promise<DmsPersonnelAssignment> {
  return mockWrite(() => {
    if (args.actor.role !== 'ProjectControl') {
      throw forbidden(
        `Only ProjectControl may assign personnel to a project; actor is ${args.actor.role}.`,
      );
    }
    requireProject(args.projectId);
    if (!read<DmsPersonnel[]>(KEY_PERSONNEL, []).some((p) => p.id === args.personnelId)) {
      throw notFound('Personnel', args.personnelId);
    }
    if (args.shiftId && !read<DmsShift[]>(KEY_SHIFTS, []).some((sh) => sh.id === args.shiftId)) {
      throw notFound('Shift', args.shiftId);
    }
    assertAssignmentWindow(args);

    const created: DmsPersonnelAssignment = {
      id: uuid(),
      personnelId: args.personnelId,
      projectId: args.projectId,
      startDate: args.startDate,
      ...(args.endDate !== undefined ? { endDate: args.endDate } : {}),
      ...(args.shiftId !== undefined ? { shiftId: args.shiftId } : {}),
      ...(args.roleId !== undefined ? { roleId: args.roleId } : {}),
    };
    write(KEY_PERSONNEL_ASSIGNMENTS, [
      ...read<DmsPersonnelAssignment[]>(KEY_PERSONNEL_ASSIGNMENTS, []),
      created,
    ]);
    return created;
  });
}

export async function updatePersonnelAssignment(args: {
  id: string;
  patch: PersonnelAssignmentPatch;
  actor: DmsActor;
}): Promise<DmsPersonnelAssignment> {
  return mockWrite(() => {
    if (args.actor.role !== 'ProjectControl') {
      throw forbidden(
        `Only ProjectControl may change a personnel assignment; actor is ${args.actor.role}.`,
      );
    }
    const existing = requirePersonnelAssignment(args.id);

    // A patch key present with undefined must not blank a required column —
    // the same refusal assertRequiredNotBlanked makes elsewhere in this file.
    if ('startDate' in args.patch && args.patch.startDate === undefined) {
      throw validation('startDate is required and cannot be cleared.');
    }
    if (
      args.patch.shiftId &&
      !read<DmsShift[]>(KEY_SHIFTS, []).some((sh) => sh.id === args.patch.shiftId)
    ) {
      throw notFound('Shift', args.patch.shiftId);
    }

    const next: DmsPersonnelAssignment = {
      ...existing,
      ...args.patch,
      startDate: args.patch.startDate ?? existing.startDate,
    };
    assertAssignmentWindow({
      personnelId: next.personnelId,
      projectId: next.projectId,
      startDate: next.startDate,
      endDate: next.endDate,
      ignoreId: next.id,
    });

    write(
      KEY_PERSONNEL_ASSIGNMENTS,
      read<DmsPersonnelAssignment[]>(KEY_PERSONNEL_ASSIGNMENTS, []).map((a) =>
        a.id === next.id ? next : a,
      ),
    );
    return next;
  });
}

/**
 * Remove an assignment row entirely.
 *
 * ⚠ ENDING AN ASSIGNMENT AND DELETING ONE ARE DIFFERENT ACTS, and the screen
 * says so. Setting `endDate` records that someone left; deleting records that
 * they were never there. The second exists to correct a mistaken row, and it
 * is the one that destroys the history Amir asked the dates to preserve —
 * which is why it is separate rather than the way to make someone stop
 * appearing.
 */
export async function deletePersonnelAssignment(args: {
  id: string;
  actor: DmsActor;
}): Promise<void> {
  return mockWrite(() => {
    if (args.actor.role !== 'ProjectControl') {
      throw forbidden(
        `Only ProjectControl may remove a personnel assignment; actor is ${args.actor.role}.`,
      );
    }
    requirePersonnelAssignment(args.id);
    write(
      KEY_PERSONNEL_ASSIGNMENTS,
      read<DmsPersonnelAssignment[]>(KEY_PERSONNEL_ASSIGNMENTS, []).filter(
        (a) => a.id !== args.id,
      ),
    );
  });
}

// ─── Daily operation reports ────────────────────────────────────────────────

export async function listReports(
  query: ReportQuery,
): Promise<DmsDailyOperationReport[]> {
  return mockRead(() => {
    assertProjectAvailable(query.projectId);
    return allReports()
      .filter((r) => r.projectId === query.projectId)
      .filter((r) => !query.status || r.approvalStatus === query.status)
      .filter((r) => inRange(r.reportDate, query.from, query.to))
      .sort((a, b) => a.reportDate.localeCompare(b.reportDate));
  });
}

export async function getReport({
  id,
}: EntityRef): Promise<DmsDailyOperationReport> {
  return mockRead(() => requireReport(id));
}

/**
 * Create the day's report, always as Draft.
 *
 * `vesselId` is NOT a parameter. ۲-۷ carries it while ۲-۴ already makes the
 * vessel derivable from the project, so it is a denormalisation of a value
 * that has one true source. It is derived here from the assignment row and
 * never accepted from a caller — divergence is impossible rather than merely
 * unlikely.
 */
export async function createReport(args: {
  projectId: string;
  reportDate: string;
  dailyNotes?: string;
  actor: DmsActor;
}): Promise<DmsDailyOperationReport> {
  return mockWrite(() => {
    if (args.actor.role !== 'Operator') {
      throw forbidden(
        `Only Operator may create a daily report; actor is ${args.actor.role}.`,
      );
    }
    assertProjectAvailable(args.projectId);
    const assignment = requireAssignment(args.projectId);

    const existing = allReports().find(
      (r) =>
        r.projectId === args.projectId && r.reportDate === args.reportDate,
    );
    if (existing) {
      throw conflict(
        `A daily report already exists for project '${args.projectId}' on ${args.reportDate}.`,
      );
    }

    const created: DmsDailyOperationReport = {
      id: uuid(),
      projectId: args.projectId,
      vesselId: assignment.vesselId,
      reportDate: args.reportDate,
      registeredBy: args.actor.userId,
      approvalStatus: 'Draft',
      dailyNotes: args.dailyNotes,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    write(KEY_REPORTS, [...allReports(), created]);
    return created;
  });
}

/**
 * Edit the day, while the day is editable.
 *
 * The promise `1 already makes — «امکان ویرایش اطلاعات تا پیش از ارسال به
 * سرپرست» — and which nothing implemented until now. A documented capability
 * with no code behind it is the same defect as a control with no caller: it
 * reads as present and does nothing.
 *
 * Guarded by the SAME `requireEditableReport` as the stoppage writes, so there
 * is one definition of when a day may change and not two that agree today.
 * `ReportPatch` is an allow-list — see its docblock — so a field added to ۲-۷
 * later is not editable until somebody makes it so on purpose.
 */
export async function updateReport(args: {
  id: string;
  patch: ReportPatch;
  actor: DmsActor;
}): Promise<DmsDailyOperationReport> {
  return mockWrite(() => {
    const existing = requireEditableReport(args.id, args.actor);
    const next: DmsDailyOperationReport = {
      ...existing,
      ...args.patch,
      updatedAt: nowIso(),
    };
    write(
      KEY_REPORTS,
      allReports().map((r) => (r.id === args.id ? next : r)),
    );
    return next;
  });
}
/**
 * The ONLY producer of ApprovedDailyReport, and therefore the only path into
 * the KPI engine. `listReports` never returns the branded type even when every
 * row it returns happens to be approved — the filter has to have been applied
 * HERE for the claim to be true.
 */
export async function listApprovedReports(
  query: ApprovedReportQuery,
): Promise<ApprovedDailyReport[]> {
  return mockRead(() => {
    assertProjectAvailable(query.projectId);
    const rows = allReports()
      .filter((r) => r.projectId === query.projectId)
      .filter((r) => inRange(r.reportDate, query.range?.from, query.range?.to))
      .sort((a, b) => a.reportDate.localeCompare(b.reportDate));
    return brandApproved(rows);
  });
}

// ─── Cycles and stoppages ───────────────────────────────────────────────────
// ۲-۸ and ۲-۹ carry no report FK — the source links them to the day by date
// alone. Our `reportId` is ours, and both are reached only through these
// accessors, so if the swap links by date instead that is a change inside this
// file and no call site moves.

/**
 * Every cycle belonging to a project's reports.
 *
 * The dashboard needs cycles across a range of days, and asking per report
 * would be one call per day. The join lives here because the store owns the
 * relationship — ۲-۸ links a cycle to its day, and a day to its project.
 *
 * NOTE THIS IS NOT FILTERED TO APPROVED. It cannot be: the approved filter is
 * the KPI engine's, applied against the branded reports it is given, and a
 * store function that quietly pre-filtered would put a second copy of that rule
 * somewhere nobody would look for it.
 */
export async function listCyclesForProject({
  projectId,
}: ProjectRef): Promise<DmsCycle[]> {
  return mockRead(() => {
    assertProjectAvailable(projectId);
    const reportIds = new Set(
      allReports()
        .filter((r) => r.projectId === projectId)
        .map((r) => r.id),
    );
    return read<DmsCycle[]>(KEY_CYCLES, []).filter((c) =>
      reportIds.has(c.reportId),
    );
  });
}

/** Every stoppage belonging to a project's reports. See listCyclesForProject. */
export async function listStoppagesForProject({
  projectId,
}: ProjectRef): Promise<DmsStoppage[]> {
  return mockRead(() => {
    assertProjectAvailable(projectId);
    const reportIds = new Set(
      allReports()
        .filter((r) => r.projectId === projectId)
        .map((r) => r.id),
    );
    return read<DmsStoppage[]>(KEY_STOPPAGES, []).filter((s) =>
      reportIds.has(s.reportId),
    );
  });
}

export async function listCyclesForReport({
  reportId,
}: ReportRef): Promise<DmsCycle[]> {
  return mockRead(() => {
    requireReport(reportId);
    return read<DmsCycle[]>(KEY_CYCLES, [])
      .filter((c) => c.reportId === reportId)
      .sort((a, b) => a.cycleNumber - b.cycleNumber);
  });
}

export async function listStoppagesForReport({
  reportId,
}: ReportRef): Promise<DmsStoppage[]> {
  return mockRead(() => {
    requireReport(reportId);
    return read<DmsStoppage[]>(KEY_STOPPAGES, [])
      .filter((s) => s.reportId === reportId)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  });
}

// ─── Workflow ───────────────────────────────────────────────────────────────

/**
 * The only path to a status change. The store persists; workflow.ts decides.
 * A component cannot set `approvalStatus` because no exported write here
 * accepts one.
 */
export async function transitionReport(args: {
  id: string;
  action: ReportAction;
  actor: DmsActor;
}): Promise<DmsDailyOperationReport> {
  return mockWrite(() => {
    const current = requireReport(args.id);
    const next = transition(current, args.action, args.actor, nowIso());
    write(
      KEY_REPORTS,
      allReports().map((r) => (r.id === args.id ? next : r)),
    );
    return next;
  });
}

// ─── Downtime types lookup (Amir msg 194, answers 5 & 6) ────────────────────

export async function listStoppageTypes(
  query: StoppageTypeQuery = {},
): Promise<DmsStoppageType[]> {
  return mockRead(() => {
    ensureSeed();
    const all = read<DmsStoppageType[]>(KEY_STOPPAGE_TYPES, []);
    const q = query.query?.trim();
    if (!q) return all;
    return all.filter(
      (row) =>
        row.code.includes(q) ||
        row.name.includes(q) ||
        row.category.includes(q),
    );
  });
}

export async function getStoppageType({
  id,
}: EntityRef): Promise<DmsStoppageType> {
  return mockRead(() => {
    ensureSeed();
    const row = read<DmsStoppageType[]>(KEY_STOPPAGE_TYPES, []).find(
      (t) => t.id === id,
    );
    if (!row) throw notFound('Stoppage type', id);
    return row;
  });
}

/**
 * The code is the operator-facing identifier and must be unique — a lookup
 * with two rows sharing a code cannot be selected from unambiguously.
 * Refused with Conflict rather than silently accepted, the same way ۲-۴
 * refuses a second vessel assignment.
 */
export async function createStoppageType(args: {
  code: string;
  category: string;
  name: string;
  isPlanned: boolean;
  actor: DmsActor;
}): Promise<DmsStoppageType> {
  return mockWrite(() => {
    if (args.actor.role !== 'ProjectControl') {
      throw forbidden(
        `Only ProjectControl may maintain the downtime types; actor is ${args.actor.role}.`,
      );
    }
    const code = args.code.trim();
    const category = args.category.trim();
    const name = args.name.trim();
    const missing: Record<string, string> = {};
    if (code.length === 0) missing.code = 'required';
    if (category.length === 0) missing.category = 'required';
    if (name.length === 0) missing.name = 'required';
    if (Object.keys(missing).length > 0) {
      throw validation('Code, category and name are required.', missing);
    }

    ensureSeed();
    const all = read<DmsStoppageType[]>(KEY_STOPPAGE_TYPES, []);
    if (all.some((t) => t.code === code)) {
      throw conflict(
        `A downtime type with code '${code}' already exists. Codes identify the type when an operator selects it, so they must be unique.`,
      );
    }

    const created: DmsStoppageType = {
      id: uuid(),
      code,
      category,
      name,
      isPlanned: args.isPlanned,
    };
    write(KEY_STOPPAGE_TYPES, [...all, created]);
    return created;
  });
}

export async function updateStoppageType(args: {
  id: string;
  patch: StoppageTypePatch;
  actor: DmsActor;
}): Promise<DmsStoppageType> {
  return mockWrite(() => {
    if (args.actor.role !== 'ProjectControl') {
      throw forbidden(
        `Only ProjectControl may maintain the downtime types; actor is ${args.actor.role}.`,
      );
    }
    ensureSeed();
    const all = read<DmsStoppageType[]>(KEY_STOPPAGE_TYPES, []);
    const existing = all.find((t) => t.id === args.id);
    if (!existing) throw notFound('Stoppage type', args.id);

    assertRequiredNotBlanked('Stoppage type', args.patch, REQUIRED_STOPPAGE_TYPE_KEYS);

    const nextCode = args.patch.code?.trim() ?? existing.code;
    if (all.some((t) => t.id !== args.id && t.code === nextCode)) {
      throw conflict(
        `A downtime type with code '${nextCode}' already exists. Codes must be unique.`,
      );
    }

    const next: DmsStoppageType = { ...existing, ...args.patch, code: nextCode };
    write(
      KEY_STOPPAGE_TYPES,
      all.map((t) => (t.id === args.id ? next : t)),
    );
    return next;
  });
}

// ─── Stoppage entry (create / edit / delete) ────────────────────────────────
//
// ⚠ EVERY WRITE HERE GOES THROUGH `assertEditable`, AND THAT IS THE CONTROL.
//
// `3 makes Submitted a soft lock and Approved «قفل دائم» — permanent — and an
// approved day's minutes are already inside the KPI figures. A stoppage
// created, edited or deleted against a submitted or approved report would
// MUTATE THE INPUTS TO A TOTAL THAT IS ALREADY COMPUTED AND LOCKED, with
// nothing failing. That is the CashAdvance defect in its exact shape.
//
// The refusal lives HERE and not in the form, for the same reason the ۲-۴
// conflict does: a form can hide a button, and a caller that does not go
// through the form is not bound by what the form hides.
//
// NOTE THE EDITABLE SET IS Draft OR Rejected, NOT Draft ALONE. `3 reopens the
// lock on rejection — «قفل ویرایش برای اپراتور باز می‌شود ... تا اپراتور آن را
// ویرایش و مجدد ارسال کند» — so a Draft-only rule would make a rejected report
// impossible to correct, which is the entire purpose of rejecting it.
// `assertEditable` already encoded that, and this is its first caller: it was
// written for "the store's write path" and the write path did not exist.

function requireEditableReport(
  reportId: string,
  actor: DmsActor,
): DmsDailyOperationReport {
  const report = requireReport(reportId);
  assertEditable(report, actor);
  return report;
}

export async function createStoppage(args: {
  reportId: string;
  stoppage: Omit<DmsStoppage, 'id' | 'reportId'>;
  actor: DmsActor;
}): Promise<DmsStoppage> {
  return mockWrite(() => {
    const report = requireEditableReport(args.reportId, args.actor);
    assertStoppageComplete(args.stoppage);

    const created: DmsStoppage = {
      ...args.stoppage,
      id: uuid(),
      reportId: report.id,
    };
    write(KEY_STOPPAGES, [...read<DmsStoppage[]>(KEY_STOPPAGES, []), created]);
    return created;
  });
}

export async function updateStoppage(args: {
  id: string;
  patch: StoppagePatch;
  actor: DmsActor;
}): Promise<DmsStoppage> {
  return mockWrite(() => {
    const all = read<DmsStoppage[]>(KEY_STOPPAGES, []);
    const existing = all.find((row) => row.id === args.id);
    if (!existing) throw notFound('Stoppage', args.id);

    // The parent decides, not the row: a stoppage is editable exactly while
    // the day it belongs to is.
    requireEditableReport(existing.reportId, args.actor);
    assertRequiredNotBlanked('Stoppage', args.patch, REQUIRED_STOPPAGE_KEYS);

    const next: DmsStoppage = { ...existing, ...args.patch };
    assertStoppageComplete(next);
    write(
      KEY_STOPPAGES,
      all.map((row) => (row.id === args.id ? next : row)),
    );
    return next;
  });
}

export async function deleteStoppage(args: {
  id: string;
  actor: DmsActor;
}): Promise<void> {
  return mockWrite(() => {
    const all = read<DmsStoppage[]>(KEY_STOPPAGES, []);
    const existing = all.find((row) => row.id === args.id);
    if (!existing) throw notFound('Stoppage', args.id);

    // Deleting from an approved day would remove minutes from a KPI total
    // that is already locked — the same defect as editing one.
    requireEditableReport(existing.reportId, args.actor);
    write(
      KEY_STOPPAGES,
      all.filter((row) => row.id !== args.id),
    );
  });
}

/**
 * Field-level validation shared by create and update.
 *
 * Duration is checked as a POSITIVE number rather than merely present: ۲-۹
 * gives it as «عددی اعشاری» hours, and a zero-length stoppage contributes
 * nothing to T_PD or T_UPD while still occupying a row — it reads as data and
 * measures nothing.
 */
function assertStoppageComplete(row: {
  stoppageDate: string;
  stoppageCode: string;
  category: string;
  startTime: string;
  endTime: string;
  durationHours: number;
}): void {
  const details: Record<string, string> = {};
  if (!row.stoppageDate.trim()) details.stoppageDate = 'required';
  if (!row.stoppageCode.trim()) details.stoppageCode = 'required';
  if (!row.category.trim()) details.category = 'required';
  if (!row.startTime.trim()) details.startTime = 'required';
  if (!row.endTime.trim()) details.endTime = 'required';
  if (!Number.isFinite(row.durationHours) || row.durationHours <= 0) {
    details.durationHours = 'must be greater than zero';
  }
  if (Object.keys(details).length > 0) {
    throw validation('This stoppage is missing required values.', details);
  }
}

// ─── Cycle entry (create / edit / delete) ───────────────────────────────────
//
// Same guard as the stoppage writes, for the same reason and through the same
// helper: a cycle carries volume and operating minutes, so creating, editing
// or deleting one against a locked day changes a KPI total that is already
// computed. Delete included — removing a cycle takes volume OUT of an
// approved figure exactly as editing one changes it.

/**
 * ۲-۸ «شماره چرخه (هر روز از ۱ شروع می‌شود)» — the sequence restarts each day,
 * and a report IS a day, so it is numbered within the report and assigned by
 * the store rather than typed.
 */
function nextCycleNumber(all: DmsCycle[], reportId: string): number {
  return (
    all
      .filter((c) => c.reportId === reportId)
      .reduce((max, c) => Math.max(max, c.cycleNumber), 0) + 1
  );
}

export async function createCycle(args: {
  reportId: string;
  cycle: Omit<DmsCycle, 'id' | 'reportId' | 'cycleNumber'>;
  actor: DmsActor;
}): Promise<DmsCycle> {
  return mockWrite(() => {
    const report = requireEditableReport(args.reportId, args.actor);
    assertCycleUsable(args.cycle);

    const all = read<DmsCycle[]>(KEY_CYCLES, []);
    const created: DmsCycle = {
      ...args.cycle,
      id: uuid(),
      reportId: report.id,
      cycleNumber: nextCycleNumber(all, report.id),
    };
    write(KEY_CYCLES, [...all, created]);
    return created;
  });
}

export async function updateCycle(args: {
  id: string;
  patch: CyclePatch;
  actor: DmsActor;
}): Promise<DmsCycle> {
  return mockWrite(() => {
    const all = read<DmsCycle[]>(KEY_CYCLES, []);
    const existing = all.find((c) => c.id === args.id);
    if (!existing) throw notFound('Cycle', args.id);

    // The parent decides, as with stoppages: the row cannot name an
    // editable report while belonging to a locked one.
    requireEditableReport(existing.reportId, args.actor);

    const next: DmsCycle = { ...existing, ...args.patch };
    assertCycleUsable(next);
    write(
      KEY_CYCLES,
      all.map((c) => (c.id === args.id ? next : c)),
    );
    return next;
  });
}

export async function deleteCycle(args: {
  id: string;
  actor: DmsActor;
}): Promise<void> {
  return mockWrite(() => {
    const all = read<DmsCycle[]>(KEY_CYCLES, []);
    const existing = all.find((c) => c.id === args.id);
    if (!existing) throw notFound('Cycle', args.id);
    requireEditableReport(existing.reportId, args.actor);
    write(
      KEY_CYCLES,
      all.filter((c) => c.id !== args.id),
    );
  });
}

/**
 * Refuse only what CANNOT be true.
 *
 * ⚠ AN END BEFORE ITS OWN START IS NOT AN ERROR HERE, AND REFUSING IT WOULD
 * BREAK A CASE WE ALREADY SUPPORT. `minutesBetween` treats a phase whose end
 * precedes its start as having crossed midnight and adds the day — a dredging
 * phase running 23:40→00:25 is ordinary. Validation that rejected it would
 * contradict the engine, and the operator would have no way to record a night
 * cycle truthfully.
 *
 * ⚠ AND ZERO VOLUME IS A REAL EVENT — a cycle that ran and produced nothing.
 * Refusing it would make an operator either lie or omit the cycle, and
 * omitting it loses the TIME as well. Negative volume is refused, because
 * that cannot be true.
 *
 * NO ORDERING RULES BETWEEN PHASES ARE INVENTED. The FRD states none, and
 * `unparseableCyclePhases` already counts what the engine cannot compute —
 * that bucket should keep earning its place rather than being pre-empted by
 * validation we made up.
 */
function assertCycleUsable(row: {
  cycleDate: string;
  dredgingStart: string;
  dredgingEnd: string;
  transportStart: string;
  transportEnd: string;
  dischargeStart: string;
  dischargeEnd: string;
  returnStart: string;
  returnEnd: string;
  dredgedVolumeM3?: number;
}): void {
  const details: Record<string, string> = {};
  if (!row.cycleDate.trim()) details.cycleDate = 'required';

  const clock = /^\d{1,2}:\d{2}$/;
  const times: ReadonlyArray<[string, string]> = [
    ['dredgingStart', row.dredgingStart],
    ['dredgingEnd', row.dredgingEnd],
    ['transportStart', row.transportStart],
    ['transportEnd', row.transportEnd],
    ['dischargeStart', row.dischargeStart],
    ['dischargeEnd', row.dischargeEnd],
    ['returnStart', row.returnStart],
    ['returnEnd', row.returnEnd],
  ];
  for (const [field, value] of times) {
    const v = value.trim();
    if (!v) {
      details[field] = 'required';
    } else if (!clock.test(v)) {
      details[field] = 'must be HH:mm';
    } else {
      const [h, m] = v.split(':').map(Number);
      if (h > 23 || m > 59) details[field] = 'not a valid time';
    }
  }

  if (row.dredgedVolumeM3 !== undefined && row.dredgedVolumeM3 < 0) {
    details.dredgedVolumeM3 = 'cannot be negative';
  }

  if (Object.keys(details).length > 0) {
    throw validation('This cycle is missing or has unusable values.', details);
  }
}
