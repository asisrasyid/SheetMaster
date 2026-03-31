"use client";
import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Loader2 } from "lucide-react";
import { Column, Task, Role } from "@/types";
import { cn, canEdit, canManageColumns } from "@/lib/utils";
import { TaskCard } from "./TaskCard";
import { ColumnHeader } from "./ColumnHeader";

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  myRole: Role;
  isOver?: boolean;
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: string, title: string) => Promise<void>;
  onRenameColumn: (columnId: string, name: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onToggleApproval: (columnId: string) => void;
  onColorChange: (columnId: string, color: string) => void;
}

export function KanbanColumn({
  column,
  tasks,
  myRole,
  onTaskClick,
  onAddTask,
  onRenameColumn,
  onDeleteColumn,
  onToggleApproval,
  onColorChange,
}: KanbanColumnProps) {
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const addInputRef = useRef<HTMLTextAreaElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: isColumnDragging,
  } = useSortable({
    id: `col:${column.id}`,
    data: { type: "column", column },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", column },
  });

  useEffect(() => {
    if (addingTask) addInputRef.current?.focus();
  }, [addingTask]);

  async function handleAddTask() {
    if (!newTaskTitle.trim()) return;
    setAdding(true);
    try {
      await onAddTask(column.id, newTaskTitle.trim());
      setNewTaskTitle("");
      setAddingTask(false);
    } finally {
      setAdding(false);
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={cn(
        "flex h-full w-80 shrink-0 flex-col rounded-xl border border-border bg-card/50 transition-all duration-150",
        isColumnDragging && "opacity-30 ring-2 ring-primary/40",
        isOver && "ring-2 ring-primary/60 bg-primary/5"
      )}
    >
      {/* Column top border accent */}
      <div className="h-0.5 rounded-t-xl" style={{ backgroundColor: column.color + "80" }} />

      <ColumnHeader
        column={column}
        taskCount={tasks.length}
        myRole={myRole}
        dragHandleProps={{ ...attributes, ...listeners }}
        onRename={(name) => onRenameColumn(column.id, name)}
        onDelete={() => onDeleteColumn(column.id)}
        onToggleApproval={() => onToggleApproval(column.id)}
        onColorChange={(color) => onColorChange(column.id, color)}
      />

      {/* Tasks */}
      <div
        ref={setDropRef}
        className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 min-h-[80px] kanban-scroll"
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              myRole={myRole}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>

        {/* Drop zone when empty */}
        {tasks.length === 0 && (
          <div
            className={cn(
              "flex h-20 items-center justify-center rounded-lg border border-dashed border-border/50 text-xs text-muted-foreground/40 transition-colors",
              isOver && "border-primary/50 text-primary/60 bg-primary/5"
            )}
          >
            Drop tasks here
          </div>
        )}
      </div>

      {/* Add task */}
      {canEdit(myRole) && (
        <div className="px-3 pb-3">
          {addingTask ? (
            <div className="rounded-lg border border-border bg-card p-2 space-y-2">
              <textarea
                ref={addInputRef}
                className="w-full bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground"
                placeholder="Task title…"
                rows={2}
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddTask();
                  }
                  if (e.key === "Escape") {
                    setAddingTask(false);
                    setNewTaskTitle("");
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim() || adding}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {adding && <Loader2 className="h-3 w-3 animate-spin" />}
                  Add
                </button>
                <button
                  onClick={() => { setAddingTask(false); setNewTaskTitle(""); }}
                  className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingTask(true)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add task
            </button>
          )}
        </div>
      )}
    </div>
  );
}
