import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiGetBoard,
  apiCreateTask,
  apiUpdateTask,
  apiDeleteTask,
  apiMoveTask,
  apiCreateColumn,
  apiUpdateColumn,
  apiDeleteColumn,
  apiReorderColumns,
  apiCreateSubTask,
  apiUpdateSubTask,
  apiDeleteSubTask,
  apiCreateLabel,
  apiDeleteLabel,
  apiAddTaskLabel,
  apiRemoveTaskLabel,
  apiAddAssignee,
  apiRemoveAssignee,
} from "@/lib/api";

export function useBoard(boardId: string) {
  return useQuery({
    queryKey: ["board", boardId],
    queryFn: () => apiGetBoard(boardId),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useCreateTask(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      columnId,
      title,
      priority,
    }: {
      columnId: string;
      title: string;
      priority?: string;
    }) => apiCreateTask(boardId, columnId, title, priority),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}

export function useUpdateTask(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Record<string, unknown> }) =>
      apiUpdateTask(taskId, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}

export function useDeleteTask(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => apiDeleteTask(taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}

export function useMoveTask(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      toColumnId,
      position,
    }: {
      taskId: string;
      toColumnId: string;
      position: number;
    }) => apiMoveTask(taskId, toColumnId, position),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}

export function useCreateColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      apiCreateColumn(boardId, name, color),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}

export function useUpdateColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      columnId,
      name,
      color,
      requiresApproval,
    }: {
      columnId: string;
      name: string;
      color: string;
      requiresApproval: boolean;
    }) => apiUpdateColumn(columnId, name, color, requiresApproval),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}

export function useDeleteColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (columnId: string) => apiDeleteColumn(columnId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}

export function useReorderColumns(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (columnIds: string[]) => apiReorderColumns(columnIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}

export function useSubTaskMutations(boardId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["board", boardId] });

  return {
    createSubTask: useMutation({
      mutationFn: ({ taskId, title }: { taskId: string; title: string }) =>
        apiCreateSubTask(taskId, title),
      onSuccess: invalidate,
    }),
    updateSubTask: useMutation({
      mutationFn: ({
        subTaskId,
        updates,
      }: {
        subTaskId: string;
        updates: { title?: string; isCompleted?: boolean };
      }) => apiUpdateSubTask(subTaskId, updates),
      onSuccess: invalidate,
    }),
    deleteSubTask: useMutation({
      mutationFn: (subTaskId: string) => apiDeleteSubTask(subTaskId),
      onSuccess: invalidate,
    }),
  };
}

export function useLabelMutations(boardId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["board", boardId] });

  return {
    createLabel: useMutation({
      mutationFn: ({ name, color }: { name: string; color: string }) =>
        apiCreateLabel(boardId, name, color),
      onSuccess: invalidate,
    }),
    deleteLabel: useMutation({
      mutationFn: (labelId: string) => apiDeleteLabel(labelId),
      onSuccess: invalidate,
    }),
    addTaskLabel: useMutation({
      mutationFn: ({ taskId, labelId }: { taskId: string; labelId: string }) =>
        apiAddTaskLabel(taskId, labelId),
      onSuccess: invalidate,
    }),
    removeTaskLabel: useMutation({
      mutationFn: ({ taskId, labelId }: { taskId: string; labelId: string }) =>
        apiRemoveTaskLabel(taskId, labelId),
      onSuccess: invalidate,
    }),
  };
}

export function useAssigneeMutations(boardId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["board", boardId] });

  return {
    addAssignee: useMutation({
      mutationFn: ({ taskId, userId }: { taskId: string; userId: string }) =>
        apiAddAssignee(taskId, userId),
      onSuccess: invalidate,
    }),
    removeAssignee: useMutation({
      mutationFn: ({ taskId, userId }: { taskId: string; userId: string }) =>
        apiRemoveAssignee(taskId, userId),
      onSuccess: invalidate,
    }),
  };
}
