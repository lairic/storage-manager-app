"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, LogIn, LogOut, Calendar } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { RevenueCard } from "@/components/dashboard/RevenueCard";
import { RevenueMTDCard } from "@/components/dashboard/RevenueMTDCard";
import { RollupCard, FacilityBreakdown } from "@/components/dashboard/RollupCard";
import { MoveInsCard, MoveOutsCard, ReservationsCard } from "@/components/dashboard/ActivityList";
import { OccupancyCard } from "@/components/dashboard/OccupancyCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getCompanies } from "@/lib/store";
import { todayISO } from "@/lib/utils";
import type { RollupResponse, StoredCompany } from "@/lib/types";

type ExpandedCard = "revenue" | "move-ins" | "move-outs" | "reservations" | null;

async function fetchRollup(
  companies: StoredCompany[],
  date: string
): Promise<RollupResponse> {
  const targets = companies.flatMap((c) =>
    c.facilities.map((f) => ({
      companyCode: c.companyCode,
      facilityCode: f.facilityCode,
      facilityName: f.name,
    }))
  );

  const res = await fetch("/api/rollup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, targets }),
  });

  if (res.status === 401) {
    const body = await res.json().catch(() => ({})) as { code?: string; companyCode?: string };
    if (body.code === "TOKEN_EXPIRED" && body.companyCode) {
      const refresh = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh", companyCode: body.companyCode }),
      });
      if (!refresh.ok) throw new Error("SESSION_EXPIRED");
      const retry = await fetch("/api/rollup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, targets }),
      });
      if (!retry.ok) throw new Error("SESSION_EXPIRED");
      return retry.json();
    }
    throw new Error("SESSION_EXPIRED");
  }

  if (!res.ok) throw new Error(await res.text().catch(() => "API error"));
  return res.json();
}

export default function DashboardPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<StoredCompany[]>([]);
  const [date] = useState(todayISO);
  const [expanded, setExpanded] = useState<ExpandedCard>(null);

  useEffect(() => {
    const loaded = getCompanies();
    if (loaded.length === 0) {
      router.replace("/setup");
      return;
    }
    setCompanies(loaded);
  }, [router]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["rollup", date, companies.map((c) => c.companyCode).join(",")],
    queryFn: () => fetchRollup(companies, date),
    enabled: companies.length > 0,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const handleRefresh = useCallback(() => void refetch(), [refetch]);

  const toggleCard = (card: ExpandedCard) =>
    setExpanded((prev) => (prev === card ? null : card));

  if (error?.message === "SESSION_EXPIRED") {
    router.replace("/setup");
    return null;
  }

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric" }
  );

  const isMultiFacility = (data?.facilities.length ?? 0) > 1;
  const summary = data?.summary;

  return (
    <div className="flex flex-col min-h-dvh bg-slate-900">
      <Header
        title="Dashboard"
        subtitle={formattedDate}
        onRefresh={handleRefresh}
        isRefreshing={isFetching}
      />

      <main className="flex-1 px-4 py-4 space-y-3 pb-8 safe-bottom">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-slate-400 text-sm">Loading dashboard…</p>
          </div>
        )}

        {error && error.message !== "SESSION_EXPIRED" && (
          <div className="rounded-2xl bg-red-900/20 border border-red-800 p-4 text-center">
            <p className="text-red-400 font-medium">Failed to load data</p>
            <p className="text-red-500 text-sm mt-1 break-words">{error.message}</p>
            <button onClick={handleRefresh} className="mt-3 text-sm text-red-300 underline">
              Try again
            </button>
          </div>
        )}

        {data && (
          <>
            {!isMultiFacility ? (
              /* ── Single facility: full detail cards ── */
              <>
                <div className="grid grid-cols-2 gap-3">
                  <RevenueCard data={data.facilities[0]?.revenue} />
                  <RevenueMTDCard
                    dataMTD={data.facilities[0]?.revenueMTD}
                    dataMTDPrevMonth={data.facilities[0]?.revenueMTDPrevMonth}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MoveInsCard data={data.facilities[0]?.moveIns} />
                  <MoveOutsCard data={data.facilities[0]?.moveOuts} />
                </div>
                <ReservationsCard data={data.facilities[0]?.reservations} />
                <OccupancyCard data={data.facilities[0]?.occupancy} />
              </>
            ) : (
              /* ── Multi-facility: rollup cards with drill-down ── */
              <>
                <RollupCard
                  metric="revenue"
                  total={summary?.creditTotal ?? 0}
                  isCurrency
                  facilities={data.facilities}
                  icon={<DollarSign size={18} className="text-green-400" />}
                  label="Revenue Today"
                  colorClass="text-green-400"
                  bgClass="bg-green-900/40"
                  onClick={() => toggleCard("revenue")}
                />
                {expanded === "revenue" && (
                  <FacilityBreakdown
                    metric="revenue"
                    isCurrency
                    facilities={data.facilities}
                    colorClass="text-green-400"
                  />
                )}

                <div className="grid grid-cols-2 gap-3">
                  <RollupCard
                    metric="move-ins"
                    total={summary?.totalMoveIns ?? 0}
                    facilities={data.facilities}
                    icon={<LogIn size={18} className="text-blue-400" />}
                    label="Move-Ins"
                    colorClass="text-blue-400"
                    bgClass="bg-blue-900/40"
                    onClick={() => toggleCard("move-ins")}
                  />
                  <RollupCard
                    metric="move-outs"
                    total={summary?.totalMoveOuts ?? 0}
                    facilities={data.facilities}
                    icon={<LogOut size={18} className="text-orange-400" />}
                    label="Move-Outs"
                    colorClass="text-orange-400"
                    bgClass="bg-orange-900/40"
                    onClick={() => toggleCard("move-outs")}
                  />
                </div>
                {expanded === "move-ins" && (
                  <FacilityBreakdown metric="move-ins" facilities={data.facilities} colorClass="text-blue-400" />
                )}
                {expanded === "move-outs" && (
                  <FacilityBreakdown metric="move-outs" facilities={data.facilities} colorClass="text-orange-400" />
                )}

                <RollupCard
                  metric="reservations"
                  total={summary?.totalReservations ?? 0}
                  facilities={data.facilities}
                  icon={<Calendar size={18} className="text-purple-400" />}
                  label="Active Reservations"
                  colorClass="text-purple-400"
                  bgClass="bg-purple-900/40"
                  onClick={() => toggleCard("reservations")}
                />
                {expanded === "reservations" && (
                  <FacilityBreakdown metric="reservations" facilities={data.facilities} colorClass="text-purple-400" />
                )}

                <div className="pt-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Facilities
                  </p>
                  <div className="space-y-2">
                    {data.facilities.map((f) => (
                      <button
                        key={`${f.companyCode}/${f.facilityCode}`}
                        onClick={() => router.push(`/facility/${f.companyCode}/${f.facilityCode}`)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-left"
                      >
                        <p className="text-sm font-medium text-slate-200">{f.facilityName}</p>
                        <span className="text-xs text-slate-500">View detail →</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
