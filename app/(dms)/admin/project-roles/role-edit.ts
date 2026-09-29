import type { DmsProjectRoleRow, ProjectRolePatch } from '@/lib/dms/types';
import { toEnglishDigits } from '../../_lib/digits';

/**
 * The project-roles table's edit rules, kept free of React so they run in a
 * plain test. Rows are read-only until «ویرایش» is pressed on ONE of them.
 */

/** What an edit may change. The code is fixed once the role exists. */
export interface RoleDraft {
  name: string;
  sortOrder: string;
  isActive: boolean;
}

export function draftFrom(row: DmsProjectRoleRow): RoleDraft {
  return { name: row.name, sortOrder: String(row.sortOrder), isActive: row.isActive };
}

export interface DraftCheck {
  valid: boolean;
  /** True only when a saved value would actually differ. Whitespace around the name is not a change. */
  changed: boolean;
  patch: ProjectRolePatch;
}

export function checkDraft(row: DmsProjectRoleRow, draft: RoleDraft): DraftCheck {
  const name = draft.name.trim();
  const orderText = toEnglishDigits(draft.sortOrder).trim();
  const order = orderText === '' ? NaN : Number(orderText);
  const valid = name.length > 0 && Number.isInteger(order);
  const changed = valid && (name !== row.name || order !== row.sortOrder || draft.isActive !== row.isActive);
  return { valid, changed, patch: { name, sortOrder: order, isActive: draft.isActive } };
}

/** Which row is being edited. At most one: «ویرایش» on another row is refused while one is open. */
export type EditingState = string | null;

export type EditAction = { type: 'edit'; id: string } | { type: 'done' };

export function nextEditing(current: EditingState, action: EditAction): EditingState {
  if (action.type === 'done') return null;
  return current === null ? action.id : current;
}
