import { create } from "zustand";
import { BoardData, Task, Column } from "@/types";

interface BoardStore {
  boardData: BoardData | null;
  setBoardData: (data: BoardData) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  moveTaskOptimistic: (taskId: string, toColumnId: string, position: number) => void;
  reorderColumns: (columnIds: string[]) => void;
  addColumn: (column: Column) => void;
  removeColumn: (columnId: string) => void;
  updateColumn: (columnId: string, updates: Partial<Column>) => void;
  addTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
}

export const useBoardStore = create<BoardStore>((set) => ({
  boardData: null,

  setBoardData: (data) => set({ boardData: data }),

  updateTask: (taskId, updates) =>
    set((state) => {
      if (!state.boardData) return state;
      return {
        boardData: {
          ...state.boardData,
          tasks: state.boardData.tasks.map((t) =>
            t.id === taskId ? { ...t, ...updates } : t
          ),
        },
      };
    }),

  moveTaskOptimistic: (taskId, toColumnId, position) =>
    set((state) => {
      if (!state.boardData) return state;
      return {
        boardData: {
          ...state.boardData,
          tasks: state.boardData.tasks.map((t) =>
            t.id === taskId ? { ...t, columnId: toColumnId, position } : t
          ),
        },
      };
    }),

  reorderColumns: (columnIds) =>
    set((state) => {
      if (!state.boardData) return state;
      const colMap = new Map(state.boardData.columns.map((c) => [c.id, c]));
      const reordered = columnIds
        .map((id, i) => {
          const col = colMap.get(id);
          return col ? { ...col, position: i } : null;
        })
        .filter(Boolean) as Column[];
      return { boardData: { ...state.boardData, columns: reordered } };
    }),

  addColumn: (column) =>
    set((state) => {
      if (!state.boardData) return state;
      return {
        boardData: {
          ...state.boardData,
          columns: [...state.boardData.columns, column],
        },
      };
    }),

  removeColumn: (columnId) =>
    set((state) => {
      if (!state.boardData) return state;
      return {
        boardData: {
          ...state.boardData,
          columns: state.boardData.columns.filter((c) => c.id !== columnId),
          tasks: state.boardData.tasks.filter((t) => t.columnId !== columnId),
        },
      };
    }),

  updateColumn: (columnId, updates) =>
    set((state) => {
      if (!state.boardData) return state;
      return {
        boardData: {
          ...state.boardData,
          columns: state.boardData.columns.map((c) =>
            c.id === columnId ? { ...c, ...updates } : c
          ),
        },
      };
    }),

  addTask: (task) =>
    set((state) => {
      if (!state.boardData) return state;
      return {
        boardData: {
          ...state.boardData,
          tasks: [...state.boardData.tasks, task],
        },
      };
    }),

  removeTask: (taskId) =>
    set((state) => {
      if (!state.boardData) return state;
      return {
        boardData: {
          ...state.boardData,
          tasks: state.boardData.tasks.filter((t) => t.id !== taskId),
        },
      };
    }),
}));
