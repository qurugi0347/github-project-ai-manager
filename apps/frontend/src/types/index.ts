export interface Project {
  id: number;
  owner: string;
  ownerType: string;
  repo: string | null;
  projectNumber: number;
  projectUrl: string;
  createdAt: string;
}

export interface Assignee {
  login: string;
  avatarUrl: string;
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  body?: string;
  status: string;
  contentType: string;
  milestoneId?: number;
  milestone?: Milestone;
  assignees?: (string | Assignee)[];
  authorLogin?: string | null;
  authorAvatarUrl?: string | null;
  priority?: string;
  labels?: Label[];
  branch?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  dueDate?: string;
  state: string;
  taskCount?: number;
  doneCount?: number;
}

export interface Label {
  id: number;
  name: string;
  color?: string;
  description?: string;
}

/**
 * Normalize assignees array to Assignee[] format.
 * Handles both legacy string[] (login only) and new {login, avatarUrl}[] formats.
 */
export function normalizeAssignees(
  assignees: (string | Assignee)[] | undefined,
): Assignee[] {
  if (!assignees) return [];
  return assignees.map((a) => {
    if (typeof a === 'string') {
      return {
        login: a,
        avatarUrl: `https://github.com/${a}.png?size=40`,
      };
    }
    return a;
  });
}
