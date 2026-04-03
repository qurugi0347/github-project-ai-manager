export const queryKeys = {
  projects: {
    all: ['projects'] as const,
    detail: (id: number) => ['projects', id] as const,
  },
  tasks: {
    all: (projectId: number) => ['tasks', { projectId }] as const,
    detail: (id: number) => ['tasks', id] as const,
  },
  milestones: {
    all: (projectId: number) => ['milestones', { projectId }] as const,
  },
  statusColumns: {
    all: (projectId: number) => ['statusColumns', { projectId }] as const,
  },
} as const;
