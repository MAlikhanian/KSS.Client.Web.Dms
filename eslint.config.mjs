// eslint.config.mjs
import { readFileSync } from 'node:fs';

// ⛔ ONE LIST, TWO CONSUMERS — see app/(dms)/_lib/spec-forms.json. The same
// file is also read by the i18n key-check harness, so a form added to the
// computed-key exception is enrolled in the key check by construction.
// ⚠ RENAMING A FIELD HERE CAN SILENCE THAT HARNESS WITHOUT FAILING ANYTHING.
// After any change to this list, re-run it: it must still report the same
// number of pairs with its control firing. A count of 0 checked is the tell.
const SPEC_FORMS = JSON.parse(readFileSync('./app/(dms)/_lib/spec-forms.json', 'utf8'));
const SPEC_FORM_FILES = SPEC_FORMS.forms.map((f) => f.form);
import { FlatCompat } from '@eslint/eslintrc';

// Create a FlatCompat instance to support legacy "extends" syntax.
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

// ─── DMS guards ─────────────────────────────────────────────────────────────
//
// DMS is frontend and mock data only — no database, no backend service. That
// constraint lived in a comment, and a comment does not refuse. These rules do:
// `next build` fails the moment a real call is added without the proper swap,
// and deleting the guard is a visible diff.
//
// SCOPE, AND WHY IT IS NOT THE WHOLE app/ TREE. The template ships real network
// calls — services/auth-api.ts alone has ~25 fetch sites against the Auth
// service, plus lib/api-client.ts, lib/api.ts and a topbar calling
// /api/person/me. A guard covering app/** would be red from its first run, and
// a guard that is always red gets switched off — worse than no guard, because
// it also looks like coverage.
//
// So the claim enforced here is the accurate one: DMS's own DOMAIN DATA has no
// backend. The zone is not network-free; its auth chrome talks to the Auth
// service, because that is what the template is.
//
// ⚠ THE RULE FRAGMENTS BELOW ARE SHARED CONSTANTS ON PURPOSE. In flat config a
// later block does not MERGE with an earlier one for the same rule name — it
// REPLACES it. Writing the app/(dms) block's `no-restricted-imports` inline
// would therefore have silently switched off the axios/api-client restrictions
// for exactly the tree the pages live in, while every rule still appeared
// present in the file. Composing from one definition is what stops that.

const NO_BACKEND_MESSAGE =
  'DMS is frontend and mock data only, by product decision: no database, no backend service, no API calls for domain data. All data access goes through lib/dms/mock-store.ts. If this genuinely needs a backend it goes to the Tech Lead — not a workaround here.';

const NO_BACKEND_GLOBALS = [
  { name: 'fetch', message: NO_BACKEND_MESSAGE },
  { name: 'XMLHttpRequest', message: NO_BACKEND_MESSAGE },
];

const NO_BACKEND_IMPORT_PATHS = [
  { name: 'axios', message: NO_BACKEND_MESSAGE },
];

const NO_BACKEND_IMPORT_PATTERNS = [
  {
    group: ['**/api-client', '**/lib/api', '**/services/auth-api'],
    message:
      'DMS is frontend and mock data only: the template API clients are not a DMS data path. All data access goes through lib/dms/mock-store.ts.',
  },
];

// no-restricted-globals sees a bare `fetch` reference; it does not see
// `window.fetch`. This does.
const NO_MEMBER_FETCH = {
  selector: "MemberExpression[property.name='fetch']",
  message: NO_BACKEND_MESSAGE,
};

// The approved-only control is a phantom brand, and a cast defeats any brand.
//
// DESCENDANT selector, deliberately. The obvious form —
// TSAsExpression[typeAnnotation.typeName.name='...'] — matches only a bare
// `as ApprovedDailyReport` and silently misses `as ApprovedDailyReport[]`,
// which is the form the store itself uses and therefore the form anyone
// copying it would write. It also misses `as unknown as ApprovedDailyReport[]`.
// Matching the type reference anywhere inside the assertion catches all of them.
const NO_BRAND_CAST = {
  selector:
    "TSAsExpression TSTypeReference[typeName.name='ApprovedDailyReport']",
  message:
    'Only lib/dms/mock-store.ts may produce an ApprovedDailyReport, via listApprovedReports(), which applies the Approved filter itself. Casting one into existence reintroduces the CashAdvance defect: a KPI total computed over unapproved rows.',
};

// A computed i18n key is invisible to every check that looks for translated
// text, because they all match `t('literal', { defaultValue })`.
//
// ⛔ THIS IS NOT HYPOTHETICAL. 103 English field labels reached a
// customer-facing image across three edit screens — never counted, never
// reported missing, never orphaned — while the i18n harness reported
// "353 of 353". A purpose-built check missing something is worse than a general
// one missing it, because it reads as assurance.
//
// The three spec-driven forms are the ONLY permitted exception and they are
// named in app/(dms)/_lib/spec-forms.json, which the key checker reads too — so
// adding a form to the exception list also enrols it in the key check. One
// list, two consumers, no way to satisfy one and forget the other.
const NO_COMPUTED_I18N_KEY = {
  selector: "CallExpression[callee.name='t'] > TemplateLiteral",
  message:
    "A computed i18n key is invisible to every translation check: they match t('literal', { defaultValue }), so a template literal is never counted, never reported missing and never orphaned — it renders its English defaultValue to the customer with every check reporting PASS. Use literal keys. If this is a spec-driven form whose keys live in a data file, add the form AND its spec to app/(dms)/_lib/spec-forms.json, which registers it with the key checker at the same time.",
};

// A page title written as an English literal lands beside the Persian product
// name in the browser tab — "Daily Report | <the Persian name>" — which is the
// first surface the customer sees, before anything else has loaded.
//
// ⚠ THE AUTHOR THIS CATCHES IS DOING SOMETHING REASONABLE. `metadata` is a
// SERVER export, so `t()` is not available; they will try it, find it does not
// work, and reach for a literal. The message therefore names the alternative
// rather than the prohibition — a ban with no route forward sends them to
// eslint-disable, which is worse than the literal because it looks deliberate.
//
// THREE FORMS, NOT ONE. `title: 'X'`, `title: { default: 'X' }` and
// `title: { template: 'X' }` are the same defect, and the last two are the
// shape our own root layout demonstrates is natural. A selector matching only
// the direct literal child would miss both of the forms most likely to be
// written — the same trap as the brand cast that missed `as X[]`.
const NO_LITERAL_PAGE_TITLE_MESSAGE =
  "A page title must come from the DMS i18n namespace, not an English literal: it appears in the browser tab beside the Persian product name. `t()` is unavailable here because `metadata` is a server export — import the JSON directly, as app/layout.tsx does: `import dmsFa from '@/i18n/dms/fa.json'`, then use `dmsFa.<key>`. Add the key to BOTH i18n/dms/fa.json and en.json.";

const NO_LITERAL_PAGE_TITLE = [
  {
    selector:
      "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name='metadata'] Property[key.name='title'] > Literal",
    message: NO_LITERAL_PAGE_TITLE_MESSAGE,
  },
  {
    selector:
      "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name='metadata'] Property[key.name='title'] > ObjectExpression > Property[key.name=/^(default|template|absolute)$/] > Literal",
    message: NO_LITERAL_PAGE_TITLE_MESSAGE,
  },
];

// §4 names five KPIs and defines none of them, so two definitions are still
// open and no figure whose definition is unsettled may travel as a fact.
//
// Per-row derived values stay importable — a single cycle's elapsed time shown
// beside the two timestamps it came from is arithmetic the viewer can check on
// the same row. AGGREGATES are the shape that gets screenshotted and quoted,
// and `computeIntermediateTotals` is the single export producing all four of
// them (T_OP, T_PD, T_UPD, T_AV); there are no exports by those four names to
// ban individually.
//
// Left as a convention this erodes in one obvious step: someone adds a column
// total to the cycles table, because a column of numbers wants a total, and an
// aggregate arrives on a screen with nobody having thought about the order.
//
// WHEN THE TWO DEFINITIONS ARE ANSWERED this is narrowed to admit the dashboard
// route — so lifting it is a visible, deliberate diff rather than an omission.
const KPI_AGGREGATE_MESSAGE =
  'KPI aggregates (T_OP, T_PD, T_UPD, T_AV) must not reach a screen: §4 names five KPIs and defines none of them, so two definitions are still open. Per-row helpers — minutesBetween, stoppageHoursToMinutes — are importable. This rule gets narrowed to admit the dashboard once the definitions are settled.';

const KPI_AGGREGATE_PATHS = [
  {
    name: '@/lib/dms/kpi',
    importNames: ['computeIntermediateTotals'],
    message: KPI_AGGREGATE_MESSAGE,
  },
];

const KPI_AGGREGATE_PATTERNS = [
  {
    group: ['**/lib/dms/kpi'],
    importNames: ['computeIntermediateTotals'],
    message: KPI_AGGREGATE_MESSAGE,
  },
];

const eslintConfig = [
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript', 'prettier'],
    // Plugins in legacy format must be an array of plugin names.
    plugins: ['react-hooks'],
    rules: {
      // Disable react-in-jsx-scope (not needed in React 17+)
      'react/react-in-jsx-scope': 'off',
      'react/no-unescaped-entities': 'off',
      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@next/next/no-img-element': 'off',
    },
  }),
  {
    ignores: ['.next/**', 'node_modules/**', 'prisma/**'],
  },

  // The data layer.
  {
    files: ['lib/dms/**/*.ts', 'lib/dms/**/*.tsx'],
    rules: {
      'no-restricted-globals': ['error', ...NO_BACKEND_GLOBALS],
      'no-restricted-imports': [
        'error',
        {
          paths: NO_BACKEND_IMPORT_PATHS,
          patterns: NO_BACKEND_IMPORT_PATTERNS,
        },
      ],
      'no-restricted-syntax': ['error', NO_MEMBER_FETCH, NO_BRAND_CAST],
    },
  },

  // The single named exception: the store owns the brand, so it is the one
  // file allowed to cast into it. Note this block deliberately RESTATES
  // NO_MEMBER_FETCH — replacing rather than merging is the flat-config
  // behaviour, so dropping the fetch rule here would have unguarded it.
  {
    files: ['lib/dms/mock-store.ts'],
    rules: {
      'no-restricted-syntax': ['error', NO_MEMBER_FETCH],
    },
  },

  // The DMS route group. Same no-backend guard as the data layer, PLUS the
  // KPI-aggregate ban, composed into one rule config rather than a second
  // block that would have replaced the first.
  //
  // DMS pages go in `app/(dms)/`, so new routes land inside this guard by
  // construction — and the block after this one makes that unavoidable rather
  // than merely conventional.
  //
  // ⚠ THE DASHBOARD IS EXEMPTED FROM THE KPI-AGGREGATE BAN BELOW, DELIBERATELY
  // AND VISIBLY — 2026-09-08, by ruling. This is the
  // narrowing the rule's own message always said would happen, and it is a diff
  // rather than an omission, which was the point of writing it as a rule.
  //
  // WHAT REPLACES IT THERE IS STRONGER, NOT WEAKER. The three KPIs whose
  // definitions are still open are typed in kpi.ts as `AwaitingDefinition`
  // ALONE — a variant with no numeric field — so the dashboard cannot show a
  // number for them even if someone tries: it fails the build rather than the
  // review. The ban stopped aggregates reaching a screen; the type stops the
  // UNDEFINED ones existing at all. Every other route in the group keeps the ban.
  // NOTE the exemption is NOT an `ignores` on this block. That would have
  // dropped the no-backend globals, the api-client patterns and the brand-cast
  // rule for the dashboard too — silently unguarding the one route that touches
  // the KPI engine. The narrowing is a later block that re-states
  // `no-restricted-imports` alone, so every other rule here still applies.
  {
    files: ['app/(dms)/**/*.ts', 'app/(dms)/**/*.tsx'],
    rules: {
      'no-restricted-globals': ['error', ...NO_BACKEND_GLOBALS],
      'no-restricted-imports': [
        'error',
        {
          paths: [...NO_BACKEND_IMPORT_PATHS, ...KPI_AGGREGATE_PATHS],
          patterns: [...NO_BACKEND_IMPORT_PATTERNS, ...KPI_AGGREGATE_PATTERNS],
        },
      ],
      'no-restricted-syntax': [
        'error',
        NO_MEMBER_FETCH,
        NO_BRAND_CAST,
        ...NO_LITERAL_PAGE_TITLE,
        NO_COMPUTED_I18N_KEY,
      ],
    },
  },

  // ─── The three spec-driven forms: the computed-key ban lifted, NOTHING else
  //
  // ⛔ THIS BLOCK RE-DECLARES THE WHOLE no-restricted-syntax ARRAY, BECAUSE A
  // LATER BLOCK REPLACES AN EARLIER ONE FOR THE SAME RULE NAME. Writing only
  // the exception here would silently switch off the fetch ban, the brand-cast
  // ban and the page-title ban for these three files — the trap documented at
  // the top of this file, and the one this project has now hit twice.
  //
  // The file list is READ FROM app/(dms)/_lib/spec-forms.json rather than typed
  // here, so it cannot drift from the list the key checker uses.
  {
    files: SPEC_FORM_FILES,
    rules: {
      'no-restricted-syntax': [
        'error',
        NO_MEMBER_FETCH,
        NO_BRAND_CAST,
        ...NO_LITERAL_PAGE_TITLE,
        // NO_COMPUTED_I18N_KEY deliberately omitted — that is the whole point
        // of this block. Their keys are checked by i18n-keys.js instead.
      ],
    },
  },

  // ─── The dashboard: the KPI-aggregate ban narrowed, and nothing else ──────
  //
  // The one route allowed to import `computeIntermediateTotals`. Narrowed by
  // ruling, 2026-09-08, to allow the dashboard to be built on dev.
  //
  // ONLY `no-restricted-imports` is restated here, and it restates the FULL
  // no-backend set minus the KPI entries. A later flat-config block REPLACES an
  // earlier one for the same rule name, so anything omitted here would be
  // switched off for this route — which is why this is not an `ignores` on the
  // block above. `no-restricted-globals` and `no-restricted-syntax` are not
  // mentioned, so the fetch, XMLHttpRequest, window.fetch and brand-cast rules
  // continue to apply to the dashboard unchanged.
  //
  // The protection that replaces the ban is stronger than the ban: the three
  // KPIs whose definitions are open are typed in kpi.ts as `AwaitingDefinition`
  // alone — no numeric field — so the dashboard cannot render a number for them
  // even deliberately.
  {
    files: ['app/(dms)/dashboard/**/*.ts', 'app/(dms)/dashboard/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: NO_BACKEND_IMPORT_PATHS,
          patterns: NO_BACKEND_IMPORT_PATTERNS,
        },
      ],
    },
  },

  // The other half of the route guard.
  //
  // The block above guards `app/(dms)/**`. On its own that leaves a gap: a DMS
  // page created at `app/reports/` would sit OUTSIDE the guard, and "new routes
  // land inside it by construction" would still be a convention at exactly the
  // boundary where it matters.
  //
  // This closes it from the other side. Anything under `app/` that is NOT in
  // the DMS route group is forbidden from importing the DMS lib at all, so a
  // DMS route outside `(dms)/` cannot reach the data — it fails the build
  // rather than quietly running unguarded.
  {
    files: ['app/**/*.ts', 'app/**/*.tsx'],
    ignores: ['app/(dms)/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/lib/dms/*', '**/lib/dms/**'],
              message:
                'DMS data is reachable only from the guarded DMS route group. Move this page under app/(dms)/ — that tree is where the no-backend guard applies, and a DMS route outside it would run unguarded.',
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
