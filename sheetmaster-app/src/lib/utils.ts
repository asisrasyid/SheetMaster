import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Priority, Role } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string; borderColor: string; bgColor: string }
> = {
  low: {
    label: "Low",
    color: "text-slate-400",
    borderColor: "border-l-slate-400",
    bgColor: "bg-slate-400/10",
  },
  medium: {
    label: "Medium",
    color: "text-blue-400",
    borderColor: "border-l-blue-400",
    bgColor: "bg-blue-400/10",
  },
  high: {
    label: "High",
    color: "text-amber-400",
    borderColor: "border-l-amber-400",
    bgColor: "bg-amber-400/10",
  },
  urgent: {
    label: "Urgent",
    color: "text-red-400",
    borderColor: "border-l-red-400",
    bgColor: "bg-red-400/10",
  },
};

export const ROLE_CONFIG: Record<Role, { label: string; color: string }> = {
  owner: { label: "Owner", color: "text-purple-400" },
  approver: { label: "Approver", color: "text-blue-400" },
  contributor: { label: "Contributor", color: "text-green-400" },
  viewer: { label: "Viewer", color: "text-slate-400" },
};

export const COLUMN_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ef4444", // red
  "#64748b", // slate
];

export const LABEL_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
  "#f97316",
  "#84cc16",
];

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch {
    return dateStr;
  }
}

export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export function canEdit(role: Role): boolean {
  return role === "owner" || role === "approver" || role === "contributor";
}

export function canManageColumns(role: Role): boolean {
  return role === "owner" || role === "approver";
}

export function canApprove(role: Role): boolean {
  return role === "owner" || role === "approver";
}

export function canManageMembers(role: Role): boolean {
  return role === "owner";
}
