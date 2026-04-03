import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/api/client';
import { queryKeys } from '@/lib/queryKeys';
import type { Project } from '@/types';

export function useProjectListQuery() {
  return useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: () => apiGet<Project[]>('/projects'),
  });
}
