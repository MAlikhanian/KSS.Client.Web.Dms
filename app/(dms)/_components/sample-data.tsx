'use client';

import type { ReactNode } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * The sample-data marker.
 *
 * ⛔ ONE CRITERION, THREE TECHNIQUES. The criterion is NOT "is it visible on the
 * page" — it is:
 *
 *     If someone screenshots this artefact ON ITS OWN, is the marker in the crop?
 *
 * A sibling `<div>` under a chart passes every check we own — tsc, eslint, a
 * bundle grep, a locale scan — and FAILS the requirement, because all of those
 * only ask whether the string is on the page. The marker must render INSIDE the
 * bounded element the crop would capture.
 *
 * ⚠ AND A TABLE IS SUCH AN ARTEFACT. Mapping the criterion by the noun
 * "figure" — chart yes, table no — leaves a cropped table carrying no marker
 * while the page line sits above the crop. A table of downtime, screenshotted
 * and forwarded, reads as a RECORD; if anything it is likelier than a bar chart
 * to be taken as operational fact.
 *
 * ⛔ PARTIAL MARKING IS WORSE THAN NONE. A user who sees the marker on the
 * dashboard and nothing on the stoppage table has been actively TOLD the table
 * is real — a passive omission converted into an affirmative false signal. All
 * screens ship together or none does.
 *
 * ⛔ THE WORDING IS NOT OURS TO SHORTEN OR COIN. The Persian is settled by the
 * wording owner. ⚠ Note it is NOT the form sent to the customer — that was a
 * third variant with a different subject — so do not "correct" either string
 * against a quoted message. If a layout cannot fit it, that is a request back
 * through the lead, never a shortening at the call site.
 */

/**
 * ⛔ THESE TWO STRINGS DELIBERATELY DIFFER. DO NOT UNIFY THEM, AND DO NOT
 * COMPOSE THEM FROM A SHARED FRAGMENT.
 *
 * Same claim, same vocabulary — the SUBJECT is sized to its container:
 * «داده» inside a figure, «اعداد این صفحه» at page level. A third form with
 * subject «اعداد داشبورد» was sent to the customer and is not in this codebase.
 *
 * ⚠ «نمایشی است و واقعی نیست» is the shared PREDICATE and is not a string any
 * instance uses alone. **Strip the subject and a watermark becomes a predicate
 * floating over a chart with nothing to attach it to** — which is precisely the
 * error that nearly shipped, because the fragment reads correctly, is
 * grammatical, and says a true thing.
 *
 * Near-identical Persian looks like duplication, so the obvious improvement is
 * to merge them. That breaks both at once, reads as a cleanup, and passes every
 * check we own.
 */
function useMarkerText(): string {
  const { t } = useTranslation('dms');
  return t('sampleDataMarker', {
    defaultValue: 'Illustrative data — not real.',
  });
}

/**
 * The page line's own string.
 *
 * ⛔ SEE THE NOTE ON useMarkerText: this and the watermark are the SAME CLAIM
 * with the subject sized to its container. They are not duplication and must
 * not be merged or built from a shared fragment.
 */
function usePageLineText(): string {
  const { t } = useTranslation('dms');
  return t('sampleDataPageLine', {
    defaultValue:
      'The figures on this page are illustrative and not real. Financial progress is computed from an assumed unit rate.',
  });
}

/**
 * Watermark for a bounded FIGURE — a chart or a KPI tile.
 *
 * Renders inside the artefact's own box, so a crop of the artefact contains it.
 * `pointer-events-none` so it never intercepts a tooltip or a click, and it is
 * deliberately low-contrast: it must be legible in a screenshot without
 * competing with the figure it marks.
 *
 * ⛔ The PARENT must be positioned. Every call site wraps in `relative`.
 */
export function SampleDataWatermark() {
  // Hook at the TOP, never inside the returned JSX. Calling it there works
  // today and breaks the moment someone wraps the return in a condition.
  const text = useMarkerText();
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center select-none"
    >
      <span className="rotate-[-18deg] text-[11px] sm:text-xs font-medium tracking-wide text-muted-foreground/45">
        {text}
      </span>
    </div>
  );
}

/**
 * Watermark for a TABLE.
 *
 * ⛔ A BACKGROUND LAYER BEHIND THE ROWS, NOT A CELL. A cell-level marker is
 * nonsense — it would repeat per row and sit inside the data — and skipping
 * tables entirely is the failure this component exists to prevent. Behind the
 * body is neither: same criterion, different technique for a different artefact.
 *
 * Wrap the table element itself, so a crop of the table includes the layer.
 */
export function SampleDataTable({ children }: { children: ReactNode }) {
  const text = useMarkerText();
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center select-none"
      >
        <span className="rotate-[-18deg] text-xs sm:text-sm font-medium tracking-wide text-muted-foreground/35">
          {text}
        </span>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/**
 * The page line — once per screen, wherever figures appear.
 *
 * The FLOOR, not the ceiling: it states the page's data is illustrative for a
 * reader looking at the whole screen. It does not travel with a cropped
 * artefact, which is what the watermarks are for.
 */
export function SampleDataPageLine() {
  const text = usePageLineText();
  return (
    <p className="text-xs text-muted-foreground" data-sample-data-line>
      {text}
    </p>
  );
}
