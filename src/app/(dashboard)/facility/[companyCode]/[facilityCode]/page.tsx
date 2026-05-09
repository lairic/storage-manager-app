"use client";

import { useState, useCallback, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { RevenueCard } from "@/components/dashboard/RevenueCard";
import {
  MoveInsCard,
  MoveOutsCard,
  ReservationsCard,
} from "@/components/dashboard/ActivityList";
import { CommunicationsCard } from "@/components/dashboard/CommunicationsCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getCompany, getCardPrefs } from "@/lib/store";
import { todayISO } from "@/lib/utils";
import type { FacilityDashboardData } from "@/lib/types";

async function fetchFacility(
  companyCode: string,
  facilityCode: string,
  date: string
): Promise<FacilityDashboardData> {
  const qs = new URLSearchParams({ companyCode, facilityCode, date });
  const res = await fetch(`/api/dashboard?${qs}`);

  if (res.status === 401) {
    const body = await res.json().catch(() => ({})) as { code?: string; companyCode?: string };
    if (body.code === "TOKEN_EXPIRED") {
      const refresh = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh", companyCode }),
      });
      if (!refresh.ok) throw new Error("SESSION_EXPIRED");
      const retry = await fetch(`/api/dashboard?${qs}`);
      if (!retry.ok) throw new Error("SESSION_EXPIRED");
      return retry.json();
    }
    throw new Error("SESSION_EXPIRED");
  }

  if (!res.ok) throw new Error(await res.text().catch(() => "API error"));
  return res.json();
}

interface PageProps {
  params: Promise<{ companyCode: string; facilityCode: string }>;
}

export default function FacilityPage({ params }: PageProps) {
  const { companyCode, facilityCode } = use(params);
  const router = useRouter();
  const [date] = useState(todayISO);
  const [facilityName, setFacilityName] = useState(facilityCode);
  const [companyName, setCompanyName] = useState("");
  const cardPrefs = getCardPrefs(companyCode, facilityCode);

  useEffect(() => {
    const company = getCompany(companyCode);
    if (company) {
      setCompanyName(company.name);
      const facility = company.facilities.find(
        (f) => f.facilityCode === facilityCode
      );
      if (facility) setFacilityName(facility.name);
    }
  }, [companyCode, facilityCode]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["facility", companyCode, facilityCode, date],
    queryFn: () => fetchFacility(companyCode, facilityCode, date),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const handleRefresh = useCallback(() => void refetch(), [refetch]);

  if (error?.message === "SESSION_EXPIRED") {
    router.replace("/setup");
    return null;
  }

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric" }
  );

  const enabledCards = cardPrefs
    .filter((p) => p.enabled)
    .sort((a, b) => a.order - b.order)
    .map((p) => p.id);

  return (
    <div className="flex flex-col min-h-dvh bg-slate-900">
      <Header
        title={facilityName}
        subtitle={companyName ? `${companyName} · ${formattedDate}` : formattedDate}
        showBack
        onRefresh={handleRefresh}
        isRefreshing={isFetching}
      />

      <main className="flex-1 px-4 py-4 space-y-4 pb-8 safe-bottom">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-slate-400 text-sm">Loading…</p>
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
            {enabledCards.includes("revenue") && (
              <RevenueCard
                data={data.revenue}
                dataMTD={data.revenueMTD}
                dataPrevDay={data.revenuePrevDay}
              />
            )}

            {(enabledCards.includes("move-ins") || enabledCards.includes("move-outs")) && (
              <div className="grid grid-cols-2 gap-4">
                {enabledCards.includes("move-ins") && (
                  <MoveInsCard data={data.moveIns} />
                )}
                {enabledCards.includes("move-outs") && (
                  <MoveOutsCard data={data.moveOuts} />
                )}
              </div>
            )}

            {enabledCards.includes("reservations") && (
              <ReservationsCard data={data.reservations} />
            )}

            {enabledCards.includes("communications") && (
              <CommunicationsCard notes={[]} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
