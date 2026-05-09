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
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Revenue Month to Date
          </p>
          <p className="text-3xl font-bold text-white mt-1">
            {formatCurrency(mtdTotal)}
          </p>

          {prevMonthTotal > 0 && (
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
                {pct !== null && ` (${pct > 0 ? "+" : ""}${pct}%)`} vs same
                period last month
              </span>
            </div>
          )}
        </div>

        <div className="p-2 rounded-xl bg-emerald-900/40 flex-shrink-0">
          <TrendingUp size={20} className="text-emerald-400" />
        </div>
      </div>
    </Card>
  );
}
