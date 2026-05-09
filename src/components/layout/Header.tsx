"use client";

import { useRouter } from "next/navigation";
import { LogOut, RefreshCw } from "lucide-react";

interface Props {
  facilityName?: string;
  date: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function Header({ facilityName, date, onRefresh, isRefreshing }: Props) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between safe-top">
      <div>
        <h1 className="text-lg font-bold text-white leading-tight">
          {facilityName ?? "Storage Manager"}
        </h1>
        <p className="text-xs text-slate-400">{date}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
          aria-label="Refresh"
        >
          <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
        </button>

        <button
          onClick={handleLogout}
          className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
          aria-label="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
