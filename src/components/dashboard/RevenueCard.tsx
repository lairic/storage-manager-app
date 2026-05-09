"use client";

import { DollarSign, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import type { JournalEntriesReport } from "@/lib/types";

interface Props {
  data: JournalEntriesReport | undefined;
  dataMTD: JournalEntriesReport | undefined;
  dataPrevDay: JournalEntriesReport | undefined;
}

export function RevenueCard({ data, dataMTD, dataPrevDay }: Props) {
  const todayTotal = data?.creditTotal ?? 0;
  const mtdTotal = dataMTD?.creditTotal ?? 0;
  const prevDayTotal = dataPrevDay?.creditTotal ?? 0;

  const delta = todayTotal - prevDayTotal;
  const pct =
    prevDayTotal > 0 ? Math.round((delta / prevDayTotal) * 100) : null;

  const entries = (data?.journalEntries ?? []).filter((e) => e.credit > 0);

  return (
    <Card>
      {/* Today total + trend */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Revenue Today
          </p>
          <p className="text-3xl font-bold text-white mt-1">
            {formatCurrency(todayTotal)}
          </p>

          {prevDayTotal > 0 && (
            <div className="flex items-center gap-1 mt-1">
              {delta > 0 ? (
                <TrendingUp size={13} className="text-green-400" />
              ) : delta < 0 ? (
                <TrendingDown size={13} className="text-red-400" />
              ) : (
                <Minus size={13} className="text-slate-500" />
              )}
              <span
                className={`text-xs ${
                  delta > 0
                    ? "text-green-400"
                    : delta < 0
                    ? "text-red-400"
                    : "text-slate-500"
                }`}
              >
                {delta >= 0 ? "+" : ""}
                {formatCurrency(delta)}
                {pct !== null && ` (${pct > 0 ? "+" : ""}${pct}%)`} vs last month
              </span>
            </div>
          )}
        </div>

        <div className="p-2 rounded-xl bg-green-900/40 flex-shrink-0">
          <DollarSign size={20} className="text-green-400" />
        </div>
      </div>

      {/* MTD */}
      <div className="flex items-center justify-between py-2.5 border-t border-slate-700">
        <span className="text-sm text-slate-400">Month to Date</span>
        <span className="text-sm font-semibold text-white">
          {formatCurrency(mtdTotal)}
        </span>
      </div>

      {/* Payment type breakdown */}
      {entries.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-slate-700 mt-1">
          <p className="text-xs text-slate-500 uppercase tracking-wide pt-1">
            Today&apos;s breakdown
          </p>
          {entries.map((entry, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-400 truncate max-w-[65%]">
                {entry.accountName}
              </span>
              <span className="text-slate-200 font-medium tabular-nums">
                {formatCurrency(entry.credit)}
              </span>
            </div>
          ))}
        </div>
      )}

      {todayTotal === 0 && entries.length === 0 && (
        <p className="text-sm text-slate-500 pt-1 border-t border-slate-700 mt-1">
          No transactions recorded yet today
        </p>
      )}
    </Card>
  );
}
