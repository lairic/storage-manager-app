"use client";

import { cn, formatCurrency } from "@/lib/utils";
import type { FacilityDashboardData } from "@/lib/types";

type Metric = "revenue" | "move-ins" | "move-outs" | "reservations";

interface RollupCardProps {
  metric: Metric;
  total: number;
  isCurrency?: boolean;
  facilities: FacilityDashboardData[];
  icon: React.ReactNode;
  label: string;
  colorClass: string;
  bgClass: string;
  onClick?: () => void;
}

function getFacilityValue(f: FacilityDashboardData, metric: Metric): number {
  switch (metric) {
    case "revenue":
      return f.revenue?.creditTotal ?? 0;
    case "move-ins":
      return f.moveIns?.totalCount ?? 0;
    case "move-outs":
      return f.moveOuts?.totalCount ?? 0;
    case "reservations":
      return f.reservations?.totalCount ?? 0;
  }
}

export function RollupCard({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  metric: _,
  total,
  isCurrency = false,
  facilities,
  icon,
  label,
  colorClass,
  bgClass,
  onClick,
}: RollupCardProps) {
  const isMultiFacility = facilities.length > 1;

  return (
    <button
      onClick={onClick}
      disabled={!isMultiFacility}
      className={cn(
        "w-full rounded-2xl bg-slate-800 border border-slate-700 p-4 text-left transition-colors",
        isMultiFacility && "active:bg-slate-700"
      )}
    >
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          {label}
        </p>
        <div className={cn("p-2 rounded-xl", bgClass)}>{icon}</div>
      </div>

      <p className={cn("text-3xl font-bold mt-1", colorClass)}>
        {isCurrency ? formatCurrency(total) : total}
      </p>

      {isMultiFacility && (
        <p className="text-xs text-slate-500 mt-2">Tap for breakdown ↓</p>
      )}
    </button>
  );
}

// ── Drill-down breakdown (inline, shown when a card is expanded) ──────────────

interface BreakdownProps {
  metric: Metric;
  isCurrency?: boolean;
  facilities: FacilityDashboardData[];
  colorClass: string;
}

export function FacilityBreakdown({
  metric,
  isCurrency = false,
  facilities,
  colorClass,
}: BreakdownProps) {
  return (
    <div className="rounded-2xl bg-slate-800/60 border border-slate-700 overflow-hidden">
      {facilities.map((f, i) => {
        const value = getFacilityValue(f, metric);
        return (
          <div
            key={`${f.companyCode}/${f.facilityCode}`}
            className={cn(
              "flex items-center justify-between px-4 py-3",
              i < facilities.length - 1 && "border-b border-slate-700"
            )}
          >
            <div>
              <p className="text-sm font-medium text-slate-200">
                {f.facilityName}
              </p>
              {f.error && (
                <p className="text-xs text-red-400">{f.error}</p>
              )}
            </div>
            <span className={cn("text-sm font-bold", colorClass)}>
              {isCurrency ? formatCurrency(value) : value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
