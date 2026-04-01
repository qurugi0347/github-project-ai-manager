export interface Project {
  id: number;
  owner: string;
  ownerType: string;
  repo: string | null;
  projectNumber: number;
  projectUrl: string;
  createdAt: string;
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
  assignees?: string[];
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
