'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import type { AwaitingDefinition } from '@/lib/dms/kpi';

/**
 * A KPI §4 names and does not define.
 *
 * ⚠ THIS COMPONENT TAKES NO NUMERIC PROP, AND THAT IS THE POINT. Its only data
 * prop is `AwaitingDefinition`, a variant with no numeric field — so there is
 * nothing to render as a figure, nothing to default to zero, and nothing for a
 * later edit to "fill in". A component that tried would fail the build rather
 * than the review.
 *
 * It is deliberately NOT a zero, NOT a placeholder dash and NOT omitted:
 *   - a zero is a number, and would be read as a measurement;
 *   - a dash says "no data", which is false — the data is there, the DEFINITION
 *     is missing;
 *   - omitting it hides that the KPI was ever asked for.
 *
 * A visible gap is the honest rendering and it is also the strongest way to
 * ask: the reader sees precisely which holes exist and what is owed to close
 * them.
 */
export function KpiGapTile({
  label,
  gap,
}: {
  label: string;
  gap: AwaitingDefinition;
}) {
  const { t } = useTranslation('dms');

  return (
    <Card>
      <CardContent className="py-5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{label}</span>
          <Badge variant="warning">
            {t('awaitingDefinition', { defaultValue: 'Awaiting definition' })}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{gap.question}</p>
      </CardContent>
    </Card>
  );
}

/**
 * A KPI that is defined, but whose input this project does not have.
 *
 * Distinct from `KpiGapTile` on purpose: "we do not know how to compute this"
 * and "this project lacks the input" are different facts, and a reader who
 * cannot tell them apart will chase the wrong thing. Like the gap tile, it
 * takes NO numeric prop.
 */
export function KpiUnavailableTile({
  label,
  reason,
}: {
  label: string;
  reason: string;
}) {
  const { t } = useTranslation('dms');

  return (
    <Card>
      <CardContent className="py-5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{label}</span>
          <Badge variant="secondary">
            {t('notAvailable', { defaultValue: 'Not available' })}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{reason}</p>
      </CardContent>
    </Card>
  );
}
