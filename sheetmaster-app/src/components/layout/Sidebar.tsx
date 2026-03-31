"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  ShieldCheck,
  User,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { cn, ROLE_CONFIG } from "@/lib/utils";
import { clearSession, getStoredUser } from "@/lib/auth";
import { apiLogout } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useApprovals } from "@/hooks/useApprovals";
import { canApprove } from "@/lib/utils";

const navItems = [
  { href: "/boards", label: "Boards", icon: LayoutDashboard },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck, needsApprover: true },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getStoredUser();
  const { data: approvals } = useApprovals();
  const pendingCount = approvals?.length ?? 0;

  async function handleLogout() {
    try {
      await apiLogout();
    } catch {}
    clearSession();
    router.push("/login");
  }

  if (!user) return null;

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-5 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
          <CheckSquare className="h-4 w-4 text-primary" />
        </div>
        <span className="font-bold text-foreground text-lg tracking-tight">SheetMaster</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map((item) => {
          if (item.needsApprover && !canApprove(user.roleGlobal)) return null;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.needsApprover && pendingCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors">
          <Avatar className="h-8 w-8">
            <AvatarFallback style={{ backgroundColor: user.avatarColor + "33", color: user.avatarColor }}>
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className={cn("text-xs", ROLE_CONFIG[user.roleGlobal].color)}>
              {ROLE_CONFIG[user.roleGlobal].label}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
