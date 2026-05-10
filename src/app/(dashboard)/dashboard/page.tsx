"use client";

import { useState, useCallback, useEffect } from "react";
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
import { DollarSign, LogIn, LogOut, Calendar } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SortableSection } from "@/components/ui/SortableSection";
import { RevenueCard } from "@/components/dashboard/RevenueCard";
import { RevenueMTDCard } from "@/components/dashboard/RevenueMTDCard";
import { RollupCard, FacilityBreakdown } from "@/components/dashboard/RollupCard";
import { MoveInsCard, MoveOutsCard, ReservationsCard } from "@/components/dashboard/ActivityList";
import { OccupancyCard } from "@/components/dashboard/OccupancyCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getCompanies, getCardPrefs, setCardPrefs, DEFAULT_CARDS } from "@/lib/store";
import { todayISO, todayInTimezone, nDaysAgo, firstDayOfQuarter } from "@/lib/utils";
import type { RollupResponse, StoredCompany, CardPref, CardId } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type RevenuePeriod = "today" | "7d" | "30d" | "quarter";
type SectionId = "revenue" | "activity" | "reservations" | "communications";
type ExpandedCard = "revenue" | "move-ins" | "move-outs" | "reservations" | null;

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
    case "revenue":        return on("revenue");
    case "activity":       return on("move-ins") || on("move-outs");
    case "reservations":   return on("reservations");
    case "communications": return on("communications");
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

async function fetchRollup(
  companies: StoredCompany[],
  date: string,
  revenueFrom: string,
  revenueTo: string
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
    body: JSON.stringify({ date, targets, revenueFrom, revenueTo }),
  });

  if (res.status === 401) {
    const body = await res
      .json()
      .catch(() => ({})) as { code?: string; companyCode?: string };
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
        body: JSON.stringify({ date, targets, revenueFrom, revenueTo }),
      });
      if (!retry.ok) throw new Error("SESSION_EXPIRED");
      return retry.json();
    }
    throw new Error("SESSION_EXPIRED");
  }

  if (!res.ok) throw new Error(await res.text().catch(() => "API error"));
  return res.json();
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<StoredCompany[]>([]);
  const [date] = useState(() => {
    const loaded = getCompanies();
    const tzId = loaded[0]?.facilities[0]?.timeZoneId;
    return tzId ? todayInTimezone(tzId) : todayISO();
  });
  const [expanded, setExpanded] = useState<ExpandedCard>(null);
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>("today");
  const [prefs, setPrefsState] = useState<CardPref[]>([...DEFAULT_CARDS]);

  useEffect(() => {
    const loaded = getCompanies();
    if (loaded.length === 0) {
      router.replace("/setup");
      return;
    }
    setCompanies(loaded);
    // Load prefs for single-facility view (uses first company/facility)
    if (loaded.length === 1 && loaded[0].facilities.length === 1) {
      setPrefsState(
        getCardPrefs(loaded[0].companyCode, loaded[0].facilities[0].facilityCode)
      );
    }
  }, [router]);

  const { revenueFrom, revenueTo } = getRevenueRange(revenuePeriod, date);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [
      "rollup",
      date,
      companies.map((c) => c.companyCode).join(","),
      revenueFrom,
      revenueTo,
    ],
    queryFn: () => fetchRollup(companies, date, revenueFrom, revenueTo),
    enabled: companies.length > 0,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const handleRefresh = useCallback(() => void refetch(), [refetch]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    if (!companies[0] || isMultiFacility) return;
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
    setCardPrefs(
      companies[0].companyCode,
      companies[0].facilities[0].facilityCode,
      newPrefs
    );
  }

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
  const facility0 = data?.facilities[0];

  const sectionOrder = getSectionOrder(prefs);
  const enabledSections = sectionOrder.filter((id) =>
    isSectionEnabled(id, prefs)
  );
  const isEnabled = (id: CardId) =>
    prefs.find((p) => p.id === id)?.enabled ?? true;

  function renderSingleSection(sectionId: SectionId) {
    switch (sectionId) {
      case "revenue":
        return (
          <div className="grid grid-cols-2 gap-3">
            <RevenueCard
              data={facility0?.revenue}
              label={PERIOD_LABELS[revenuePeriod]}
            />
            <RevenueMTDCard
              dataMTD={facility0?.revenueMTD}
              dataMTDPrevMonth={facility0?.revenueMTDPrevMonth}
            />
          </div>
        );
      case "activity":
        return (
          <div className="grid grid-cols-2 gap-3">
            {isEnabled("move-ins") && <MoveInsCard data={facility0?.moveIns} />}
            {isEnabled("move-outs") && <MoveOutsCard data={facility0?.moveOuts} />}
          </div>
        );
      case "reservations":
        return <ReservationsCard data={facility0?.reservations} />;
      case "communications":
        return null;
    }
  }

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 dark:bg-slate-900">
      <Header
        title="Dashboard"
        subtitle={formattedDate}
        onRefresh={handleRefresh}
        isRefreshing={isFetching}
      />

      <main className="flex-1 px-4 py-4 pb-8 safe-bottom">
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
            {!isMultiFacility ? (
              /* ── Single facility: full detail cards with drag-and-drop ── */
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
                    {enabledSections.map((sectionId) => {
                      const content = renderSingleSection(sectionId);
                      if (!content) return null;
                      return (
                        <SortableSection key={sectionId} id={sectionId}>
                          {content}
                        </SortableSection>
                      );
                    })}
                  </SortableContext>
                </DndContext>

                <OccupancyCard data={facility0?.occupancy} />
              </div>
            ) : (
              /* ── Multi-facility: rollup cards with drill-down ── */
              <div className="space-y-3">
                <SegmentedControl
                  options={PERIOD_OPTIONS}
                  value={revenuePeriod}
                  onChange={setRevenuePeriod}
                />

                <RollupCard
                  metric="revenue"
                  total={summary?.creditTotal ?? 0}
                  isCurrency
                  facilities={data.facilities}
                  icon={<DollarSign size={18} className="text-green-400" />}
                  label={`Revenue — ${PERIOD_LABELS[revenuePeriod]}`}
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
                  <FacilityBreakdown
                    metric="move-ins"
                    facilities={data.facilities}
                    colorClass="text-blue-400"
                  />
                )}
                {expanded === "move-outs" && (
                  <FacilityBreakdown
                    metric="move-outs"
                    facilities={data.facilities}
                    colorClass="text-orange-400"
                  />
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
                  <FacilityBreakdown
                    metric="reservations"
                    facilities={data.facilities}
                    colorClass="text-purple-400"
                  />
                )}

                <div className="pt-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Facilities
                  </p>
                  <div className="space-y-2">
                    {data.facilities.map((f) => (
                      <button
                        key={`${f.companyCode}/${f.facilityCode}`}
                        onClick={() =>
                          router.push(
                            `/facility/${f.companyCode}/${f.facilityCode}`
                          )
                        }
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left"
                      >
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {f.facilityName}
                        </p>
                        <span className="text-xs text-slate-400">View detail →</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
