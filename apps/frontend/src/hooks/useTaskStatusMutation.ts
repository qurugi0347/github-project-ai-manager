import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPatch } from '@/api/client';
import { queryKeys } from '@/lib/queryKeys';
import type { Task } from '@/types';

export function useTaskStatusMutation(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      status,
    }: {
      taskId: number;
      status: string;
    }) => apiPatch(`/tasks/${taskId}?projectId=${projectId}`, { status }),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.tasks.all(projectId),
      });
      const previous = queryClient.getQueryData<Task[]>(
        queryKeys.tasks.all(projectId),
      );
      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.all(projectId),
        (old) => old?.map((t) => (t.id === taskId ? { ...t, status } : t)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.tasks.all(projectId),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.all(projectId),
      });
    },
  });
}
