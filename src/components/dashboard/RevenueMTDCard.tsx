"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import type { JournalEntriesReport } from "@/lib/types";

interface Props {
  dataMTD: JournalEntriesReport | undefined;
  dataMTDPrevMonth: JournalEntriesReport | undefined;
}

export function RevenueMTDCard({ dataMTD, dataMTDPrevMonth }: Props) {
  const mtdTotal = dataMTD?.creditTotal ?? 0;
  const prevMonthTotal = dataMTDPrevMonth?.creditTotal ?? 0;

  const delta = mtdTotal - prevMonthTotal;
  const pct =
    prevMonthTotal > 0 ? Math.round((delta / prevMonthTotal) * 100) : null;

  return (
    <Card>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Month to Date
        </p>
        <div className="p-1.5 rounded-lg bg-emerald-900/40 flex-shrink-0">
          <TrendingUp size={14} className="text-emerald-400" />
        </div>
      </div>

      <p className="text-2xl font-bold text-white mb-2">
        {formatCurrency(mtdTotal)}
      </p>

      {prevMonthTotal > 0 ? (
        <div className="flex items-center gap-1 pt-2 border-t border-slate-700">
          {delta > 0 ? (
            <TrendingUp size={11} className="text-green-400 flex-shrink-0" />
          ) : delta < 0 ? (
            <TrendingDown size={11} className="text-red-400 flex-shrink-0" />
          ) : (
            <Minus size={11} className="text-slate-500 flex-shrink-0" />
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
            {pct !== null && ` (${pct > 0 ? "+" : ""}${pct}%)`}
          </span>
          <span className="text-xs text-slate-500">vs last mo.</span>
        </div>
      ) : (
        <p className="text-xs text-slate-500 pt-2 border-t border-slate-700">
          No prior month data
        </p>
      )}
    </Card>
  );
}
