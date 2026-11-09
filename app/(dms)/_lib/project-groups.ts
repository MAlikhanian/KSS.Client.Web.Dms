import type { DmsProject } from '@/lib/dms/types';

/**
 * The caller's projects, split for the pickers: those with an assignment that
 * covers today, and those whose only windows are past or future, whose
 * existing days can still be opened and finished. A project the service has
 * not flagged (absent, or null for an unscoped role) counts as current, which
 * is how every project was listed before the flag.
 */
export interface ProjectGroups {
  current: DmsProject[];
  previous: DmsProject[];
}

export function isPreviousProject(project: DmsProject): boolean {
  return project.assignedToday === false;
}

/** Keeps the service's order inside each group. */
export function groupProjects(projects: readonly DmsProject[]): ProjectGroups {
  const current: DmsProject[] = [];
  const previous: DmsProject[] = [];
  for (const project of projects) {
    (isPreviousProject(project) ? previous : current).push(project);
  }
  return { current, previous };
}
