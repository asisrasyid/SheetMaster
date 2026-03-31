"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, LayoutGrid, Loader2, Trash2, MoreHorizontal, Edit } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBoards, useCreateBoard, useDeleteBoard } from "@/hooks/useBoards";
import { Board } from "@/types";
import { ROLE_CONFIG } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

export default function BoardsPage() {
  const router = useRouter();
  const { data: boards, isLoading } = useBoards();
  const createBoard = useCreateBoard();
  const deleteBoard = useDeleteBoard();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      const board = await createBoard.mutateAsync({ name: name.trim(), description });
      setShowCreate(false);
      setName("");
      setDescription("");
      router.push(`/boards/${board.id}`);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create board", variant: "destructive" });
    }
  }

  async function handleDelete(boardId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this board? All tasks will be lost.")) return;
    try {
      await deleteBoard.mutateAsync(boardId);
      toast({ title: "Board deleted", variant: "success" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete", variant: "destructive" });
    }
  }

  return (
    <>
      <Topbar
        title="My Boards"
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Board
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !boards?.length ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
            <LayoutGrid className="h-12 w-12 opacity-30" />
            <p className="text-sm">No boards yet. Create your first board!</p>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Board
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                onClick={() => router.push(`/boards/${board.id}`)}
                onDelete={(e) => handleDelete(board.id, e)}
              />
            ))}
            {/* New board button card */}
            <button
              onClick={() => setShowCreate(true)}
              className="flex h-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">New Board</span>
            </button>
          </div>
        )}
      </div>

      {/* Create Board Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Board Name</label>
              <Input
                placeholder="e.g. Product Roadmap"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                placeholder="What is this board for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createBoard.isPending}>
              {createBoard.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BoardCard({
  board,
  onClick,
  onDelete,
}: {
  board: Board;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b"];
  const color = colors[board.id.charCodeAt(0) % colors.length];

  return (
    <div
      onClick={onClick}
      className="group relative flex h-36 cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Color accent top */}
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl" style={{ backgroundColor: color }} />

      <div className="pt-2">
        <p className="font-semibold leading-tight line-clamp-1">{board.name}</p>
        {board.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{board.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: color + "20", color }}
        >
          {ROLE_CONFIG[board.myRole].label}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
              <Edit className="mr-2 h-4 w-4" />
              Open Board
            </DropdownMenuItem>
            {board.myRole === "owner" && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
