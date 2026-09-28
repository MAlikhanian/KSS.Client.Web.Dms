'use client';

import {
  Toolbar,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';
import { DMS_PROJECT_ROLES } from '@/lib/dms/types';
import { useDmsActor } from '../../_lib/use-dms-actor';

/**
 * FRD «نقش‌های پروژه (جدول یا لیست مرجع)» — the seven project roles.
 *
 * ⛔ READ-ONLY, AND DELIBERATELY SO. `DMS_PROJECT_ROLES` is a const array with
 * the type derived from it, not a store collection — so a role is part of the
 * MODEL, and `DmsPersonnelAssignment.roleId` is typed against it. Making this
 * screen editable would mean moving roles into the store, which is model work
 * and was explicitly out of scope for this task.
 *
 * ⚠ THAT IS A REAL DIFFERENCE FROM THE SHIFT LOOKUP BESIDE IT, and it comes
 * from his own hedge. «شیفت» is a plain reference table he populates; roles he
 * describes as «جدول یا لیست مرجع» — "a table OR a reference list" — and gives
 * all seven, exhaustively, with no «مثال» or «و غیره». So the shifts screen
 * offers Add and this one does not, and the difference is his framing rather
 * than ours.
 *
 * ⚠ IF THAT HEDGE IS EVER RESOLVED TOWARDS "table", this screen becomes a CRUD
 * screen and the roles move to the store. That is a model change and goes to
 * the Tech Lead, not a button added here.
 *
 * The English identifiers are ours; the Persian beside each is HIS, recorded at
 * the constant with its ۲-۶ marker. This screen renders the Persian, because
 * that is the customer-facing half.
 */
export function ProjectRolesContent() {
  const { t } = useTranslation('dms');
  const { actor, ready } = useDmsActor();

  /*
   * ⛔ SEVEN LITERAL KEYS, NOT `t(`projectRole_${r}`)`. The computed form is
   * shorter and would have been invisible to every check we have: the i18n
   * harness extracts `t('literal', { defaultValue })`, so a template literal
   * matches nothing — the keys would be absent from both locale files, absent
   * from the orphan check, and would render their raw key names to the
   * customer with every check still reporting PASS.
   *
   * That is the "control that looks present and matches nothing" shape, and
   * writing it out is the cost of the checks being able to see it.
   *
   * The exhaustive switch also means adding a role to DMS_PROJECT_ROLES fails
   * the build here rather than silently falling through to the identifier.
   */
  const roleLabel = (r: (typeof DMS_PROJECT_ROLES)[number]): string => {
    switch (r) {
      case 'SiteSupervisor':
        return t('projectRoleSiteSupervisor', { defaultValue: 'Site supervisor' });
      case 'ExecutionOfficer':
        return t('projectRoleExecutionOfficer', { defaultValue: 'Execution officer' });
      case 'MachineManager':
        return t('projectRoleMachineManager', { defaultValue: 'Machine manager' });
      case 'DredgeOperator':
        return t('projectRoleDredgeOperator', { defaultValue: 'Dredge operator' });
      case 'Motorman':
        return t('projectRoleMotorman', { defaultValue: 'Motorman' });
      case 'Sailor':
        return t('projectRoleSailor', { defaultValue: 'Sailor' });
      case 'Welder':
        return t('projectRoleWelder', { defaultValue: 'Welder' });
    }
  };

  if (!ready) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          {t('loading', { defaultValue: 'Loading…' })}
        </CardContent>
      </Card>
    );
  }

  if (!actor || actor.role !== 'ProjectControl') {
    return (
      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!">
        <Card>
          <CardContent className="py-8 space-y-2">
            <h2 className="font-semibold">
              {t('projectControlOnlyTitle', {
                defaultValue: 'This screen belongs to the Project Control role',
              })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('projectControlOnlyBody', {
                defaultValue:
                  'Head office defines projects, vessels and personnel. Change role to continue.',
              })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>
            {t('projectRolesTitle', { defaultValue: 'Project roles' })}
          </ToolbarTitle>
        </ToolbarHeading>
      </Toolbar>

      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
        <Card>
          <CardContent className="py-4 space-y-4">
            {/*
              The read-only-ness is EXPLAINED, not merely enforced. A reference
              list with no Add button and no reason given reads as an unfinished
              screen, and the next person adds the button.
            */}
            <p className="text-sm text-muted-foreground">
              {t('projectRolesExplain', {
                defaultValue:
                  'The roles a person can hold on a project, chosen when personnel are assigned. This is a fixed reference list from the specification and is not maintained here.',
              })}
            </p>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('role', { defaultValue: 'Role' })}</TableHead>
                    <TableHead>{t('roleIdentifier', { defaultValue: 'Identifier' })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DMS_PROJECT_ROLES.map((r) => (
                    <TableRow key={r}>
                      <TableCell>{roleLabel(r)}</TableCell>
                      <TableCell className="text-muted-foreground">{r}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
