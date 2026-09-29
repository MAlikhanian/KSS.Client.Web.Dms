'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';
import { isDmsError } from '@/lib/dms/errors';
import { createProjectRole, updateProjectRole } from '@/lib/dms/store';
import type { DmsActor, DmsProjectRoleRow } from '@/lib/dms/types';
import { useProjectRoles } from '../../_components/project-role-select';
import { toEnglishDigits } from '../../_lib/digits';
import { useDmsActor } from '../../_lib/use-dms-actor';

/**
 * FRD «نقش‌های پروژه (جدول یا لیست مرجع)» — the roles a person can hold on a
 * project, chosen when personnel are assigned.
 *
 * AN EDITABLE TABLE. The specification hedged between "a table" and "a
 * reference list" and gave seven roles; the customer has since asked for roles
 * to be added and edited, which settles it as a table. The seven are seeded by
 * the service.
 *
 * ⚠ A ROLE'S CODE IS FIXED ONCE IT EXISTS: assignments store the code, so
 * renaming it would silently detach them. The name, order and active flag can
 * change. A role no longer used is DEACTIVATED, never deleted — it stays on the
 * assignments that hold it and is no longer offered for new ones.
 */
export function ProjectRolesContent() {
  const { t } = useTranslation('dms');
  const { actor, ready } = useDmsActor('ProjectControl');
  const rolesQuery = useProjectRoles();

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
                  'Head office defines projects, vessels and personnel. Your account does not hold this role.',
              })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rows = [...(rolesQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

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
            <p className="text-sm text-muted-foreground">
              {t('projectRolesExplain', {
                defaultValue:
                  'The roles a person can hold on a project, chosen when personnel are assigned. A role no longer used is deactivated rather than deleted: it stays on the assignments that hold it.',
              })}
            </p>

            {rolesQuery.isLoading && (
              <p className="text-sm text-muted-foreground">{t('loading', { defaultValue: 'Loading…' })}</p>
            )}
            {rolesQuery.isError && (
              <p className="text-sm text-destructive">
                {isDmsError(rolesQuery.error)
                  ? `${rolesQuery.error.message} (${rolesQuery.error.code})`
                  : t('projectRolesLoadFailed', { defaultValue: 'The roles could not be loaded.' })}
              </p>
            )}

            {rolesQuery.isSuccess && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('role', { defaultValue: 'Role' })}</TableHead>
                      <TableHead>{t('roleIdentifier', { defaultValue: 'Identifier' })}</TableHead>
                      <TableHead>{t('roleSortOrder', { defaultValue: 'Order' })}</TableHead>
                      <TableHead>{t('roleActive', { defaultValue: 'Active' })}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <RoleRow key={row.id} row={row} actor={actor} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <NewRole actor={actor} />
    </div>
  );
}

/** One role, editable in place: name, order and active. The code is shown, never edited. */
function RoleRow({ row, actor }: { row: DmsProjectRoleRow; actor: DmsActor }) {
  const { t } = useTranslation('dms');
  const queryClient = useQueryClient();
  const [name, setName] = useState(row.name);
  const [sortOrder, setSortOrder] = useState(String(row.sortOrder));
  const [isActive, setIsActive] = useState(row.isActive);

  const order = Number(toEnglishDigits(sortOrder).trim());
  const changed = name.trim() !== row.name || order !== row.sortOrder || isActive !== row.isActive;
  const valid = name.trim().length > 0 && Number.isInteger(order);

  const save = useMutation({
    mutationFn: () =>
      updateProjectRole({ id: row.id, patch: { name: name.trim(), sortOrder: order, isActive }, actor }),
    onSuccess: () => {
      toast.success(t('projectRoleSaved', { defaultValue: 'Role saved' }));
      void queryClient.invalidateQueries({ queryKey: ['dms', 'project-roles'] });
    },
    onError: (error) => {
      toast.error(
        isDmsError(error)
          ? `${error.message} (${error.code})`
          : t('projectRoleSaveFailed', { defaultValue: 'The role could not be saved.' }),
      );
    },
  });

  return (
    <TableRow>
      <TableCell>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="min-w-40" />
      </TableCell>
      <TableCell className="text-muted-foreground">{row.code}</TableCell>
      <TableCell>
        <Input
          value={sortOrder}
          inputMode="numeric"
          onChange={(e) => setSortOrder(e.target.value)}
          className="w-20"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
          {!row.isActive && (
            <Badge variant="secondary">{t('roleInactive', { defaultValue: 'Inactive' })}</Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Button
          variant="outline"
          disabled={!changed || !valid || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? t('saving', { defaultValue: 'Saving…' }) : t('save', { defaultValue: 'Save' })}
        </Button>
      </TableCell>
    </TableRow>
  );
}

/** Add a role. The code is fixed from here on, so it is asked for once, plainly. */
function NewRole({ actor }: { actor: DmsActor }) {
  const { t } = useTranslation('dms');
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const valid = /^[A-Za-z0-9_-]{1,30}$/.test(code.trim()) && name.trim().length > 0;

  const create = useMutation({
    mutationFn: () => createProjectRole({ code: code.trim(), name: name.trim(), actor }),
    onSuccess: () => {
      toast.success(t('projectRoleCreated', { defaultValue: 'Role added' }));
      setCode('');
      setName('');
      void queryClient.invalidateQueries({ queryKey: ['dms', 'project-roles'] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('newProjectRole', { defaultValue: 'New role' })}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium block" htmlFor="role-new-name">
              {t('role', { defaultValue: 'Role' })} <span className="text-destructive">*</span>
            </label>
            <Input id="role-new-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium block" htmlFor="role-new-code">
              {t('roleIdentifier', { defaultValue: 'Identifier' })} <span className="text-destructive">*</span>
            </label>
            <Input id="role-new-code" value={code} dir="ltr" onChange={(e) => setCode(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              {t('roleCodeHint', {
                defaultValue:
                  'Latin letters, digits, hyphen or underscore, up to 30. It cannot be changed after the role is added.',
              })}
            </p>
          </div>
        </div>
        {create.isError && (
          <p className="text-sm text-destructive">
            {isDmsError(create.error)
              ? `${create.error.message} (${create.error.code})`
              : t('projectRoleCreateFailed', { defaultValue: 'The role could not be added.' })}
          </p>
        )}
        <Button variant="primary" disabled={!valid || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? t('creating', { defaultValue: 'Creating…' }) : t('addProjectRole', { defaultValue: 'Add role' })}
        </Button>
      </CardContent>
    </Card>
  );
}
