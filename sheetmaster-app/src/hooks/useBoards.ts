import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGetBoards, apiCreateBoard, apiUpdateBoard, apiDeleteBoard } from "@/lib/api";
import { Board } from "@/types";

export function useBoards() {
  return useQuery({
    queryKey: ["boards"],
    queryFn: apiGetBoards,
    staleTime: 30_000,
  });
}

export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description: string }) =>
      apiCreateBoard(name, description),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boards"] }),
  });
}

export function useUpdateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      boardId,
      name,
      description,
    }: {
      boardId: string;
      name: string;
      description: string;
    }) => apiUpdateBoard(boardId, name, description),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["boards"] });
      qc.invalidateQueries({ queryKey: ["board", vars.boardId] });
    },
  });
}

export function useDeleteBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (boardId: string) => apiDeleteBoard(boardId),
    onMutate: async (boardId) => {
      await qc.cancelQueries({ queryKey: ["boards"] });
      const prev = qc.getQueryData<Board[]>(["boards"]);
      qc.setQueryData<Board[]>(["boards"], (old) =>
        old ? old.filter((b) => b.id !== boardId) : []
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) qc.setQueryData(["boards"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["boards"] }),
  });
}
