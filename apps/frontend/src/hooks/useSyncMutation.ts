import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '@/api/client';
import { queryKeys } from '@/lib/queryKeys';

export function useSyncMutation(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiPost(`/sync/pull?projectId=${projectId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.all(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.milestones.all(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.statusColumns.all(projectId),
      });
    },
  });
}
