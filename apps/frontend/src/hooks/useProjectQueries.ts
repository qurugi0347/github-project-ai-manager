import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/api/client';
import { queryKeys } from '@/lib/queryKeys';
import type { Project, Task, Milestone } from '@/types';

export function useProjectQuery(projectId: number) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => apiGet<Project>(`/projects/${projectId}`),
    enabled: !!projectId,
  });
}

export function useTasksQuery(projectId: number) {
  return useQuery({
    queryKey: queryKeys.tasks.all(projectId),
    queryFn: () => apiGet<Task[]>(`/tasks?projectId=${projectId}`),
    enabled: !!projectId,
  });
}

export function useMilestonesQuery(projectId: number) {
  return useQuery({
    queryKey: queryKeys.milestones.all(projectId),
    queryFn: () => apiGet<Milestone[]>(`/milestones?projectId=${projectId}`),
    enabled: !!projectId,
  });
}

export function useStatusColumnsQuery(projectId: number) {
  return useQuery({
    queryKey: queryKeys.statusColumns.all(projectId),
    queryFn: () => apiGet<string[]>(`/sync/status-options?projectId=${projectId}`),
    enabled: !!projectId,
    retry: 0,
  });
}

/** 편의 훅: ProjectPage에서 필요한 4개 쿼리를 한번에 호출 */
export function useProjectPageData(projectId: number) {
  const projectQuery = useProjectQuery(projectId);
  const tasksQuery = useTasksQuery(projectId);
  const milestonesQuery = useMilestonesQuery(projectId);
  const statusColumnsQuery = useStatusColumnsQuery(projectId);

  return {
    project: projectQuery.data ?? null,
    tasks: tasksQuery.data ?? [],
    milestones: milestonesQuery.data ?? [],
    statusColumns: statusColumnsQuery.data ?? [],
    isLoading:
      projectQuery.isLoading ||
      tasksQuery.isLoading ||
      milestonesQuery.isLoading,
    error:
      projectQuery.error || tasksQuery.error || milestonesQuery.error,
  };
}
