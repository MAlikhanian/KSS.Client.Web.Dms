'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Container } from '@/components/common/container';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Where middleware.ts rewrites a request whose role is not permitted on the
 * route. A rewrite rather than a redirect, so the URL the person asked for
 * stays in the address bar and they can see what was refused.
 */
export default function DmsForbiddenPage() {
  const { t } = useTranslation('dms');
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const role = searchParams.get('role');

  return (
    <Fragment>
      <Container>
        <div className="space-y-5 lg:space-y-7.5">
          {/* Red border: the same signal person/edit uses for no-access. */}
          <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
            <Card>
              <CardContent className="py-8 space-y-4">
                <h1 className="text-lg font-semibold">
                  {t('forbiddenTitle', {
                    defaultValue: 'This page is not available in your role',
                  })}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t('forbiddenBody', {
                    defaultValue:
                      'Each DMS role sees a different part of the system. Switch role to continue.',
                  })}
                </p>
                {(from || role) && (
                  <p className="text-sm text-muted-foreground">
                    {from
                      ? t('forbiddenRequested', {
                          defaultValue: 'Requested page',
                        }) + `: ${from}`
                      : ''}
                    {from && role ? ' — ' : ''}
                    {role
                      ? t('forbiddenRole', { defaultValue: 'Current role' }) +
                        `: ${role}`
                      : ''}
                  </p>
                )}
                <Button asChild variant="outline">
                  {/* No '/dms' prefix: Next adds basePath to Link itself. */}
                  <Link href="/">
                    {t('backToRolePicker', {
                      defaultValue: 'Change role',
                    })}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </Fragment>
  );
}
