"use client";

import { Card } from "@/components/ui/Card";
import type { OccupancyData } from "@/lib/types";

function DonutChart({ occupied, total }: { occupied: number; total: number }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const filled = total > 0 ? (occupied / total) * circ : 0;
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke="#1e293b"
          strokeWidth="14"
        />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke="#22c55e"
          strokeWidth="14"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{pct}%</span>
      </div>
    </div>
  );
}

export function OccupancyCard({ data }: { data: OccupancyData | undefined }) {
  if (!data) return null;

  const { occupied, vacant, total } = data;
  const vacancyPct = total > 0 ? Math.round((vacant / total) * 100) : 0;

  return (
    <Card>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
        Occupancy
      </p>
      <div className="flex items-center gap-4">
        <DonutChart occupied={occupied} total={total} />

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
              <span className="text-sm text-slate-300">Occupied</span>
            </div>
            <span className="text-sm font-semibold text-white tabular-nums">
              {occupied.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600 flex-shrink-0" />
              <span className="text-sm text-slate-300">Vacant</span>
            </div>
            <span className="text-sm font-semibold text-white tabular-nums">
              {vacant.toLocaleString()}
            </span>
          </div>
          <div className="pt-1 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Total units</span>
              <span className="text-xs text-slate-400 tabular-nums">{total.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Vacancy rate</span>
              <span className="text-xs text-slate-400 tabular-nums">{vacancyPct}%</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
