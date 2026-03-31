"use client";
import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitive.Provider;
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-4 right-4 z-[100] flex max-h-screen w-full max-w-[360px] flex-col gap-2",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & {
    variant?: "default" | "destructive" | "success";
  }
>(({ className, variant = "default", ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(
      "group pointer-events-auto relative flex w-full items-start justify-between space-x-3 overflow-hidden rounded-md border p-4 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-bottom-full",
      {
        "bg-card border-border": variant === "default",
        "bg-destructive border-destructive text-destructive-foreground": variant === "destructive",
        "bg-emerald-900 border-emerald-700 text-emerald-100": variant === "success",
      },
      className
    )}
    {...props}
  />
));
Toast.displayName = ToastPrimitive.Root.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitive.Description.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn(
      "rounded-md p-1 opacity-0 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none group-hover:opacity-100",
      className
    )}
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitive.Close>
));
ToastClose.displayName = ToastPrimitive.Close.displayName;

// Simple toast state management
type ToastData = {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
};

let toastListeners: Array<(toasts: ToastData[]) => void> = [];
let toasts: ToastData[] = [];

export function toast(data: Omit<ToastData, "id">) {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { ...data, id }];
  toastListeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    toastListeners.forEach((l) => l(toasts));
  }, 4000);
}

export function Toaster() {
  const [toastList, setToastList] = React.useState<ToastData[]>([]);

  React.useEffect(() => {
    toastListeners.push(setToastList);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setToastList);
    };
  }, []);

  return (
    <ToastProvider>
      {toastList.map((t) => (
        <Toast key={t.id} variant={t.variant} open>
          <div className="flex-1">
            <ToastTitle>{t.title}</ToastTitle>
            {t.description && <ToastDescription>{t.description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
