"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, ChevronDown, Loader2, UserX } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useBoard } from "@/hooks/useBoard";
import { Role, BoardMember } from "@/types";
import { ROLE_CONFIG, canManageMembers } from "@/lib/utils";
import {
  apiAddBoardMember,
  apiUpdateBoardMember,
  apiRemoveBoardMember,
} from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toaster";
import Link from "next/link";

const ROLES: Role[] = ["owner", "approver", "contributor", "viewer"];

interface SettingsPageProps {
  params: Promise<{ id: string }>;
}

export default function BoardSettingsPage({ params }: SettingsPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: boardData, isLoading } = useBoard(id);
  const qc = useQueryClient();

  const [showAddMember, setShowAddMember] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<Role>("contributor");
  const [adding, setAdding] = useState(false);

  async function handleAddMember() {
    if (!newUsername.trim()) return;
    setAdding(true);
    try {
      await apiAddBoardMember(id, newUsername.trim(), newRole);
      qc.invalidateQueries({ queryKey: ["board", id] });
      toast({ title: "Member added", variant: "success" });
      setShowAddMember(false);
      setNewUsername("");
    } catch (err: unknown) {
      toast({ title: "Failed to add member", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdateRole(userId: string, role: Role) {
    try {
      await apiUpdateBoardMember(id, userId, role);
      qc.invalidateQueries({ queryKey: ["board", id] });
      toast({ title: "Role updated", variant: "success" });
    } catch {
      toast({ title: "Failed to update role", variant: "destructive" });
    }
  }

  async function handleRemoveMember(member: BoardMember) {
    if (!confirm(`Remove ${member.name} from this board?`)) return;
    try {
      await apiRemoveBoardMember(id, member.userId);
      qc.invalidateQueries({ queryKey: ["board", id] });
      toast({ title: "Member removed" });
    } catch {
      toast({ title: "Failed to remove member", variant: "destructive" });
    }
  }

  const myRole = boardData?.board.myRole ?? "viewer";
  const canManage = canManageMembers(myRole);

  return (
    <>
      <Topbar
        title="Board Settings"
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link href={`/boards/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Board
            </Link>
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Board info */}
          {boardData && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-1">
              <h3 className="font-semibold">{boardData.board.name}</h3>
              {boardData.board.description && (
                <p className="text-sm text-muted-foreground">{boardData.board.description}</p>
              )}
            </div>
          )}

          {/* Members */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h3 className="font-semibold">Members</h3>
              {canManage && (
                <Button size="sm" onClick={() => setShowAddMember(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              )}
            </div>
            {isLoading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {boardData?.members.map((member) => (
                  <div key={member.userId} className="flex items-center gap-3 px-5 py-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback style={{ backgroundColor: member.avatarColor + "33", color: member.avatarColor }}>
                        {member.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground">@{member.username}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          disabled={!canManage}
                          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${ROLE_CONFIG[member.role].color} ${canManage ? "hover:bg-accent cursor-pointer" : "cursor-default"} transition-colors`}
                        >
                          {ROLE_CONFIG[member.role].label}
                          {canManage && <ChevronDown className="h-3 w-3" />}
                        </button>
                      </DropdownMenuTrigger>
                      {canManage && (
                        <DropdownMenuContent align="end">
                          {ROLES.map((r) => (
                            <DropdownMenuItem
                              key={r}
                              onClick={() => handleUpdateRole(member.userId, r)}
                              className={member.role === r ? "bg-accent" : ""}
                            >
                              <span className={ROLE_CONFIG[r].color}>{ROLE_CONFIG[r].label}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      )}
                    </DropdownMenu>
                    {canManage && (
                      <button
                        onClick={() => handleRemoveMember(member)}
                        className="rounded-md p-1.5 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Username</label>
              <Input
                autoFocus
                placeholder="username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-full items-center justify-between rounded-md border border-input px-3 py-2 text-sm hover:bg-accent transition-colors">
                    <span className={ROLE_CONFIG[newRole].color}>{ROLE_CONFIG[newRole].label}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  {ROLES.map((r) => (
                    <DropdownMenuItem key={r} onClick={() => setNewRole(r)}>
                      <span className={ROLE_CONFIG[r].color}>{ROLE_CONFIG[r].label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={!newUsername.trim() || adding}>
              {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
