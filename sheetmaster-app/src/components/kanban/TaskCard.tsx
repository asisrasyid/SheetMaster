"use client";
import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, CheckSquare, Clock, GripVertical } from "lucide-react";
import { Task, Role } from "@/types";
import { cn, PRIORITY_CONFIG, formatDate, isOverdue, canEdit } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TaskCardProps {
  task: Task;
  myRole: Role;
  isDragOverlay?: boolean;
  onClick: () => void;
}

export function TaskCard({ task, myRole, isDragOverlay, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", task },
    disabled: !canEdit(myRole),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const completedSubTasks = task.subTasks?.filter((s) => s.isCompleted).length ?? 0;
  const totalSubTasks = task.subTasks?.length ?? 0;
  const hasPendingApproval = !!task.pendingApproval;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border border-border bg-card border-l-2 cursor-pointer select-none",
        priorityConfig.borderColor,
        isDragging && "opacity-30 ring-2 ring-primary/40",
        isDragOverlay && "rotate-1 scale-105 shadow-2xl shadow-black/40 ring-2 ring-primary/60",
        "hover:border-border/80 hover:shadow-md transition-all duration-150"
      )}
      onClick={onClick}
    >
      {/* Drag handle */}
      {canEdit(myRole) && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10 p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
      )}

      <div className="p-3 pl-5">
        {/* Labels */}
        {task.labels?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.labels.map((label) => (
              <span
                key={label.id}
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: label.color + "25", color: label.color }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <p className="text-sm font-medium leading-snug line-clamp-2 text-foreground">{task.title}</p>

        {/* Pending approval badge */}
        {hasPendingApproval && (
          <div className="mt-2 flex items-center gap-1.5 text-amber-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide">Pending Approval</span>
          </div>
        )}

        {/* Footer row */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Subtask progress */}
            {totalSubTasks > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <CheckSquare className="h-3 w-3" />
                <span className="text-[10px]">
                  {completedSubTasks}/{totalSubTasks}
                </span>
              </div>
            )}
            {/* Deadline */}
            {task.deadline && (
              <div
                className={cn(
                  "flex items-center gap-1 text-[10px]",
                  isOverdue(task.deadline) ? "text-red-400" : "text-muted-foreground"
                )}
              >
                <Calendar className="h-3 w-3" />
                <span>{formatDate(task.deadline)}</span>
              </div>
            )}
          </div>

          {/* Assignee avatars */}
          {task.assignees?.length > 0 && (
            <div className="flex -space-x-1.5">
              {task.assignees.slice(0, 3).map((a) => (
                <Avatar key={a.id} className="h-5 w-5 ring-1 ring-card">
                  <AvatarFallback
                    className="text-[8px] font-bold"
                    style={{ backgroundColor: a.avatarColor + "33", color: a.avatarColor }}
                  >
                    {a.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {task.assignees.length > 3 && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted ring-1 ring-card text-[8px] text-muted-foreground font-bold">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
