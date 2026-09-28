import type {
  ApprovedDailyReport,
  DmsCycle,
  DmsProject,
  DmsStoppage,
} from '@/lib/dms/types';
import {
  listApprovedReports,
  listCyclesForProject,
  listProjects,
  listStoppagesForProject,
} from '@/lib/dms/mock-store';

/**
 * The all-projects view, for the dashboard's default state.
 *
 * ⛔ THE NUMERATOR AND THE DENOMINATOR COME FROM THE SAME SETTLED SET.
 *
 * `listProjects()` returns every project INCLUDING ones whose data cannot be
 * read, and `initialDredgingVolumeM3` sits right there on each of them. So the
 * natural way to write this — sum the volumes from the project list, sum the
 * dredged volume from whichever reads succeeded — produces a denominator with
 * members the numerator never had, under a caption saying how many were
 * included. The figure would be wrong and the caption would be wrong about the
 * figure.
 *
 * ⚠ AND THE TWO EMPTY-LOOKING CASES ARE NOT SYMMETRIC. Do not unify them:
 *
 *   read succeeded, no approved reports  → a REAL zero      → IN the denominator
 *   read failed                          → absence of info  → OUT
 *
 * A project we could not READ is not a project that did no work. Including it
 * at full volume with zero dredged asserts something we do not know, and it is
 * the same defect as a total that quietly excludes: a number whose membership
 * does not match its claim.
 *
 * ⛔ NEVER CALL THE PER-PROJECT READERS WITH AN EMPTY id. `requireProject('')`
 * matches no project and throws NotFound 404 — verified — so the empty-project
 * state must be served by THIS function, never by removing the `enabled` gate
 * on the per-project queries.
 */
export interface AggregateResult {
  /** Projects whose reads resolved. The ONLY source of the denominator. */
  included: DmsProject[];
  /** Projects whose reads failed, with the error code, for the disclosure. */
  excluded: { project: DmsProject; code: string }[];
  reports: ApprovedDailyReport[];
  cycles: DmsCycle[];
  stoppages: DmsStoppage[];
  /** Summed over `included` only — never over `listProjects()`. */
  denominatorVolumeM3: number;
  /** Summed over `included` only; undefined amounts contribute nothing. */
  denominatorContractAmount: number;
}

export async function loadAggregate(): Promise<AggregateResult> {
  const projects = await listProjects({});

  // Each project settles independently: one unreadable project must not fail
  // the whole screen, which is the difference between a partial view we can
  // disclose and an error page.
  const settled = await Promise.all(
    projects.map(async (project) => {
      try {
        const [reports, cycles, stoppages] = await Promise.all([
          listApprovedReports({ projectId: project.id }),
          listCyclesForProject({ projectId: project.id }),
          listStoppagesForProject({ projectId: project.id }),
        ]);
        return { project, reports, cycles, stoppages, error: null as string | null };
      } catch (error) {
        const code =
          typeof error === 'object' && error !== null && 'code' in error
            ? String((error as { code: unknown }).code)
            : 'Unknown';
        return { project, reports: [], cycles: [], stoppages: [], error: code };
      }
    }),
  );

  const ok = settled.filter((row) => row.error === null);
  const failed = settled.filter((row) => row.error !== null);

  return {
    included: ok.map((row) => row.project),
    excluded: failed.map((row) => ({ project: row.project, code: row.error as string })),
    reports: ok.flatMap((row) => row.reports),
    cycles: ok.flatMap((row) => row.cycles),
    stoppages: ok.flatMap((row) => row.stoppages),
    // ⛔ `ok`, not `projects`. This is the whole rule in one word.
    denominatorVolumeM3: ok.reduce(
      (sum, row) => sum + (row.project.initialDredgingVolumeM3 ?? 0),
      0,
    ),
    denominatorContractAmount: ok.reduce(
      (sum, row) => sum + (row.project.initialContractAmount ?? 0),
      0,
    ),
  };
}
