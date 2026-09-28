/**
 * The daily-report state machine, §3 گردش کار سامانه.
 *
 * Draft → Submitted (soft lock: «داده‌ها برای اپراتور قفل موقت می‌شوند»)
 *       → Approved  (permanent lock: «کل داده‌های آن روز قفل دائم شده و در
 *                     محاسبات KPI شرکت داده می‌شوند»)
 *       | Rejected  («قفل ویرایش برای اپراتور باز می‌شود و علت رد به عنوان
 *                     یادداشت ثبت می‌شود»)
 *
 * Pure: no storage, no clock of its own, no side effects. mock-store.ts calls
 * `transition` and persists what it returns; a component never reaches a
 * status write without coming through here.
 *
 * The rules live in ONE function. `canTransition` — which the UI uses to grey
 * out buttons — is implemented by attempting `transition` and catching, so the
 * enabled state and the enforced rule cannot drift apart. A separate predicate
 * re-stating the rules would be a second source of the same truth.
 */

import { conflict, forbidden, isDmsError, validation } from './errors';
import type { DmsActor, DmsDailyOperationReport } from './types';

/**
 * The machine's input alphabet.
 *
 * `Reject` carries `reason` as a REQUIRED field, so `{ type: 'Reject' }` does
 * not compile — a rejection with no reason fails `next build`, it does not
 * fail a form validator. The type cannot stop `reason: ''`, so `transition`
 * refuses an empty or whitespace-only reason at runtime as well. Both paths
 * refuse; neither is the form's job.
 *
 * WHERE THE REQUIREMENT COMES FROM: not the column. ۲-۷'s `rejection_note` is
 * plain TEXT with no NOT NULL. The obligation is in the workflow prose — §1
 * «به همراه درج علت رد» and §3 «علت رد به عنوان یادداشت ثبت می‌شود» — so it is
 * enforced here, where the workflow lives, and attributed to the prose rather
 * than to a constraint that does not exist.
 */
export type ReportAction =
  | { type: 'Submit' }
  | { type: 'Approve' }
  | { type: 'Reject'; reason: string };

/**
 * Which role may perform which action.
 *
 * CONFIRMED AT SOURCE: کنترل پروژه is NOT a reviewer. §1 scopes head office's
 * full CRUD to the definition tables — «تعریف پروژه‌ها، زیرپروژه‌ها، شناورها،
 * قراردادها، پرسنل و تخصیص عوامل» — and gives review to سرپرست شناور alone:
 * «تایید نهایی گزارش یا رد آن جهت اصلاح توسط اپراتور به همراه درج علت رد».
 * ۲-۷'s `approved_by` is «شناسه سرپرست تاییدکننده», the approving supervisor.
 */
const ACTOR_FOR_ACTION: Record<ReportAction['type'], DmsActor['role']> = {
  Submit: 'Operator',
  Approve: 'VesselSupervisor',
  Reject: 'VesselSupervisor',
};

/**
 * Statuses from which a report's own fields may still be edited. §1 gives the
 * operator «امکان ویرایش اطلاعات تا پیش از ارسال به سرپرست», and §3 reopens
 * the lock on rejection.
 */
const EDITABLE_STATUSES = ['Draft', 'Rejected'] as const;

/**
 * Apply an action. Returns a NEW report; never mutates the input.
 *
 * @param now Injected so a caller can produce deterministic timestamps.
 * @throws DmsError — Forbidden (wrong role), Conflict (wrong status),
 *         Validation (empty rejection reason).
 */
export function transition(
  report: DmsDailyOperationReport,
  action: ReportAction,
  actor: DmsActor,
  now: string = new Date().toISOString(),
): DmsDailyOperationReport {
  const requiredRole = ACTOR_FOR_ACTION[action.type];
  if (actor.role !== requiredRole) {
    throw forbidden(
      `Only ${requiredRole} may ${action.type.toLowerCase()} a daily report; actor is ${actor.role}.`,
    );
  }

  // Approved is permanent (§3, «قفل دائم»). Checked before the per-action
  // rules so every action against an approved report fails the same way,
  // including a second Approve.
  if (report.approvalStatus === 'Approved') {
    throw conflict(
      `Report '${report.id}' is approved and permanently locked; no further transition is possible.`,
    );
  }

  switch (action.type) {
    case 'Submit': {
      if (
        report.approvalStatus !== 'Draft' &&
        report.approvalStatus !== 'Rejected'
      ) {
        throw conflict(
          `A report may be submitted from Draft or Rejected only; '${report.id}' is ${report.approvalStatus}.`,
        );
      }
      return {
        ...report,
        approvalStatus: 'Submitted',
        submittedAt: now,
        submittedBy: actor.userId,
        updatedAt: now,
      };
    }

    case 'Approve': {
      if (report.approvalStatus !== 'Submitted') {
        throw conflict(
          `A report may be approved from Submitted only; '${report.id}' is ${report.approvalStatus}.`,
        );
      }
      return {
        ...report,
        approvalStatus: 'Approved',
        approvedBy: actor.userId,
        approvedAt: now,
        updatedAt: now,
      };
    }

    case 'Reject': {
      if (report.approvalStatus !== 'Submitted') {
        throw conflict(
          `A report may be rejected from Submitted only; '${report.id}' is ${report.approvalStatus}.`,
        );
      }
      const reason = action.reason.trim();
      if (reason.length === 0) {
        throw validation('A rejection reason is required.', {
          reason: 'required',
        });
      }
      return {
        ...report,
        approvalStatus: 'Rejected',
        rejectionNote: reason,
        rejectedAt: now,
        rejectedBy: actor.userId,
        updatedAt: now,
      };
    }
  }
}

/**
 * Whether `transition` would succeed. For disabling UI controls only — it is
 * never a substitute for calling `transition`, which is what actually refuses.
 *
 * Implemented by attempting the transition so the two can never disagree.
 */
export function canTransition(
  report: DmsDailyOperationReport,
  action: ReportAction,
  actor: DmsActor,
): boolean {
  try {
    transition(report, action, actor);
    return true;
  } catch (error) {
    if (isDmsError(error)) return false;
    throw error;
  }
}

/**
 * Whether the report's own fields (cycles, stoppages, notes) may still be
 * edited. Submitted is a SOFT lock: the operator can no longer change the day,
 * but the supervisor can still send it back.
 *
 * The rejection trace — `rejectionNote`, and our own `rejectedAt`/`rejectedBy`
 * — is deliberately kept when a rejected report is resubmitted and when it is
 * later approved. It is the only record of the review that happened, and with
 * no backend there is nowhere else for it to live. Note that the two
 * timestamps are ours: the FRD has no timestamp columns at all.
 */
export function canEditFields(
  report: DmsDailyOperationReport,
  actor: DmsActor,
): boolean {
  if (actor.role !== 'Operator') return false;
  return (EDITABLE_STATUSES as readonly string[]).includes(
    report.approvalStatus,
  );
}

/** Throwing form of `canEditFields`, for the store's write path. */
export function assertEditable(
  report: DmsDailyOperationReport,
  actor: DmsActor,
): void {
  if (actor.role !== 'Operator') {
    throw forbidden(
      `Only Operator may edit a daily report's fields; actor is ${actor.role}.`,
    );
  }
  if (
    !(EDITABLE_STATUSES as readonly string[]).includes(report.approvalStatus)
  ) {
    throw conflict(
      `Report '${report.id}' is ${report.approvalStatus} and its fields are locked.`,
    );
  }
}
