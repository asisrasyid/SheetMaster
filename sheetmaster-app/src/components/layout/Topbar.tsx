"use client";
import { ReactNode } from "react";

interface TopbarProps {
  title: string;
  actions?: ReactNode;
}

export function Topbar({ title, actions }: TopbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 shrink-0">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
