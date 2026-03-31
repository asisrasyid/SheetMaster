"use client";
import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Trash2, Settings, GripVertical, ShieldCheck } from "lucide-react";
import { Column, Role } from "@/types";
import { cn, canManageColumns, COLUMN_COLORS } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";

interface ColumnHeaderProps {
  column: Column;
  taskCount: number;
  myRole: Role;
  dragHandleProps?: Record<string, unknown>;
  onRename: (name: string) => void;
  onDelete: () => void;
  onToggleApproval: () => void;
  onColorChange: (color: string) => void;
}

export function ColumnHeader({
  column,
  taskCount,
  myRole,
  dragHandleProps,
  onRename,
  onDelete,
  onToggleApproval,
  onColorChange,
}: ColumnHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(column.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commitRename() {
    setEditing(false);
    if (draft.trim() && draft !== column.name) onRename(draft.trim());
    else setDraft(column.name);
  }

  return (
    <div className="flex items-center gap-2 px-3 py-3">
      {/* Drag handle for column */}
      {canManageColumns(myRole) && dragHandleProps && (
        <div
          {...(dragHandleProps as React.HTMLAttributes<HTMLDivElement>)}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Color dot */}
      <div
        className="h-2.5 w-2.5 rounded-full shrink-0"
        style={{ backgroundColor: column.color }}
      />

      {/* Title */}
      {editing ? (
        <input
          ref={inputRef}
          className="flex-1 bg-transparent text-sm font-semibold outline-none border-b border-primary pb-0.5"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setDraft(column.name);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          className="flex-1 text-left text-sm font-semibold text-foreground hover:text-primary transition-colors truncate"
          onDoubleClick={() => canManageColumns(myRole) && setEditing(true)}
          title={canManageColumns(myRole) ? "Double-click to rename" : column.name}
        >
          {column.name}
        </button>
      )}

      {/* Count */}
      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground min-w-[18px] text-center">
        {taskCount}
      </span>

      {/* Approval lock icon */}
      {column.requiresApproval && (
        <span title="Requires approval"><ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" /></span>
      )}

      {/* Menu */}
      {canManageColumns(myRole) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Colors</DropdownMenuLabel>
            <div className="px-2 pb-1 flex flex-wrap gap-1.5">
              {COLUMN_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onColorChange(c)}
                  className={cn(
                    "h-5 w-5 rounded-full transition-transform hover:scale-110",
                    column.color === c && "ring-2 ring-offset-1 ring-offset-popover ring-white"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleApproval}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              {column.requiresApproval ? "Remove approval gate" : "Require approval"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
