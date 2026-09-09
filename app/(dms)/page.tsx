'use client';

import { Fragment, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import {
  clearCurrentRole,
  getCurrentRole,
  setCurrentRole,
} from '@/lib/dms/session';
import { ALL_DMS_ROLES } from '@/lib/dms/types';
import type { DmsRole } from '@/lib/dms/types';

/**
 * The role picker — where middleware.ts sends anyone reaching a guarded route
 * with no role set.
 *
 * THIS IS A DEVELOPMENT AFFORDANCE, NOT A SIGN-IN. DMS's three roles do not
 * exist in the Auth service, and with no backend nothing here can be more than
 * a cookie the browser owns. The page says so on its face rather than in a
 * comment, so nobody demonstrating this mistakes it for access control.
 */

const ROLE_LABEL: Record<DmsRole, { key: string; fallback: string; blurb: string }> = {
  ProjectControl: {
    key: 'roleProjectControl',
    fallback: 'Project Control',
    blurb: 'Head office. Defines projects, vessels and personnel; sees the dashboard.',
  },
  Operator: {
    key: 'roleOperator',
    fallback: 'Operator',
    blurb: 'On the vessel. Enters the daily report, and may edit it until submission.',
  },
  VesselSupervisor: {
    key: 'roleVesselSupervisor',
    fallback: 'Vessel Supervisor',
    blurb: 'Reviews a submitted day: approves it, or rejects it with a reason.',
  },
};

const LANDING_FOR_ROLE: Record<DmsRole, string> = {
  ProjectControl: '/dashboard',
  Operator: '/daily-report',
  VesselSupervisor: '/approvals',
};

export default function DmsHomePage() {
  const { t } = useTranslation('dms');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [current, setCurrent] = useState<DmsRole | null>(null);

  // Cookie read must happen after mount — see useDmsActor for why.
  useEffect(() => {
    setCurrent(getCurrentRole());
  }, []);

  const blockedFrom = searchParams.get('from');

  function choose(role: DmsRole) {
    setCurrentRole(role);
    setCurrent(role);
    // Zone paths never carry their own slug: Next adds basePath to push(), so
    // '/dms/...' here would resolve to '/dms/dms/...'.
    router.push(blockedFrom ?? LANDING_FOR_ROLE[role]);
  }

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
            <ToolbarActions>
              {current && (
                <Button
                  variant="outline"
                  onClick={() => {
                    clearCurrentRole();
                    setCurrent(null);
                  }}
                >
                  {t('clearRole', { defaultValue: 'Clear role' })}
                </Button>
              )}
            </ToolbarActions>
          </Toolbar>

          {/* Title card sits outside any tint wrapper, per the edit-page
              conventions. Black/white border. */}
          <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
            <Card>
              <CardContent className="py-4 text-sm text-muted-foreground">
                {t('rolePickerNotice', {
                  defaultValue:
                    'Development role switcher. DMS roles are not part of the Auth service and this selection is stored in a browser cookie — it decides which screens are shown, and it is not authentication.',
                })}
                {blockedFrom
                  ? ' ' +
                    t('rolePickerBlocked', {
                      defaultValue:
                        'The page you asked for needs a role to be chosen first.',
                    })
                  : ''}
              </CardContent>
            </Card>
          </div>

          <div className="[&_div.rounded-xl.bg-card]:bg-blue-50! [&_div.rounded-xl.bg-card]:border-blue-100! dark:[&_div.rounded-xl.bg-card]:bg-blue-950/25! dark:[&_div.rounded-xl.bg-card]:border-blue-900! [&_div.rounded-xl.bg-card]:shadow-lg [&_div.rounded-xl.bg-card]:shadow-black/5">
            <div className="space-y-6">
              <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                        1
                      </span>
                      {t('chooseRole', { defaultValue: 'Choose a role' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {ALL_DMS_ROLES.map((role) => {
                        const label = ROLE_LABEL[role];
                        const isCurrent = current === role;
                        return (
                          <div
                            key={role}
                            className="flex items-center justify-between gap-4 border-b border-border pb-4 last:border-b-0 last:pb-0"
                          >
                            <div>
                              <div className="font-medium">
                                {t(label.key, { defaultValue: label.fallback })}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {label.blurb}
                              </div>
                            </div>
                            <Button
                              variant={isCurrent ? 'primary' : 'outline'}
                              onClick={() => choose(role)}
                            >
                              {isCurrent
                                ? t('continueAs', { defaultValue: 'Continue' })
                                : t('actAs', { defaultValue: 'Act as' })}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Fragment>
  );
}
