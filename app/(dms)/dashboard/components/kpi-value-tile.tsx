'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { KpiResult } from '@/lib/dms/kpi';
import { KpiGapTile, KpiUnavailableTile } from './kpi-gap-tile';

/**
 * A FIGURE — a number WE derived, not one the customer defined.
 *
 * WARNING: IT CANNOT RENDER WITHOUT A STATED BASIS, AND THAT IS A TYPE,
 * NOT A HABIT. Its only data prop is `KpiResult`, whose value variant
 * declares `basis: string` as REQUIRED — so a figure with no basis does not
 * compile.
 *
 * Why that matters beyond tidiness: the availability question was ranked
 * above the other two BECAUSE the other two would be visible if wrong. That
 * visibility is not a property of those questions — it is a property of the
 * tile stating its basis. A later figure shipped without one would silently
 * become the invisible kind, and the risk ranking would be wrong with
 * nothing announcing it. Three figures carry a basis today because three
 * people remembered; this is the shape that survives until the fourth.
 *
 * MEMBERSHIP: availability %, technical and operational downtime %, mean
 * cycle time, mean daily volume, earned value, and the unaccounted residual
 * — anything where we chose the numerator, the divisor, or the split.
 *
 * ⚠ `basis` IS RENDERED, NOT A FOOTNOTE. Both computable KPIs rest on a choice
 * the FRD does not make — what counts as a cycle's time, and what "per day"
 * divides by — and **a number built on an unstated assumption is worse than a
 * gap, because it looks settled.** Printing the reading on the tile turns a
 * hidden assumption into one the customer can correct on sight.
 *
 * It also stops the number being quietly "fixed" later: someone changing the
 * divisor to calendar days has to change the sentence next to it, which is a
 * visible edit rather than an invisible one.
 *
 * Takes the whole `KpiResult` union and delegates the gap case to KpiGapTile,
 * so a caller cannot accidentally render a gap as a value — the narrowing
 * happens in one place.
 */
export function KpiFigureTile({
  label,
  result,
  format,
}: {
  label: string;
  result: KpiResult;
  /** How to display the figure. Defaults to one decimal place. */
  format?: (value: number) => string;
}) {
  if (result.kind === 'awaiting-definition') {
    return <KpiGapTile label={label} gap={result} />;
  }

  // A missing input is not a missing definition and is not a zero — see
  // KpiNotApplicable in kpi.ts. Narrowing all three cases here means a caller
  // cannot render one as another.
  if (result.kind === 'not-applicable') {
    return <KpiUnavailableTile label={label} reason={result.reason} />;
  }

  const shown = format ? format(result.value) : result.value.toFixed(1);

  return (
    <Card>
      <CardContent className="py-5 space-y-2">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-2xl font-semibold">
          {shown}{' '}
          <span className="text-sm font-normal text-muted-foreground">
            {result.unit}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{result.basis}</p>
      </CardContent>
    </Card>
  );
}

/**
 * A QUANTITY — defined by the customer own document, so there is no reading
 * of ours to state and nothing true to put in a basis.
 *
 * WARNING: DELIBERATELY A SEPARATE COMPONENT RATHER THAN A REQUIRED PROP ON
 * THE FIGURE TILE. A required `basis` on one shared tile would force T_OP,
 * T_PD, T_UPD and T_AV to supply one, and they have nothing true to say — so
 * somebody writes "defined in §4", which is filler. A required field that
 * some callers fill with noise stops distinguishing anything: the field
 * survives and the guarantee does not.
 *
 * WHAT THE TYPE ENFORCES: `value` is a pre-formatted `string`, so a
 * `KpiResult` cannot be passed here — rerouting a figure through the
 * quantity tile to dodge the basis requirement is a compile error.
 * WHAT IT DOES NOT: someone could compute a fresh number, format it
 * themselves and pass the string. That is writing a new figure in the wrong
 * place rather than rerouting an existing one, and no prop shape stops it.
 *
 * MEMBERSHIP: T_OP, T_PD, T_UPD, T_AV, and the approved-day and cycle counts.
 */
export function KpiQuantityTile({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
}) {
  return (
    <Card>
      <CardContent className="py-5 space-y-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-2xl font-semibold">
          {value}
          {unit ? (
            <span className="text-sm font-normal text-muted-foreground"> {unit}</span>
          ) : null}
        </div>
        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </CardContent>
    </Card>
  );
}
