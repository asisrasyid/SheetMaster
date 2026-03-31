"use client";
import { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Flag,
  Users,
  Tag,
  Trash2,
  CheckSquare,
  AlignLeft,
  Loader2,
} from "lucide-react";
import { Task, Role, BoardMember, Label, Priority } from "@/types";
import { canEdit, canManageColumns, PRIORITY_CONFIG, LABEL_COLORS, formatDate, isOverdue } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { SubTaskList } from "./SubTaskList";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/toaster";
import {
  useUpdateTask,
  useDeleteTask,
  useSubTaskMutations,
  useLabelMutations,
  useAssigneeMutations,
} from "@/hooks/useBoard";

interface TaskModalProps {
  task: Task;
  boardId: string;
  myRole: Role;
  members: BoardMember[];
  labels: Label[];
  onClose: () => void;
}

export function TaskModal({ task, boardId, myRole, members, labels, onClose }: TaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const [savingDesc, setSavingDesc] = useState(false);

  const updateTask = useUpdateTask(boardId);
  const deleteTask = useDeleteTask(boardId);
  const { createSubTask, updateSubTask, deleteSubTask } = useSubTaskMutations(boardId);
  const { createLabel, deleteLabel, addTaskLabel, removeTaskLabel } = useLabelMutations(boardId);
  const { addAssignee, removeAssignee } = useAssigneeMutations(boardId);

  const editable = canEdit(myRole);

  // Sync task data when it changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
  }, [task.title, task.description]);

  async function saveTitle() {
    if (!title.trim() || title === task.title) { setEditingTitle(false); setTitle(task.title); return; }
    setSavingTitle(true);
    try {
      await updateTask.mutateAsync({ taskId: task.id, updates: { title: title.trim() } });
    } catch { toast({ title: "Failed to update title", variant: "destructive" }); setTitle(task.title); }
    finally { setSavingTitle(false); setEditingTitle(false); }
  }

  async function saveDescription() {
    if (description === (task.description || "")) { setEditingDesc(false); return; }
    setSavingDesc(true);
    try {
      await updateTask.mutateAsync({ taskId: task.id, updates: { description } });
    } catch { toast({ title: "Failed to update description", variant: "destructive" }); }
    finally { setSavingDesc(false); setEditingDesc(false); }
  }

  async function handlePriorityChange(priority: Priority) {
    try {
      await updateTask.mutateAsync({ taskId: task.id, updates: { priority } });
    } catch { toast({ title: "Failed to update priority", variant: "destructive" }); }
  }

  async function handleDeadlineChange(deadline: string) {
    try {
      await updateTask.mutateAsync({ taskId: task.id, updates: { deadline } });
    } catch { toast({ title: "Failed to update deadline", variant: "destructive" }); }
  }

  async function handleDelete() {
    if (!confirm("Delete this task?")) return;
    try {
      await deleteTask.mutateAsync(task.id);
      onClose();
    } catch { toast({ title: "Failed to delete task", variant: "destructive" }); }
  }

  const assigneeIds = task.assignees?.map((a) => a.id) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet from right */}
      <div className="relative ml-auto flex h-full w-full max-w-2xl flex-col bg-card shadow-2xl animate-in slide-in-from-right-8 duration-200">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-border px-6 py-4">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                className="w-full bg-transparent text-lg font-semibold outline-none border-b border-primary pb-0.5"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") { setEditingTitle(false); setTitle(task.title); }
                }}
              />
            ) : (
              <h2
                className={`text-lg font-semibold leading-snug ${editable ? "cursor-pointer hover:text-primary transition-colors" : ""}`}
                onClick={() => editable && setEditingTitle(true)}
                title={editable ? "Click to edit title" : undefined}
              >
                {task.title}
                {savingTitle && <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {editable && (
              <Button size="icon-sm" variant="ghost" onClick={handleDelete} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button size="icon-sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 kanban-scroll">
          {/* Priority + Deadline row */}
          <div className="flex flex-wrap gap-3">
            {/* Priority */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  disabled={!editable}
                  className={`flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm transition-colors ${editable ? "hover:bg-accent cursor-pointer" : "cursor-default opacity-70"}`}
                >
                  <Flag className={`h-4 w-4 ${PRIORITY_CONFIG[task.priority].color}`} />
                  <span>{PRIORITY_CONFIG[task.priority].label}</span>
                </button>
              </PopoverTrigger>
              {editable && (
                <PopoverContent className="w-40 p-1">
                  {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePriorityChange(p)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors ${task.priority === p ? "bg-accent" : ""}`}
                    >
                      <Flag className={`h-4 w-4 ${PRIORITY_CONFIG[p].color}`} />
                      {PRIORITY_CONFIG[p].label}
                    </button>
                  ))}
                </PopoverContent>
              )}
            </Popover>

            {/* Deadline */}
            <div className="relative">
              <label
                className={`flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm transition-colors ${editable ? "hover:bg-accent cursor-pointer" : "cursor-default opacity-70"} ${isOverdue(task.deadline) ? "text-red-400 border-red-400/40" : ""}`}
              >
                <Calendar className="h-4 w-4" />
                <span>{task.deadline ? formatDate(task.deadline) : "No deadline"}</span>
                {editable && (
                  <input
                    type="date"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    value={task.deadline?.split("T")[0] || ""}
                    onChange={(e) => handleDeadlineChange(e.target.value)}
                  />
                )}
              </label>
            </div>
          </div>

          <Separator />

          {/* Assignees */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Assignees</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const isAssigned = assigneeIds.includes(m.userId);
                return (
                  <button
                    key={m.userId}
                    disabled={!editable}
                    onClick={() =>
                      editable &&
                      (isAssigned
                        ? removeAssignee.mutate({ taskId: task.id, userId: m.userId })
                        : addAssignee.mutate({ taskId: task.id, userId: m.userId }))
                    }
                    className={`flex items-center gap-2 rounded-full px-2.5 py-1 text-xs transition-all ${isAssigned ? "bg-primary/20 text-primary ring-1 ring-primary/40" : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"} ${!editable ? "cursor-default" : ""}`}
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className="text-[8px]" style={{ backgroundColor: m.avatarColor + "33", color: m.avatarColor }}>
                        {m.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Labels */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Tag className="h-4 w-4" />
              <span>Labels</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => {
                const isApplied = task.labels?.some((l) => l.id === label.id);
                return (
                  <button
                    key={label.id}
                    disabled={!editable}
                    onClick={() =>
                      editable &&
                      (isApplied
                        ? removeTaskLabel.mutate({ taskId: task.id, labelId: label.id })
                        : addTaskLabel.mutate({ taskId: task.id, labelId: label.id }))
                    }
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all ${!editable ? "cursor-default" : ""}`}
                    style={{
                      backgroundColor: isApplied ? label.color + "30" : label.color + "15",
                      color: label.color,
                      outline: isApplied ? `1.5px solid ${label.color}60` : "none",
                    }}
                  >
                    {label.name}
                  </button>
                );
              })}
              {/* Create new label */}
              {canManageColumns(myRole) && (
                <CreateLabelButton
                  boardId={boardId}
                  onCreate={(name, color) =>
                    createLabel.mutate({ name, color })
                  }
                />
              )}
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlignLeft className="h-4 w-4" />
              <span>Description</span>
            </div>
            {editingDesc ? (
              <div className="space-y-2">
                <Textarea
                  autoFocus
                  className="min-h-[100px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description…"
                  onBlur={saveDescription}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveDescription} disabled={savingDesc}>
                    {savingDesc && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingDesc(false); setDescription(task.description || ""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => editable && setEditingDesc(true)}
                className={`min-h-[60px] rounded-md px-3 py-2 text-sm ${description ? "text-foreground" : "text-muted-foreground/60 italic"} ${editable ? "hover:bg-accent cursor-pointer" : ""} transition-colors`}
              >
                {description || (editable ? "Click to add a description…" : "No description")}
              </div>
            )}
          </div>

          <Separator />

          {/* Sub-tasks */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckSquare className="h-4 w-4" />
              <span>Checklist</span>
            </div>
            <SubTaskList
              subTasks={task.subTasks || []}
              taskId={task.id}
              myRole={myRole}
              onCreate={async (title) => { await createSubTask.mutateAsync({ taskId: task.id, title }); }}
              onToggle={(subTaskId, isCompleted) => updateSubTask.mutate({ subTaskId, updates: { isCompleted } })}
              onDelete={(subTaskId) => deleteSubTask.mutate(subTaskId)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateLabelButton({
  boardId,
  onCreate,
}: {
  boardId: string;
  onCreate: (name: string, color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(LABEL_COLORS[0]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
          + New label
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 space-y-3">
        <p className="text-xs font-semibold">New Label</p>
        <input
          autoFocus
          className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
          placeholder="Label name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          {LABEL_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${color === c ? "ring-2 ring-offset-1 ring-offset-popover ring-white" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <Button
          size="sm"
          className="w-full"
          disabled={!name.trim()}
          onClick={() => {
            onCreate(name.trim(), color);
            setName("");
            setOpen(false);
          }}
        >
          Create
        </Button>
      </PopoverContent>
    </Popover>
  );
}

