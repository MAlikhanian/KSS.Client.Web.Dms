'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading, ToolbarTitle } from '@/components/common/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { canActAs, resolveDmsAccess } from '@/lib/dms/access';
import { ALL_DMS_ROLES } from '@/lib/dms/types';
import type { DmsRole } from '@/lib/dms/types';

/**
 * DMS home: the screens the signed-in person's roles open.
 *
 * Roles come from the Auth session — the same claims the route guard and the
 * service check. Nothing here chooses or switches a role: a person acts in the
 * roles Auth gives them, and on each screen in that screen's role. The route
 * guard admits only people with DMS access, so everyone who reaches this page
 * holds at least one role (or full access, which opens all three).
 */

const ROLE_LABEL: Record<DmsRole, { key: string; fallback: string; blurb: string }> = {
  ProjectControl: {
    key: 'roleProjectControl',
    fallback: 'Project Control',
    blurb: 'دفتر مرکزی؛ پروژه‌ها، شناورها و پرسنل را تعریف می‌کند و داشبورد را می‌بیند.',
  },
  Operator: {
    key: 'roleOperator',
    fallback: 'Operator',
    blurb: 'روی شناور؛ گزارش روزانه را ثبت می‌کند و تا زمان ارسال می‌تواند آن را ویرایش کند.',
  },
  VesselSupervisor: {
    key: 'roleVesselSupervisor',
    fallback: 'Vessel Supervisor',
    blurb: 'گزارش ارسال‌شده را بررسی می‌کند: آن را تأیید یا با ذکر دلیل رد می‌کند.',
  },
};

// Zone paths never carry their own slug: Next adds basePath to Link.
const LANDING_FOR_ROLE: Record<DmsRole, string> = {
  ProjectControl: '/dashboard',
  Operator: '/daily-report',
  VesselSupervisor: '/approvals',
};

export default function DmsHomePage() {
  const { t } = useTranslation('dms');
  const { data: session, status } = useSession();
  const access = resolveDmsAccess({ roles: session?.user?.roles, permissions: session?.user?.permissions });
  const roles = ALL_DMS_ROLES.filter((role) => canActAs(access, role));

  return (
    <Fragment>
      <Container>
        <div className="space-y-5 lg:space-y-7.5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarTitle>
                {t('systemName', { defaultValue: 'Dredging Management System' })}
              </ToolbarTitle>
            </ToolbarHeading>
          </Toolbar>

          <div className="[&_div.rounded-xl.bg-card]:bg-blue-50! [&_div.rounded-xl.bg-card]:border-blue-100! dark:[&_div.rounded-xl.bg-card]:bg-blue-950/25! dark:[&_div.rounded-xl.bg-card]:border-blue-900! [&_div.rounded-xl.bg-card]:shadow-lg [&_div.rounded-xl.bg-card]:shadow-black/5">
            <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
              <Card>
                <CardHeader>
                  <CardTitle>{t('homeYourScreens', { defaultValue: 'Your screens' })}</CardTitle>
                </CardHeader>
                <CardContent>
                  {status === 'loading' ? (
                    <p className="text-sm text-muted-foreground">
                      {t('loading', { defaultValue: 'Loading…' })}
                    </p>
                  ) : roles.length === 0 ? (
                    // Unreachable through the route guard; stated rather than blank if it ever is.
                    <p className="text-sm text-muted-foreground">
                      {t('homeNoDmsRole', {
                        defaultValue: 'Your account has no DMS role. Ask your administrator for access.',
                      })}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {roles.map((role) => {
                        const label = ROLE_LABEL[role];
                        return (
                          <div
                            key={role}
                            className="flex items-center justify-between gap-4 border-b border-border pb-4 last:border-b-0 last:pb-0"
                          >
                            <div>
                              <div className="font-medium">
                                {t(label.key, { defaultValue: label.fallback })}
                              </div>
                              <div className="text-sm text-muted-foreground">{label.blurb}</div>
                            </div>
                            <Button asChild variant="outline">
                              <Link href={LANDING_FOR_ROLE[role]}>
                                {t('homeOpen', { defaultValue: 'Open' })}
                              </Link>
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Container>
    </Fragment>
  );
}
