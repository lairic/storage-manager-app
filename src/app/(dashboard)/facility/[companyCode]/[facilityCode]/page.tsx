"use client";

import { useState, useCallback, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Header } from "@/components/layout/Header";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SortableSection } from "@/components/ui/SortableSection";
import { RevenueCard } from "@/components/dashboard/RevenueCard";
import { RevenueMTDCard } from "@/components/dashboard/RevenueMTDCard";
import { OccupancyCard } from "@/components/dashboard/OccupancyCard";
import {
  MoveInsCard,
  MoveOutsCard,
  ReservationsCard,
} from "@/components/dashboard/ActivityList";
import { CommunicationsCard } from "@/components/dashboard/CommunicationsCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getCompany, getCardPrefs, setCardPrefs } from "@/lib/store";
import { todayISO, todayInTimezone, nDaysAgo, firstDayOfQuarter } from "@/lib/utils";
import type { FacilityDashboardData, CardPref, CardId } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type RevenuePeriod = "today" | "7d" | "30d" | "quarter";
type SectionId = "revenue" | "activity" | "reservations" | "communications";

const PERIOD_OPTIONS: { value: RevenuePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "quarter", label: "Quarter" },
];

const PERIOD_LABELS: Record<RevenuePeriod, string> = {
  today: "Today",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  quarter: "This Quarter",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRevenueRange(period: RevenuePeriod, date: string) {
  switch (period) {
    case "today":
      return { revenueFrom: date, revenueTo: date };
    case "7d":
      return { revenueFrom: nDaysAgo(6, date), revenueTo: date };
    case "30d":
      return { revenueFrom: nDaysAgo(29, date), revenueTo: date };
    case "quarter":
      return { revenueFrom: firstDayOfQuarter(date), revenueTo: date };
  }
}

function getSectionOrder(prefs: CardPref[]): SectionId[] {
  const ord = (id: CardId) => prefs.find((p) => p.id === id)?.order ?? 99;
  const sections: { id: SectionId; order: number }[] = [
    { id: "revenue", order: ord("revenue") },
    { id: "activity", order: Math.min(ord("move-ins"), ord("move-outs")) },
    { id: "reservations", order: ord("reservations") },
    { id: "communications", order: ord("communications") },
  ];
  return sections.sort((a, b) => a.order - b.order).map((s) => s.id);
}

function isSectionEnabled(id: SectionId, prefs: CardPref[]): boolean {
  const on = (cid: CardId) => prefs.find((p) => p.id === cid)?.enabled ?? true;
  switch (id) {
    case "revenue":       return on("revenue");
    case "activity":      return on("move-ins") || on("move-outs");
    case "reservations":  return on("reservations");
    case "communications":return on("communications");
  }
}

function applyNewSectionOrder(newOrder: SectionId[], prefs: CardPref[]): CardPref[] {
  return prefs.map((pref) => {
    const sid: SectionId =
      pref.id === "move-ins" || pref.id === "move-outs"
        ? "activity"
        : (pref.id as SectionId);
    const idx = newOrder.indexOf(sid);
    return { ...pref, order: idx >= 0 ? idx : 99 };
  });
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchFacility(
  companyCode: string,
  facilityCode: string,
  date: string,
  revenueFrom: string,
  revenueTo: string
): Promise<FacilityDashboardData> {
  const qs = new URLSearchParams({
    companyCode,
    facilityCode,
    date,
    revenueFrom,
    revenueTo,
  });
  const res = await fetch(`/api/dashboard?${qs}`);

  if (res.status === 401) {
    const body = await res
      .json()
      .catch(() => ({})) as { code?: string; companyCode?: string };
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

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ companyCode: string; facilityCode: string }>;
}

export default function FacilityPage({ params }: PageProps) {
  const { companyCode, facilityCode } = use(params);
  const router = useRouter();
  const [date] = useState(() => {
    const tzId = getCompany(companyCode)?.facilities.find(
      (f) => f.facilityCode === facilityCode
    )?.timeZoneId;
    return tzId ? todayInTimezone(tzId) : todayISO();
  });
  const [facilityName, setFacilityName] = useState(facilityCode);
  const [companyName, setCompanyName] = useState("");
  const [prefs, setPrefsState] = useState<CardPref[]>(() =>
    getCardPrefs(companyCode, facilityCode)
  );
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>("today");

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

  const { revenueFrom, revenueTo } = getRevenueRange(revenuePeriod, date);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["facility", companyCode, facilityCode, date, revenueFrom, revenueTo],
    queryFn: () =>
      fetchFacility(companyCode, facilityCode, date, revenueFrom, revenueTo),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const handleRefresh = useCallback(() => void refetch(), [refetch]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ordered = getSectionOrder(prefs).filter((id) =>
      isSectionEnabled(id, prefs)
    );
    const oldIdx = ordered.indexOf(active.id as SectionId);
    const newIdx = ordered.indexOf(over.id as SectionId);
    if (oldIdx === -1 || newIdx === -1) return;
    const newOrder = arrayMove(ordered, oldIdx, newIdx);
    const newPrefs = applyNewSectionOrder(newOrder, prefs);
    setPrefsState(newPrefs);
    setCardPrefs(companyCode, facilityCode, newPrefs);
  }

  if (error?.message === "SESSION_EXPIRED") {
    router.replace("/setup");
    return null;
  }

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric" }
  );

  const sectionOrder = getSectionOrder(prefs);
  const enabledSections = sectionOrder.filter((id) =>
    isSectionEnabled(id, prefs)
  );
  const isEnabled = (id: CardId) =>
    prefs.find((p) => p.id === id)?.enabled ?? true;

  function renderSection(sectionId: SectionId) {
    switch (sectionId) {
      case "revenue":
        return (
          <div className="grid grid-cols-2 gap-3">
            <RevenueCard
              data={data?.revenue}
              label={PERIOD_LABELS[revenuePeriod]}
            />
            <RevenueMTDCard
              dataMTD={data?.revenueMTD}
              dataMTDPrevMonth={data?.revenueMTDPrevMonth}
            />
          </div>
        );
      case "activity":
        return (
          <div className="grid grid-cols-2 gap-3">
            {isEnabled("move-ins") && <MoveInsCard data={data?.moveIns} />}
            {isEnabled("move-outs") && <MoveOutsCard data={data?.moveOuts} />}
          </div>
        );
      case "reservations":
        return <ReservationsCard data={data?.reservations} />;
      case "communications":
        return <CommunicationsCard notes={[]} />;
    }
  }

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 dark:bg-slate-900">
      <Header
        title={facilityName}
        subtitle={
          companyName ? `${companyName} · ${formattedDate}` : formattedDate
        }
        showBack
        onRefresh={handleRefresh}
        isRefreshing={isFetching}
      />

      <main className="flex-1 px-4 pt-4 pb-8 safe-bottom">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-slate-400 text-sm">Loading…</p>
          </div>
        )}

        {error && error.message !== "SESSION_EXPIRED" && (
          <div className="rounded-2xl bg-red-900/20 border border-red-800 p-4 text-center">
            <p className="text-red-400 font-medium">Failed to load data</p>
            <p className="text-red-500 text-sm mt-1 break-words">
              {error.message}
            </p>
            <button
              onClick={handleRefresh}
              className="mt-3 text-sm text-red-300 underline"
            >
              Try again
            </button>
          </div>
        )}

        {data && (
          <div className="space-y-3">
            <SegmentedControl
              options={PERIOD_OPTIONS}
              value={revenuePeriod}
              onChange={setRevenuePeriod}
            />

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={enabledSections}
                strategy={verticalListSortingStrategy}
              >
                {enabledSections.map((sectionId) => (
                  <SortableSection key={sectionId} id={sectionId}>
                    {renderSection(sectionId)}
                  </SortableSection>
                ))}
              </SortableContext>
            </DndContext>

            <OccupancyCard data={data.occupancy} />
          </div>
        )}
      </main>
    </div>
  );
}
