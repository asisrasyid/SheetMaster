"use client";
import { useState } from "react";
import { ShieldCheck, X, Loader2 } from "lucide-react";
import { Task, Column } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiMoveTask } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import { useQueryClient } from "@tanstack/react-query";

interface ApprovalRequestModalProps {
  task: Task;
  toColumn: Column;
  boardId: string;
  onClose: () => void;
}

export function ApprovalRequestModal({ task, toColumn, boardId, onClose }: ApprovalRequestModalProps) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  async function handleSubmit() {
    setLoading(true);
    try {
      // Call moveTask — backend will detect requiresApproval and create approval record instead
      await apiMoveTask(task.id, toColumn.id, 0);
      toast({ title: "Approval requested", description: "Your request has been sent to approvers.", variant: "success" });
      qc.invalidateQueries({ queryKey: ["board", boardId] });
      onClose();
    } catch (err: unknown) {
      toast({ title: "Failed to request approval", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">Approval Required</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Moving{" "}
              <span className="font-medium text-foreground">"{task.title}"</span>{" "}
              to{" "}
              <span className="font-medium" style={{ color: toColumn.color }}>
                {toColumn.name}
              </span>{" "}
              requires approval from an approver.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <label className="text-sm font-medium">Note (optional)</label>
          <Textarea
            placeholder="Explain why this task is ready to move…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Request Approval
          </Button>
        </div>
      </div>
    </div>
  );
}
