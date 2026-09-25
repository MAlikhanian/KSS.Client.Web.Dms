'use client';

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { SampleDataWatermark } from '../../_components/sample-data';
import type { PartyBar, TimeShareSlice } from '../chart-data';

/**
 * §5's visualisations.
 *
 * ⛔ `recharts`, imported DIRECTLY, as `Spm/app/portal/components/widgets.tsx`
 * does. `components/ui/chart.tsx` is a kit wrapper that is byte-identical
 * across Dms, Spm, Members and Template — it is in the kit sync set, so an edit
 * to it is REVERTED by mechanism on the next sync, silently and with no
 * conflict. Consume it or bypass it; never modify it.
 */

/** The palette is positional and stable, so a slice keeps its colour. */
const PHASE_FILL: Record<string, string> = {
  Dredging: '#2563eb',
  Transport: '#0891b2',
  Discharge: '#16a34a',
  Return: '#ca8a04',
  Stoppage: '#dc2626',
};

const PARTY_FILL = '#2563eb';

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{text}</p>;
}

/**
 * «نمودار سهم زمانی» — the four cycle phases plus stoppages.
 *
 * ✅ A PIE IS CORRECT HERE and only here: these parts are the components of the
 * customer's own downtime denominator, so they genuinely sum to one whole.
 *
 * ⛔ NEVER DRAW AVAILABILITY AND DOWNTIME THIS WAY. They use different
 * denominators — 1440 against the logged sum — so they do not complement to
 * 100, and a pie, stacked bar or 100% axis containing both would assert a
 * relationship the customer has never stated.
 */
export function TimeShareChart({
  title,
  slices,
  emptyText,
  labelFor,
}: {
  title: string;
  slices: TimeShareSlice[];
  emptyText: string;
  labelFor: (key: string) => string;
}) {
  const total = slices.reduce((sum, s) => sum + s.minutes, 0);
  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {total <= 0 ? (
          <Empty text={emptyText} />
        ) : (
          <div className="relative h-64">
            {/* INSIDE the figure's box — a crop of the chart contains it. */}
            <SampleDataWatermark />
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices.map((s) => ({ ...s, name: labelFor(s.key) }))}
                  dataKey="minutes"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                >
                  {slices.map((s) => (
                    <Cell key={s.key} fill={PHASE_FILL[s.key] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) =>
                    [`${Math.round(value)} (${((value / total) * 100).toFixed(1)}%)`, name]
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * «نمودار ستونی تحلیل توقفات» — stoppage minutes by responsible party.
 *
 * ⚠ ALL FIVE CATEGORIES ARE DRAWN, INCLUDING ZEROS. A chart built only from
 * parties present in the data changes its own axis between renders — five bars
 * one day, two the next — and nothing distinguishes "no stoppages attributed to
 * this party" from "this party is not a category". The zero is the information.
 */
export function StoppageByPartyChart({
  title,
  bars,
  emptyText,
  unattributedNote,
  labelFor,
}: {
  title: string;
  bars: PartyBar[];
  emptyText: string;
  unattributedNote: string | null;
  labelFor: (party: string) => string;
}) {
  const total = bars.reduce((sum, b) => sum + b.minutes, 0);
  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {total <= 0 ? (
          <Empty text={emptyText} />
        ) : (
          <div className="relative h-64">
            <SampleDataWatermark />
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars.map((b) => ({ ...b, name: labelFor(b.party) }))}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => Math.round(value)} />
                <Bar dataKey="minutes" fill={PARTY_FILL} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {unattributedNote && (
          <p className="text-xs text-amber-600 dark:text-amber-500">{unattributedNote}</p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * «میزان پیشرفت فیزیکی» — dredged volume against the contracted volume.
 *
 * A bar rather than a chart: one number against one target reads better as a
 * filled track, and a single-bar chart is a chart's worth of machinery for it.
 */
export function PhysicalProgressPanel({
  title,
  percent,
  caption,
  noDenominatorText,
}: {
  title: string;
  percent: number | null;
  caption: string;
  noDenominatorText: string;
}) {
  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {percent === null ? (
          <Empty text={noDenominatorText} />
        ) : (
          <div className="relative space-y-2">
            <SampleDataWatermark />
            <div className="text-2xl font-semibold">{percent.toFixed(1)}%</div>
            <div className="h-3 w-full rounded-full bg-muted">
              <div
                className="h-3 rounded-full bg-blue-600"
                style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{caption}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * «میزان پیشرفت مالی» — a NAMED GAP, not a chart.
 *
 * ⛔ THIS IS NOT AN ERROR STATE AND MUST NOT BE STYLED AS ONE. §5 lists
 * financial progress beside physical progress because they tell different
 * stories. With the fields the specification defines they are ONE number:
 * `computeEarnedValue` derives the unit rate as contract ÷ initial volume, so
 *
 *     financial% = (rate × dredged) / contract = dredged / initialVolume = physical%
 *
 * The contract CANCELS. No seeded or real contract value can separate them —
 * this is a gap in the specification, not in the data or the implementation.
 *
 * ⚠ The earned-value TILE is still shown elsewhere on this screen, computed
 * from the same two fields, and that is not a contradiction: an earned-value
 * AMOUNT is derivable. Financial PROGRESS as a story distinct from physical
 * progress needs an independently recorded work-done figure, which the
 * specification does not define.
 */
export function FinancialProgressGap({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardContent className="py-4 space-y-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
