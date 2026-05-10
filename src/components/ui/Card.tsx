"use client";

import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
