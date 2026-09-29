/**
 * The DMS menu entries — declared HERE, in a DMS-owned module, and consumed by
 * `config/menu.config.tsx`.
 *
 * WHY NOT DECLARED IN THE MENU CONFIG DIRECTLY. The role each entry belongs to
 * must not be a set of strings restated beside the ones `session.ts` and
 * `middleware.ts` already use — two lists that agree today is a convention,
 * one list is a control. `dmsRoles` below is typed `DmsRole`, so a renamed or
 * removed role fails the build here rather than leaving a menu entry gated on
 * a role that no longer exists.
 *
 * `config/menu.config.tsx` is also a TEMPLATE file, overwritten by any
 * sync-kit run. Keeping the substance here means a sync costs us the wiring
 * (a few lines) rather than the definitions.
 *
 * ─── ONLY ROUTES THAT EXIST ─────────────────────────────────────────────────
 * ONE ENTRY PER BUILT SCREEN. A menu item for a screen that does not exist is
 * a link to nothing — the same failure as a catalogue claiming more than the
 * code delivers, one scale down. Nothing unbuilt gets an entry.
 *
 * NO COUNT IS STATED HERE, DELIBERATELY. It has gone stale twice (four, then
 * eight) because the list grows and the sentence describing it does not. A
 * comment that must be edited every time the thing beside it changes will
 * eventually not be, and then it is wrong in a file people trust.
 *
 * `/forbidden` is excluded — it is a rewrite target, not a destination. Vessel
 * create and edit are reached from the vessels list, not from the menu.
 *
 * ─── THE MENU IS GATED BY THE AUTH SESSION ─────────────────────────────────
 * DMS roles are real Auth roles, so the menu filters: `dmsMenuItems` (below)
 * gives every entry the Auth role codes for its `dmsRoles` plus the Dms.Read
 * permission, and the sidebar's estate filter matches them against the
 * signed-in session — the same claims middleware.ts decides routes from. No
 * session or no DMS access shows no entries at all. Hiding an entry is a
 * courtesy; the route guard is the control.
 */

import { authRoleCodesFor, DMS_READ_PERMISSION } from './access';
import type { DmsRole } from './types';

/**
 * The heading the customer specified, under which the nine entries below are
 * nested. **A DELIBERATE ONE-CHARACTER DEPARTURE FROM WHAT HE TYPED.**
 *
 * ─── HIS INPUT, AND OURS ────────────────────────────────────────────────────
 *   his   «مدیریت لایروب ها»   — U+0020 between «لایروب» and «ها»
 *   ours  «مدیریت لایروب‌ها»   — U+200C (ZERO WIDTH NON-JOINER) in that one position
 *
 * The space between «مدیریت» and «لایروب» is a real word
 * boundary and is UNCHANGED. There are two spaces in his heading and only the
 * second one moves — "normalise the space" would have been ambiguous, so:
 * exactly one codepoint differs, and it is the one before the plural suffix.
 *
 * ─── WHY WE CHANGED IT ──────────────────────────────────────────────────────
 * The ZWNJ is FUNCTIONAL, not decorative. «لایروب» + «ها» is one word
 * — stem plus plural suffix — and a plain space permits a line break between
 * them. In a narrow RTL sidebar heading that wraps mid-word, which is a
 * rendering defect rather than a style preference. It is also the word boundary
 * that selection, search and screen readers use.
 *
 * A Persian keyboard emits a space there unless the typist deliberately reaches
 * for ZWNJ, so this is near-certainly incidental rather than chosen — and it is
 * the same name either way.
 *
 * VERIFIED, not assumed: `systemName` in `i18n/dms/fa.json` ENDS WITH the
 * normalised form exactly. So after this change the two spellings agree
 * character-for-character on everything they share, and differ only by the two
 * words he dropped. Before it, they disagreed invisibly in the middle.
 *
 * ─── PROVENANCE, SO A DECISION IS NOT MISTAKEN FOR AN ACCIDENT ──────────────
 * His raw bytes are preserved, never retyped at any hop on our side:
 *   (held verbatim in the customer-communications record, outside this repo)
 *   sha256 efd1923aaa6111c3f2496018a355d4a1192aebd2a73081b700c1e0285a2c8e83
 *
 * The value below was EXTRACTED from that file programmatically and the single
 * substitution asserted — same length, exactly one differing codepoint, and
 * that codepoint U+0020 → U+200C. It was not typed by hand.
 *
 * ⚠ REVERSIBLE IN ONE CHARACTER if he ever objects: put U+0020 back. He is not
 * being asked — normalising typography to a project's own convention is
 * ordinary, and he has four items open with us already.
 *
 * ─── AND IT IS STILL NOT THE SYSTEM NAME ────────────────────────────────────
 * Our earlier ruling that the canonical name stays out of the menu was OURS. He
 * has overridden it for his own project and that ruling is spent — but only for
 * this heading. `systemName` keeps its single home in `i18n/dms/fa.json`, and
 * this constant is not an alias for it.
 */
export const DMS_MENU_PARENT_TITLE = 'مدیریت لایروب\u200Cها';

export interface DmsMenuEntry {
  /**
   * ⛔ ABSOLUTE, AND IT MUST CARRY THE '/dms' PREFIX. DO NOT STRIP IT.
   *
   * This said the opposite until 2026-09-09 — "zone-relative, Next adds the
   * basePath, so no '/dms' prefix here" — and that belief is what made every
   * menu entry 404 on the first click.
   *
   * ─── THE CONTRACT IS ZoneLink'S, NOT NEXT'S ─────────────────────────────
   * These paths are not handed to next/link. They are handed to `ZoneLink`
   * (`app/components/zone-link.tsx`), which decides whether the href leaves
   * this app before Next ever sees it. Its own comment states the contract:
   * "The menu config stores absolute paths that ALREADY include the zone
   * prefix."
   *
   * Its same-app test is a literal prefix match against BASE (= '/dms', from
   * NEXT_PUBLIC_BASE_PATH):
   *
   *     crossesApp = !(href === BASE || href.startsWith(`${BASE}/`))
   *
   * A path WITHOUT the prefix fails that test, so ZoneLink treats it as
   * FOREIGN: it renders a plain <a> and navigates with
   * `window.location.href`. That is a raw browser request, and **the browser
   * does not add a basePath — prepending one is a Next feature.** So
   * '/admin/vessels' is requested as /admin/vessels, the prefix is simply
   * absent, and the Shell 404s.
   *
   * A path WITH the prefix takes the same-app branch, where ZoneLink strips it
   * back off (`href.slice(BASE.length) || '/'`) and hands the remainder to
   * next/link, which re-adds the basePath itself. Prefix present, stripped,
   * re-added — the round trip is why "Next adds it" was true and still
   * produced the wrong instruction.
   *
   * ⚠ SO THE TWO STATEMENTS ARE NOT IN CONFLICT, WHICH IS THE TRAP: Next does
   * add the basePath, and these paths must still carry it. The question is
   * never "does Next add it" but "does this value reach Next at all".
   *
   * EVERY PEER ZONE ALREADY DOES THIS — measured, not assumed: Spm 15 paths on
   * '/spm', CashAdvance 10, Person 5, Mpf 1, and not one bare product path
   * among them. DMS was the only exception.
   *
   * '/' becomes '/dms' with NO trailing slash, to match those peers exactly.
   *
   * ⚠ THE SLASH IS COSMETIC, NOT LOAD-BEARING, AND THAT IS WORTH KNOWING SO
   * NOBODY 'FIXES' A TRAILING SLASH ELSEWHERE AS A DEFECT. '/dms/' also takes
   * the same-app branch — a string starts with itself, so
   * '/dms/'.startsWith('/dms/') is true — and slices to '/' identically.
   * Executed both forms rather than reasoned about them. What breaks is the
   * MISSING PREFIX, never the slash.
   */
  path: string;
  /**
   * English label. Also the FALLBACK: it is passed as `defaultValue`, so a
   * missing translation renders readable English rather than a raw key.
   */
  title: string;

  /**
   * Key in the `dms` i18n namespace, resolved as `t('dms:<key>')`.
   *
   * ⛔ NOT A KEY IN `MENU_TRANSLATION_KEYS`, AND THAT IS THE WHOLE POINT.
   * That map is keyed by ENGLISH TITLE STRING across the entire estate — one
   * global namespace, ~294 entries, no field saying which product is asking.
   * `'Approvals'` is already in it and resolves to «مجوزهای فنی»
   * ("technical permits"), which is CORRECT for the brokerage product that
   * owns it. Adding a DMS meaning there would silently change that menu.
   *
   * It is not a missing entry. It is a namespace that cannot express the
   * distinction, which is why DMS carries its own.
   */
  titleKey: string;
  /**
   * Which DMS roles the entry is FOR. Empty means every DMS role.
   *
   * Applied at runtime: config/menu.config.tsx turns these into the Auth role
   * codes (authRoleCodesFor in ./access) that the sidebar's estate filter
   * matches against the signed-in session.
   */
  dmsRoles: readonly DmsRole[];
}

/** Role → screen mapping, per the customer's specification. */
export const DMS_MENU_ENTRIES: readonly DmsMenuEntry[] = [
  {
    path: '/dms',
    title: 'DMS Home',
    titleKey: 'menuHome',
    // Visible to all: the role picker is how the three-role demo is exercised.
    dmsRoles: [],
  },
  {
    path: '/dms/daily-report',
    title: 'Daily Report',
    titleKey: 'menuDailyReport',
    // §1 «ثبت گزارش روزانه، چرخه‌های عملیاتی و توقفات».
    dmsRoles: ['Operator'],
  },
  {
    path: '/dms/approvals',
    title: 'Approvals',
    titleKey: 'menuApprovals',
    // §1 «تایید نهایی گزارش یا رد آن جهت اصلاح».
    dmsRoles: ['VesselSupervisor'],
  },
  // §1 scopes the definition tables to کنترل پروژه. One entry per BUILT list
  // screen — create and edit are reached from their lists, never the menu.
  {
    path: '/dms/dashboard',
    title: 'Dashboard',
    titleKey: 'menuDashboard',
    // §1 «مشاهده داشبورد کلان مدیریتی».
    dmsRoles: ['ProjectControl'],
  },
  {
    // Head office's read-only view of the daily reports — view only, no entry.
    path: '/dms/reports',
    title: 'Daily Reports (view)',
    titleKey: 'menuReports',
    dmsRoles: ['ProjectControl'],
  },
  {
    path: '/dms/admin/projects',
    title: 'Projects',
    titleKey: 'menuProjects',
    dmsRoles: ['ProjectControl'],
  },
  {
    path: '/dms/admin/subprojects',
    title: 'Subprojects',
    titleKey: 'menuSubprojects',
    dmsRoles: ['ProjectControl'],
  },
  {
    path: '/dms/admin/vessels',
    title: 'Vessels',
    titleKey: 'menuVessels',
    dmsRoles: ['ProjectControl'],
  },
  {
    path: '/dms/admin/stoppage-types',
    title: 'Downtime Types',
    titleKey: 'menuStoppageTypes',
    dmsRoles: ['ProjectControl'],
  },
  {
    path: '/dms/admin/vessel-assignments',
    title: 'Vessel Assignment',
    titleKey: 'menuVesselAssignment',
    dmsRoles: ['ProjectControl'],
  },
  {
    // «شیفت» — the shift reference table, unnumbered in the customer's
    // specification. The customer populates it; «مثال: روز، شب» marks the seeded rows as examples.
    path: '/dms/admin/shifts',
    title: 'Shifts',
    titleKey: 'menuShifts',
    dmsRoles: ['ProjectControl'],
  },
  {
    // «نقش‌های پروژه (جدول یا لیست مرجع)» — an editable table: roles are added,
    // renamed, reordered and deactivated here (never deleted).
    path: '/dms/admin/project-roles',
    title: 'Project Roles',
    titleKey: 'menuProjectRoles',
    dmsRoles: ['ProjectControl'],
  },
  {
    // مشخصات پرسنل — the master table the personnel assignments reference.
    path: '/dms/admin/personnel',
    title: 'Personnel',
    titleKey: 'menuPersonnel',
    dmsRoles: ['ProjectControl'],
  },
  {
    // تخصیص پرسنل به پروژه‌ها. Prefixed like the rest — see the note on
    // `path` above; a bare '/admin/personnel-assignments' here would take
    // ZoneLink's cross-app branch and 404, exactly as all nine did.
    path: '/dms/admin/personnel-assignments',
    title: 'Personnel Assignment',
    titleKey: 'menuPersonnelAssignment',
    dmsRoles: ['ProjectControl'],
  },
  {
    // Project Control's corrected monthly volume, with the service's comparison
    // against the reported volume on the same screen.
    path: '/dms/admin/monthly-volume-corrections',
    title: 'Corrected dredging volume (monthly)',
    titleKey: 'menuMonthlyVolumeCorrections',
    dmsRoles: ['ProjectControl'],
  },
] as const;

/**
 * The DMS menu items as the sidebar receives them. Each carries the estate's own
 * `roles` + `permissions` fields, so the sidebar's filterMenuByRole matches them
 * against the signed-in session — the same claims the route guard reads — and
 * hides every entry when there is no session or no DMS access (fail closed).
 *
 * Pure and here, not inline in config/menu.config.tsx, so the menu test runs
 * THIS function through the estate's real filter rather than a copy of it.
 */
export function dmsMenuItems(
  translate: (entry: DmsMenuEntry) => string,
): { title: string; path: string; roles: string[]; permissions: string[] }[] {
  return DMS_MENU_ENTRIES.map((entry) => ({
    title: translate(entry),
    path: entry.path,
    roles: authRoleCodesFor(entry.dmsRoles),
    permissions: [DMS_READ_PERMISSION],
  }));
}
