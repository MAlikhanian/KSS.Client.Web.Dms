/**
 * The single module that owns all DMS data access. No component calls the
 * network directly, and no component constructs a domain record.
 *
 * Every exported function is ONE call through `dmsHttp` to this zone's proxy,
 * which forwards to the DMS service as the signed-in user. The function names,
 * argument objects and return shapes are the ones the screens were built
 * against, so moving off the browser-only mock changed no call site.
 *
 * `actor` arguments are accepted and NOT SENT. The service takes the actor, its
 * roles and its company from the caller's token; a body that named an actor
 * would be a claim the service must ignore. The screens still pass it because
 * their own button states use it.
 *
 * Refusals arrive as `DmsError` (see http.ts): the kind from the HTTP status,
 * the service's machine code as the message, field-level `details` on a 422.
 */

import { dmsHttp, query, seg, toPatchBody } from './http';
import type {
  ApprovedDailyReport,
  ApprovedReportQuery,
  CyclePatch,
  DmsActor,
  DmsCycle,
  DmsDailyOperationReport,
  DmsDashboard,
  DmsMe,
  DmsMonthlyVolumeCorrection,
  DmsPersonnel,
  DmsPersonnelAssignment,
  DmsProject,
  DmsProjectRoleRow,
  DmsShift,
  DmsStoppage,
  DmsStoppageType,
  DmsSubproject,
  DmsVessel,
  DmsVesselAssignment,
  DmsVesselType,
  EntityRef,
  MonthlyVolumeCorrectionPatch,
  PersonnelAssignmentPatch,
  PersonnelPatch,
  ProjectPatch,
  ProjectQuery,
  ProjectRolePatch,
  ProjectRef,
  ReportPatch,
  ReportQuery,
  ReportRef,
  ShiftPatch,
  StoppagePatch,
  StoppageTypePatch,
  StoppageTypeQuery,
  SubprojectPatch,
  SubprojectQuery,
  VesselPatch,
  VesselQuery,
} from './types';
import type { ReportAction } from './workflow';

// ─── Response normalisation ─────────────────────────────────────────────────

/**
 * The service's typed responses send `null` for an empty optional field; the
 * types here model an empty optional field as ABSENT (`field?: T`), and the
 * screens test for that (`?? ''`, `!== undefined`). One place turns the first
 * into the second, so no screen ever meets a `null` it was not written for.
 * Shallow on purpose: every entity is flat.
 */
function clean<T>(row: T): T {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    if (v !== null) out[k] = v;
  }
  return out as T;
}

function cleanAll<T>(rows: T[]): T[] {
  return rows.map(clean);
}

async function get<T>(path: string): Promise<T> {
  return clean(await dmsHttp<T>('GET', path));
}

async function list<T>(path: string): Promise<T[]> {
  return cleanAll(await dmsHttp<T[]>('GET', path));
}

async function send<T>(method: 'POST' | 'PATCH', path: string, body: object): Promise<T> {
  return clean(await dmsHttp<T>(method, path, body));
}

async function remove(path: string): Promise<void> {
  await dmsHttp<void>('DELETE', path);
}

// ─── Me ─────────────────────────────────────────────────────────────────────

/** The caller's person, verified company and DMS roles, as the service sees them. */
export async function getMe(): Promise<DmsMe> {
  return get<DmsMe>('/me');
}

// ─── Projects ───────────────────────────────────────────────────────────────

export async function listProjects(q: ProjectQuery = {}): Promise<DmsProject[]> {
  return list<DmsProject>(`/projects${query({ query: q.query?.trim() })}`);
}

export async function getProject({ id }: EntityRef): Promise<DmsProject> {
  return get<DmsProject>(`/projects/${seg(id)}`);
}

export async function createProject(args: {
  contractNumber: string;
  contractSubject: string;
  actor: DmsActor;
}): Promise<DmsProject> {
  return send<DmsProject>('POST', '/projects', {
    contractNumber: args.contractNumber,
    contractSubject: args.contractSubject,
  });
}

export async function updateProject(args: {
  id: string;
  patch: ProjectPatch;
  actor: DmsActor;
}): Promise<DmsProject> {
  return send<DmsProject>('PATCH', `/projects/${seg(args.id)}`, toPatchBody(args.patch));
}

// ─── Vessels and the project↔vessel one-to-one ──────────────────────────────

export async function listVessels(q: VesselQuery = {}): Promise<DmsVessel[]> {
  return list<DmsVessel>(`/vessels${query({ query: q.query?.trim() })}`);
}

export async function getVessel({ id }: EntityRef): Promise<DmsVessel> {
  return get<DmsVessel>(`/vessels/${seg(id)}`);
}

export async function listVesselTypes(): Promise<DmsVesselType[]> {
  return list<DmsVesselType>('/vessel-types');
}

export async function createVessel(args: {
  name: string;
  /** A vessel-type CODE from listVesselTypes, or absent. */
  vesselType?: string;
  actor: DmsActor;
}): Promise<DmsVessel> {
  return send<DmsVessel>('POST', '/vessels', {
    name: args.name,
    ...(args.vesselType ? { vesselType: args.vesselType } : {}),
  });
}

export async function updateVessel(args: {
  id: string;
  patch: VesselPatch;
  actor: DmsActor;
}): Promise<DmsVessel> {
  return send<DmsVessel>('PATCH', `/vessels/${seg(args.id)}`, toPatchBody(args.patch));
}

/** The project's one vessel. Throws NotFound when the project has none. */
export async function getProjectVessel({ projectId }: ProjectRef): Promise<DmsVessel> {
  return get<DmsVessel>(`/projects/${seg(projectId)}/vessel`);
}

export async function listVesselAssignments(): Promise<DmsVesselAssignment[]> {
  return list<DmsVesselAssignment>('/vessel-assignments');
}

export async function getVesselAssignment({ projectId }: ProjectRef): Promise<DmsVesselAssignment> {
  return get<DmsVesselAssignment>(`/projects/${seg(projectId)}/vessel-assignment`);
}

export async function assignVesselToProject(args: {
  projectId: string;
  vesselId: string;
  assignmentDate: string;
  actor: DmsActor;
}): Promise<DmsVesselAssignment> {
  return send<DmsVesselAssignment>('POST', `/projects/${seg(args.projectId)}/vessel-assignment`, {
    vesselId: args.vesselId,
    assignmentDate: args.assignmentDate,
  });
}

/**
 * Correct the single assignment row. An omitted field keeps its value; the
 * service never clears a release date once set.
 */
export async function correctVesselAssignment(args: {
  projectId: string;
  vesselId?: string;
  assignmentDate?: string;
  releaseDate?: string;
  actor: DmsActor;
}): Promise<DmsVesselAssignment> {
  return send<DmsVesselAssignment>('PATCH', `/projects/${seg(args.projectId)}/vessel-assignment`, {
    ...(args.vesselId ? { vesselId: args.vesselId } : {}),
    ...(args.assignmentDate ? { assignmentDate: args.assignmentDate } : {}),
    ...(args.releaseDate ? { releaseDate: args.releaseDate } : {}),
  });
}

// ─── Subprojects ────────────────────────────────────────────────────────────

export async function listSubprojects(q: SubprojectQuery): Promise<DmsSubproject[]> {
  return list<DmsSubproject>(`/projects/${seg(q.projectId)}/subprojects${query({ query: q.query?.trim() })}`);
}

export async function getSubproject({ id }: EntityRef): Promise<DmsSubproject> {
  return get<DmsSubproject>(`/subprojects/${seg(id)}`);
}

export async function createSubproject(args: {
  projectId: string;
  title: string;
  /** REQUIRED: one of the defined vessels. */
  vesselId: string;
  actor: DmsActor;
}): Promise<DmsSubproject> {
  return send<DmsSubproject>('POST', `/projects/${seg(args.projectId)}/subprojects`, {
    title: args.title,
    vesselId: args.vesselId,
  });
}

export async function updateSubproject(args: {
  id: string;
  patch: SubprojectPatch;
  actor: DmsActor;
}): Promise<DmsSubproject> {
  return send<DmsSubproject>('PATCH', `/subprojects/${seg(args.id)}`, toPatchBody(args.patch));
}

// ─── Shifts, project roles, personnel ───────────────────────────────────────

export async function listShifts(): Promise<DmsShift[]> {
  return list<DmsShift>('/shifts');
}

export async function getShift({ id }: EntityRef): Promise<DmsShift> {
  return get<DmsShift>(`/shifts/${seg(id)}`);
}

export async function createShift(args: {
  name: string;
  timeRangeText: string;
  actor: DmsActor;
}): Promise<DmsShift> {
  return send<DmsShift>('POST', '/shifts', { name: args.name, timeRangeText: args.timeRangeText });
}

export async function updateShift(args: {
  id: string;
  patch: ShiftPatch;
  actor: DmsActor;
}): Promise<DmsShift> {
  return send<DmsShift>('PATCH', `/shifts/${seg(args.id)}`, toPatchBody(args.patch));
}

/** The project-roles lookup — an editable table in the service, not a constant. */
export async function listProjectRoles(): Promise<DmsProjectRoleRow[]> {
  return list<DmsProjectRoleRow>('/project-roles');
}

export async function createProjectRole(args: {
  code: string;
  name: string;
  actor: DmsActor;
}): Promise<DmsProjectRoleRow> {
  return send<DmsProjectRoleRow>('POST', '/project-roles', { code: args.code, name: args.name });
}

/** The code is fixed once created; name, order and active can change. */
export async function updateProjectRole(args: {
  id: string;
  patch: ProjectRolePatch;
  actor: DmsActor;
}): Promise<DmsProjectRoleRow> {
  return send<DmsProjectRoleRow>('PATCH', `/project-roles/${seg(args.id)}`, toPatchBody(args.patch));
}

export async function listPersonnel(): Promise<DmsPersonnel[]> {
  return list<DmsPersonnel>('/personnel');
}

export async function getPersonnel({ id }: EntityRef): Promise<DmsPersonnel> {
  return get<DmsPersonnel>(`/personnel/${seg(id)}`);
}

export async function createPersonnel(args: { fullName: string; actor: DmsActor }): Promise<DmsPersonnel> {
  return send<DmsPersonnel>('POST', '/personnel', { fullName: args.fullName });
}

export async function updatePersonnel(args: {
  id: string;
  patch: PersonnelPatch;
  actor: DmsActor;
}): Promise<DmsPersonnel> {
  return send<DmsPersonnel>('PATCH', `/personnel/${seg(args.id)}`, toPatchBody(args.patch));
}

/** Refused (409) while any assignment, ended ones included, references the person. */
export async function deletePersonnel(args: { id: string; actor: DmsActor }): Promise<void> {
  return remove(`/personnel/${seg(args.id)}`);
}

/** EVERY assignment row of one project, ended ones included. */
export async function listPersonnelAssignments({ projectId }: ProjectRef): Promise<DmsPersonnelAssignment[]> {
  return list<DmsPersonnelAssignment>(`/projects/${seg(projectId)}/personnel-assignments`);
}

/** Who is on the project on `onDate`. `onDate` is REQUIRED — defaulting it would fail open. */
export async function listActivePersonnelForProject({
  projectId,
  onDate,
}: ProjectRef & { onDate: string }): Promise<DmsPersonnel[]> {
  return list<DmsPersonnel>(`/projects/${seg(projectId)}/personnel${query({ onDate })}`);
}

export async function assignPersonnelToProject(args: {
  projectId: string;
  personnelId: string;
  startDate: string;
  endDate?: string;
  shiftId?: string;
  roleId?: string;
  actor: DmsActor;
}): Promise<DmsPersonnelAssignment> {
  return send<DmsPersonnelAssignment>('POST', `/projects/${seg(args.projectId)}/personnel-assignments`, {
    personnelId: args.personnelId,
    startDate: args.startDate,
    ...(args.endDate !== undefined ? { endDate: args.endDate } : {}),
    ...(args.shiftId !== undefined ? { shiftId: args.shiftId } : {}),
    ...(args.roleId !== undefined ? { roleId: args.roleId } : {}),
  });
}

export async function updatePersonnelAssignment(args: {
  id: string;
  patch: PersonnelAssignmentPatch;
  actor: DmsActor;
}): Promise<DmsPersonnelAssignment> {
  return send<DmsPersonnelAssignment>('PATCH', `/personnel-assignments/${seg(args.id)}`, toPatchBody(args.patch));
}

/** Removes a mistaken row. Ending an assignment is setting its end date instead. */
export async function deletePersonnelAssignment(args: { id: string; actor: DmsActor }): Promise<void> {
  return remove(`/personnel-assignments/${seg(args.id)}`);
}

// ─── Daily operation reports ────────────────────────────────────────────────

export async function listReports(q: ReportQuery): Promise<DmsDailyOperationReport[]> {
  return list<DmsDailyOperationReport>(
    `/projects/${seg(q.projectId)}/reports${query({ status: q.status, from: q.from, to: q.to })}`,
  );
}

export async function getReport({ id }: EntityRef): Promise<DmsDailyOperationReport> {
  return get<DmsDailyOperationReport>(`/reports/${seg(id)}`);
}

/** Always created as Draft. The vessel is derived by the service from the project. */
export async function createReport(args: {
  projectId: string;
  reportDate: string;
  dailyNotes?: string;
  actor: DmsActor;
}): Promise<DmsDailyOperationReport> {
  return send<DmsDailyOperationReport>('POST', `/projects/${seg(args.projectId)}/reports`, {
    reportDate: args.reportDate,
    ...(args.dailyNotes !== undefined ? { dailyNotes: args.dailyNotes } : {}),
  });
}

export async function updateReport(args: {
  id: string;
  patch: ReportPatch;
  actor: DmsActor;
}): Promise<DmsDailyOperationReport> {
  return send<DmsDailyOperationReport>('PATCH', `/reports/${seg(args.id)}`, toPatchBody(args.patch));
}

/**
 * Approved reports only, from the service's DEDICATED approved-only route —
 * never `listReports` with a status, where omitting the parameter would
 * silently include every report.
 *
 * THE BRAND IS APPLIED HERE, AND ONLY HERE, and it now rests on the SERVICE'S
 * filter: the route returns nothing but approved reports. The cast is the one
 * privileged cast in DMS; the zone's eslint config bans it everywhere else.
 */
export async function listApprovedReports(q: ApprovedReportQuery): Promise<ApprovedDailyReport[]> {
  const rows = await list<DmsDailyOperationReport>(
    `/projects/${seg(q.projectId)}/reports/approved${query({ from: q.range?.from, to: q.range?.to })}`,
  );
  return rows.filter((r) => r.approvalStatus === 'Approved') as ApprovedDailyReport[];
}

/** The only path to a status change; the service applies the workflow. */
export async function transitionReport(args: {
  id: string;
  action: ReportAction;
  actor: DmsActor;
}): Promise<DmsDailyOperationReport> {
  return send<DmsDailyOperationReport>('POST', `/reports/${seg(args.id)}/transitions`, args.action);
}

// ─── Cycles and stoppages of one report ─────────────────────────────────────

export async function listCyclesForReport({ reportId }: ReportRef): Promise<DmsCycle[]> {
  return list<DmsCycle>(`/reports/${seg(reportId)}/cycles`);
}

export async function listStoppagesForReport({ reportId }: ReportRef): Promise<DmsStoppage[]> {
  return list<DmsStoppage>(`/reports/${seg(reportId)}/stoppages`);
}

export async function createCycle(args: {
  reportId: string;
  cycle: Omit<DmsCycle, 'id' | 'reportId' | 'cycleNumber'>;
  actor: DmsActor;
}): Promise<DmsCycle> {
  return send<DmsCycle>('POST', `/reports/${seg(args.reportId)}/cycles`, args.cycle);
}

export async function updateCycle(args: { id: string; patch: CyclePatch; actor: DmsActor }): Promise<DmsCycle> {
  return send<DmsCycle>('PATCH', `/cycles/${seg(args.id)}`, toPatchBody(args.patch));
}

export async function deleteCycle(args: { id: string; actor: DmsActor }): Promise<void> {
  return remove(`/cycles/${seg(args.id)}`);
}

/**
 * The row's `category` and `isPlanned` are sent as the form has them, and the
 * service replaces both with the chosen type's own values.
 */
export async function createStoppage(args: {
  reportId: string;
  stoppage: Omit<DmsStoppage, 'id' | 'reportId'>;
  actor: DmsActor;
}): Promise<DmsStoppage> {
  return send<DmsStoppage>('POST', `/reports/${seg(args.reportId)}/stoppages`, args.stoppage);
}

export async function updateStoppage(args: {
  id: string;
  patch: StoppagePatch;
  actor: DmsActor;
}): Promise<DmsStoppage> {
  return send<DmsStoppage>('PATCH', `/stoppages/${seg(args.id)}`, toPatchBody(args.patch));
}

export async function deleteStoppage(args: { id: string; actor: DmsActor }): Promise<void> {
  return remove(`/stoppages/${seg(args.id)}`);
}

// ─── Stoppage types ─────────────────────────────────────────────────────────

export async function listStoppageTypes(q: StoppageTypeQuery = {}): Promise<DmsStoppageType[]> {
  return list<DmsStoppageType>(`/stoppage-types${query({ query: q.query?.trim() })}`);
}

export async function getStoppageType({ id }: EntityRef): Promise<DmsStoppageType> {
  return get<DmsStoppageType>(`/stoppage-types/${seg(id)}`);
}

export async function createStoppageType(args: {
  code: string;
  category: string;
  name: string;
  isPlanned: boolean;
  actor: DmsActor;
}): Promise<DmsStoppageType> {
  return send<DmsStoppageType>('POST', '/stoppage-types', {
    code: args.code,
    category: args.category,
    name: args.name,
    isPlanned: args.isPlanned,
  });
}

export async function updateStoppageType(args: {
  id: string;
  patch: StoppageTypePatch;
  actor: DmsActor;
}): Promise<DmsStoppageType> {
  return send<DmsStoppageType>('PATCH', `/stoppage-types/${seg(args.id)}`, toPatchBody(args.patch));
}

// ─── Monthly volume corrections (Project Control) ───────────────────────────

/** Every correction of one project, whole-project and per-subproject, by month. */
export async function listMonthlyVolumeCorrections({
  projectId,
}: ProjectRef): Promise<DmsMonthlyVolumeCorrection[]> {
  return list<DmsMonthlyVolumeCorrection>(`/projects/${seg(projectId)}/monthly-volume-corrections`);
}

export async function getMonthlyVolumeCorrection({ id }: EntityRef): Promise<DmsMonthlyVolumeCorrection> {
  return get<DmsMonthlyVolumeCorrection>(`/monthly-volume-corrections/${seg(id)}`);
}

/** Refused (409 DUPLICATE_MONTH) when the project/subproject already has a figure for that month. */
export async function createMonthlyVolumeCorrection(args: {
  projectId: string;
  subprojectId?: string;
  jalaliYear: number;
  jalaliMonth: number;
  correctedCumulativeVolumeM3: number;
  notes?: string;
  actor: DmsActor;
}): Promise<DmsMonthlyVolumeCorrection> {
  return send<DmsMonthlyVolumeCorrection>('POST', `/projects/${seg(args.projectId)}/monthly-volume-corrections`, {
    jalaliYear: args.jalaliYear,
    jalaliMonth: args.jalaliMonth,
    correctedCumulativeVolumeM3: args.correctedCumulativeVolumeM3,
    ...(args.subprojectId !== undefined ? { subprojectId: args.subprojectId } : {}),
    ...(args.notes !== undefined ? { notes: args.notes } : {}),
  });
}

export async function updateMonthlyVolumeCorrection(args: {
  id: string;
  patch: MonthlyVolumeCorrectionPatch;
  actor: DmsActor;
}): Promise<DmsMonthlyVolumeCorrection> {
  return send<DmsMonthlyVolumeCorrection>('PATCH', `/monthly-volume-corrections/${seg(args.id)}`, toPatchBody(args.patch));
}

export async function deleteMonthlyVolumeCorrection(args: { id: string; actor: DmsActor }): Promise<void> {
  return remove(`/monthly-volume-corrections/${seg(args.id)}`);
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

/**
 * Every figure, computed by the service from APPROVED reports only. With no
 * projectId it covers every project the caller's company holds.
 */
export async function getDashboard(q: {
  projectId?: string;
  vesselId?: string;
  from?: string;
  to?: string;
}): Promise<DmsDashboard> {
  return dmsHttp<DmsDashboard>('GET', `/dashboard${query(q)}`);
}
