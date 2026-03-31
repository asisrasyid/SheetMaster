"use client";
import { Topbar } from "@/components/layout/Topbar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getStoredUser } from "@/lib/auth";
import { ROLE_CONFIG } from "@/lib/utils";

export default function ProfilePage() {
  const user = getStoredUser();
  if (!user) return null;

  return (
    <>
      <Topbar title="Profile" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-md mx-auto rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback
                className="text-xl font-bold"
                style={{ backgroundColor: user.avatarColor + "33", color: user.avatarColor }}
              >
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
              <span className={`text-sm font-medium ${ROLE_CONFIG[user.roleGlobal].color}`}>
                {ROLE_CONFIG[user.roleGlobal].label}
              </span>
            </div>
          </div>
          <div className="mt-6 text-xs text-muted-foreground">
            <p>Account created: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}</p>
          </div>
        </div>
      </div>
    </>
  );
}
