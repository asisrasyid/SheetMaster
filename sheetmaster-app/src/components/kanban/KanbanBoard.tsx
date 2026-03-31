"use client";
import { useState, useCallback, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import { Plus, Loader2 } from "lucide-react";
import { BoardData, Task, Column, Role } from "@/types";
import { canManageColumns, canEdit, canApprove, COLUMN_COLORS } from "@/lib/utils";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "@/components/task/TaskModal";
import { ApprovalRequestModal } from "@/components/approval/ApprovalRequestModal";
import { toast } from "@/components/ui/toaster";
import {
  useCreateTask,
  useMoveTask,
  useCreateColumn,
  useUpdateColumn,
  useDeleteColumn,
  useReorderColumns,
} from "@/hooks/useBoard";
import { useBoardStore } from "@/store/boardStore";
import { apiMoveTask } from "@/lib/api";

interface KanbanBoardProps {
  boardData: BoardData;
  myRole: Role;
}

export function KanbanBoard({ boardData, myRole }: KanbanBoardProps) {
  const { board, columns, tasks, members, labels } = boardData;
  const setBoardData = useBoardStore((s) => s.setBoardData);
  const moveTaskOptimistic = useBoardStore((s) => s.moveTaskOptimistic);
  const reorderColumnsFn = useBoardStore((s) => s.reorderColumns);

  const createTask = useCreateTask(board.id);
  const moveTask = useMoveTask(board.id);
  const createColumn = useCreateColumn(board.id);
  const updateColumn = useUpdateColumn(board.id);
  const deleteColumn = useDeleteColumn(board.id);
  const reorderColumns = useReorderColumns(board.id);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [approvalPending, setApprovalPending] = useState<{
    task: Task;
    toColumn: Column;
  } | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [addingCol, setAddingCol] = useState(false);

  const reorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function getTasksForColumn(colId: string) {
    return tasks
      .filter((t) => t.columnId === colId)
      .sort((a, b) => a.position - b.position);
  }

  function onDragStart({ active }: DragStartEvent) {
    const data = active.data.current;
    if (data?.type === "task") setActiveTask(data.task);
    if (data?.type === "column") setActiveColumn(data.column);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || !activeTask) return;
    const overData = over.data.current;
    const toColId =
      overData?.type === "column"
        ? over.id as string
        : overData?.type === "task"
        ? overData.task.columnId
        : null;

    if (!toColId || toColId === activeTask.columnId) return;
    moveTaskOptimistic(activeTask.id, toColId, 0);
    setActiveTask((prev) => prev ? { ...prev, columnId: toColId } : prev);
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null);
    setActiveColumn(null);
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Column reorder
    if (activeData?.type === "column") {
      const activeColId = (active.id as string).replace("col:", "");
      const overColId = (over.id as string).replace("col:", "");
      if (activeColId === overColId) return;

      const oldIndex = sortedColumns.findIndex((c) => c.id === activeColId);
      const newIndex = sortedColumns.findIndex((c) => c.id === overColId);
      const newOrder = arrayMove(sortedColumns, oldIndex, newIndex).map((c) => c.id);
      reorderColumnsFn(newOrder);

      if (reorderTimer.current) clearTimeout(reorderTimer.current);
      reorderTimer.current = setTimeout(() => {
        reorderColumns.mutate(newOrder);
      }, 500);
      return;
    }

    // Task move
    if (activeData?.type === "task") {
      const task = activeData.task as Task;
      const toColId =
        overData?.type === "column"
          ? (over.id as string)
          : overData?.type === "task"
          ? overData.task.columnId
          : null;

      if (!toColId) return;
      const toCol = columns.find((c) => c.id === toColId);
      if (!toCol) return;

      // Check if approval needed
      if (toCol.requiresApproval && myRole === "contributor" && toColId !== task.columnId) {
        setApprovalPending({ task, toColumn: toCol });
        // Revert optimistic
        moveTaskOptimistic(task.id, task.columnId, task.position);
        return;
      }

      const colTasks = getTasksForColumn(toColId);
      const overTaskIndex = colTasks.findIndex((t) => t.id === (over.id as string));
      const position = overTaskIndex >= 0 ? overTaskIndex : colTasks.length;

      try {
        await apiMoveTask(task.id, toColId, position);
      } catch (err: unknown) {
        moveTaskOptimistic(task.id, task.columnId, task.position);
        toast({ title: "Failed to move task", variant: "destructive" });
      }
    }
  }

  async function handleAddTask(columnId: string, title: string) {
    try {
      await createTask.mutateAsync({ columnId, title });
    } catch (err: unknown) {
      toast({ title: "Failed to create task", variant: "destructive" });
    }
  }

  async function handleRenameColumn(columnId: string, name: string) {
    const col = columns.find((c) => c.id === columnId);
    if (!col) return;
    try {
      await updateColumn.mutateAsync({ columnId, name, color: col.color, requiresApproval: col.requiresApproval });
    } catch {
      toast({ title: "Failed to rename column", variant: "destructive" });
    }
  }

  async function handleDeleteColumn(columnId: string) {
    const colTasks = getTasksForColumn(columnId);
    if (colTasks.length > 0 && !confirm(`This column has ${colTasks.length} tasks. Delete anyway?`)) return;
    try {
      await deleteColumn.mutateAsync(columnId);
    } catch {
      toast({ title: "Failed to delete column", variant: "destructive" });
    }
  }

  async function handleToggleApproval(columnId: string) {
    const col = columns.find((c) => c.id === columnId);
    if (!col) return;
    try {
      await updateColumn.mutateAsync({
        columnId,
        name: col.name,
        color: col.color,
        requiresApproval: !col.requiresApproval,
      });
    } catch {
      toast({ title: "Failed to update column", variant: "destructive" });
    }
  }

  async function handleColorChange(columnId: string, color: string) {
    const col = columns.find((c) => c.id === columnId);
    if (!col) return;
    try {
      await updateColumn.mutateAsync({ columnId, name: col.name, color, requiresApproval: col.requiresApproval });
    } catch {
      toast({ title: "Failed to update color", variant: "destructive" });
    }
  }

  async function handleAddColumn() {
    if (!newColName.trim()) return;
    setAddingCol(true);
    try {
      await createColumn.mutateAsync({
        name: newColName.trim(),
        color: COLUMN_COLORS[columns.length % COLUMN_COLORS.length],
      });
      setNewColName("");
      setAddingColumn(false);
    } catch {
      toast({ title: "Failed to add column", variant: "destructive" });
    } finally {
      setAddingCol(false);
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex h-full gap-3 overflow-x-auto px-6 py-4 kanban-scroll">
          <SortableContext
            items={sortedColumns.map((c) => `col:${c.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            {sortedColumns.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={getTasksForColumn(col.id)}
                myRole={myRole}
                onTaskClick={(task) => setSelectedTask(task)}
                onAddTask={handleAddTask}
                onRenameColumn={handleRenameColumn}
                onDeleteColumn={handleDeleteColumn}
                onToggleApproval={handleToggleApproval}
                onColorChange={handleColorChange}
              />
            ))}
          </SortableContext>

          {/* Add Column */}
          {canManageColumns(myRole) && (
            <div className="w-72 shrink-0">
              {addingColumn ? (
                <div className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
                  <input
                    autoFocus
                    className="w-full bg-transparent text-sm font-medium outline-none border-b border-primary pb-0.5 placeholder:text-muted-foreground"
                    placeholder="Column name…"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddColumn();
                      if (e.key === "Escape") { setAddingColumn(false); setNewColName(""); }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddColumn}
                      disabled={!newColName.trim() || addingCol}
                      className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                    >
                      {addingCol && <Loader2 className="h-3 w-3 animate-spin" />}
                      Add
                    </button>
                    <button
                      onClick={() => { setAddingColumn(false); setNewColName(""); }}
                      className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingColumn(true)}
                  className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Add column
                </button>
              )}
            </div>
          )}
        </div>

        {typeof document !== "undefined" &&
          createPortal(
            <DragOverlay dropAnimation={{ duration: 150 }}>
              {activeTask && (
                <TaskCard
                  task={activeTask}
                  myRole={myRole}
                  isDragOverlay
                  onClick={() => {}}
                />
              )}
            </DragOverlay>,
            document.body
          )}
      </DndContext>

      {/* Task detail modal */}
      {selectedTask && (
        <TaskModal
          task={tasks.find((t) => t.id === selectedTask.id) || selectedTask}
          boardId={board.id}
          myRole={myRole}
          members={members}
          labels={labels}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Approval request modal */}
      {approvalPending && (
        <ApprovalRequestModal
          task={approvalPending.task}
          toColumn={approvalPending.toColumn}
          boardId={board.id}
          onClose={() => setApprovalPending(null)}
        />
      )}
    </>
  );
}
