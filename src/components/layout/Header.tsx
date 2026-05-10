"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Settings, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showSettings?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Header({
  title,
  subtitle,
  showBack = false,
  showSettings = true,
  onRefresh,
  isRefreshing = false,
}: Props) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-2 safe-top">
      {showBack && (
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
      )}

      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Toggle theme"
        >
          {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        )}

        {showSettings && (
          <button
            onClick={() => router.push("/settings")}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        )}
      </div>
    </header>
  );
}
