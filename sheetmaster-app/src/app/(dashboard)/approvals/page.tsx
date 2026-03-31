"use client";
import { useState } from "react";
import { ShieldCheck, CheckCircle, XCircle, Clock, Loader2, ChevronRight } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useApprovals, useApproveTask, useRejectTask } from "@/hooks/useApprovals";
import { Approval } from "@/types";
import { toast } from "@/components/ui/toaster";
import { formatDate } from "@/lib/utils";

export default function ApprovalsPage() {
  const { data: approvals, isLoading } = useApprovals();
  const approveTask = useApproveTask();
  const rejectTask = useRejectTask();

  const [rejectModal, setRejectModal] = useState<Approval | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  async function handleApprove(approval: Approval) {
    try {
      await approveTask.mutateAsync(approval.id);
      toast({ title: "Task approved", description: `"${approval.taskTitle}" moved to ${approval.toColumnName}`, variant: "success" });
    } catch (err: unknown) {
      toast({ title: "Failed to approve", variant: "destructive" });
    }
  }

  async function handleReject() {
    if (!rejectModal) return;
    try {
      await rejectTask.mutateAsync({ approvalId: rejectModal.id, note: rejectNote });
      toast({ title: "Task rejected", description: rejectNote || undefined });
      setRejectModal(null);
      setRejectNote("");
    } catch {
      toast({ title: "Failed to reject", variant: "destructive" });
    }
  }

  const pending = approvals?.filter((a) => a.status === "pending") ?? [];

  return (
    <>
      <Topbar title="Approvals" />
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pending.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
            <CheckCircle className="h-12 w-12 opacity-30" />
            <p className="text-sm">No pending approvals. All caught up!</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground mb-4">
              {pending.length} pending approval{pending.length !== 1 ? "s" : ""}
            </p>
            {pending.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                onApprove={() => handleApprove(approval)}
                onReject={() => setRejectModal(approval)}
                approving={approveTask.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reject modal */}
      <Dialog open={!!rejectModal} onOpenChange={() => setRejectModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Task Movement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {rejectModal && (
              <p className="text-sm text-muted-foreground">
                Rejecting move of{" "}
                <span className="font-medium text-foreground">"{rejectModal.taskTitle}"</span>{" "}
                to <span className="font-medium text-foreground">{rejectModal.toColumnName}</span>.
              </p>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                placeholder="Explain why this move is rejected…"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectTask.isPending}>
              {rejectTask.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ApprovalCard({
  approval,
  onApprove,
  onReject,
  approving,
}: {
  approval: Approval;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
          <Clock className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{approval.taskTitle}</p>
          <p className="text-xs text-muted-foreground">
            {approval.boardName} · Requested by {approval.requestedByName} · {formatDate(approval.createdAt)}
          </p>
        </div>
      </div>

      {/* Move path */}
      <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
        <span className="text-muted-foreground">{approval.fromColumnName}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        <span className="font-medium text-amber-400">{approval.toColumnName}</span>
        <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={onReject} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
          <XCircle className="h-4 w-4" />
          Reject
        </Button>
        <Button size="sm" onClick={onApprove} disabled={approving} className="gap-1.5">
          {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          Approve
        </Button>
      </div>
    </div>
  );
}
