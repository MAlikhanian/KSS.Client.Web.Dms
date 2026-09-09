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
 * ─── DESIGN NOTE FOR THE BACKEND PHASE — NOT A CONTROL ──────────────────────
 * NOTHING BELOW IS ENFORCED. It is a condition for a future decision, written
 * here so the reasoning survives the person who made it.
 *
 * The entries are currently rendered UNFILTERED: every role sees all of them, and
 * `middleware.ts` refuses the ones it should. That is deliberate, and the
 * reason is not "menu gating is cosmetic" — it is that the `dms.role` cookie is
 * SELF-SERVICE. The viewer holds the role picker and can change role with a
 * click, so filtering would spend a permanent cost on every page load to hide
 * entries from someone who can reveal them at will. That is theatre: it
 * protects nothing and charges continuously.
 *
 * WHEN THAT STOPS BEING TRUE — when DMS roles become real Auth roles rather
 * than a cookie the viewer sets — the menu SHOULD gate, and filtering becomes
 * correct rather than theatre.
 *
 * The data for it already exists and is type-checked: `dmsRoles` below is
 * typed against the same `DmsRole` union the guard uses. Turning gating on is
 * adding a filter, not adding data. Note the cost that will still apply:
 * reading the role during render has no `document` on the server, so a filter
 * needs a mounted gate and the entries will appear after hydration.
 */

import type { DmsRole } from './types';

/**
 * The heading Amir asked for (msg 204), under which the nine entries below are
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
 *   C:/KSS/AI/Agent/Caroline/docs/2026-09-08-amir-msg204-menu-title-raw.txt
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
   * Which DMS roles the entry is FOR. Empty means everyone.
   *
   * NOT currently applied as a runtime filter — see config/menu.config.tsx for
   * why the estate's `filterMenuByRole` cannot carry these. Declared anyway,
   * because the day a DMS-aware filter exists this is the data it needs, and
   * because it documents the mapping against §1 in typed form.
   */
  dmsRoles: readonly DmsRole[];
}

/** FRD §1 role → screen mapping. */
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
    // FRD «شیفت» — the shift reference table, unnumbered under ۲-۶. He
    // populates it; «مثال: روز، شب» marks the seeded rows as examples.
    path: '/dms/admin/shifts',
    title: 'Shifts',
    titleKey: 'menuShifts',
    dmsRoles: ['ProjectControl'],
  },
  {
    // FRD «نقش‌های پروژه (جدول یا لیست مرجع)» — READ-ONLY. The seven roles are
    // model, not store: DmsPersonnelAssignment.roleId is typed against them.
    path: '/dms/admin/project-roles',
    title: 'Project Roles',
    titleKey: 'menuProjectRoles',
    dmsRoles: ['ProjectControl'],
  },
  {
    // ۲-۵ مشخصات پرسنل — the master table the ۲-۶ assignments reference.
    path: '/dms/admin/personnel',
    title: 'Personnel',
    titleKey: 'menuPersonnel',
    dmsRoles: ['ProjectControl'],
  },
  {
    // ۲-۶ تخصیص پرسنل به پروژه‌ها. Prefixed like the rest — see the note on
    // `path` above; a bare '/admin/personnel-assignments' here would take
    // ZoneLink's cross-app branch and 404, exactly as all nine did.
    path: '/dms/admin/personnel-assignments',
    title: 'Personnel Assignment',
    titleKey: 'menuPersonnelAssignment',
    dmsRoles: ['ProjectControl'],
  },
] as const;
