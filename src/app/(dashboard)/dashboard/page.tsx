"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { RevenueCard } from "@/components/dashboard/RevenueCard";
import {
  MoveInsCard,
  MoveOutsCard,
  ReservationsCard,
} from "@/components/dashboard/ActivityList";
import { CommunicationsCard } from "@/components/dashboard/CommunicationsCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { todayISO } from "@/lib/utils";
import type { DashboardData, TenantNote } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

async function fetchDashboard(date: string): Promise<DashboardData> {
  const res = await fetch(`/api/dashboard?date=${date}`);
  if (res.status === 401) {
    const body = await res.json().catch(() => ({}));
    if (body.code === "TOKEN_EXPIRED") {
      // Attempt silent refresh
      const refreshRes = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      if (!refreshRes.ok) throw new Error("SESSION_EXPIRED");
      // Retry original request
      const retry = await fetch(`/api/dashboard?date=${date}`);
      if (!retry.ok) throw new Error("SESSION_EXPIRED");
      return retry.json();
    }
    throw new Error("SESSION_EXPIRED");
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function DashboardPage() {
  const router = useRouter();
  const [date] = useState(todayISO);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["dashboard", date],
    queryFn: () => fetchDashboard(date),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Redirect to login on session expiry
  if (error?.message === "SESSION_EXPIRED") {
    router.push("/login");
    return null;
  }

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric" }
  );

  // Tenant notes come from move-ins/outs; for now we surface a placeholder
  const recentNotes: TenantNote[] = data?.recentNotes ?? [];

  return (
    <div className="flex flex-col min-h-dvh bg-slate-900">
      <Header
        date={formattedDate}
        onRefresh={handleRefresh}
        isRefreshing={isFetching}
      />

      <main className="flex-1 px-4 py-4 space-y-4 pb-8 safe-bottom">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-slate-400 text-sm">Loading dashboard…</p>
          </div>
        )}

        {error && error.message !== "SESSION_EXPIRED" && (
          <div className="rounded-2xl bg-red-900/20 border border-red-800 p-4 text-center">
            <p className="text-red-400 font-medium">Failed to load data</p>
            <p className="text-red-500 text-sm mt-1">{error.message}</p>
            <button
              onClick={handleRefresh}
              className="mt-3 text-sm text-red-300 underline"
            >
              Try again
            </button>
          </div>
        )}

        {data && (
          <>
            <RevenueCard data={data.revenue} />

            <div className="grid grid-cols-2 gap-4">
              <MoveInsCard data={data.moveIns} />
              <MoveOutsCard data={data.moveOuts} />
            </div>

            <ReservationsCard data={data.reservations} />

            <CommunicationsCard notes={recentNotes} />
          </>
        )}
      </main>
    </div>
  );
}
