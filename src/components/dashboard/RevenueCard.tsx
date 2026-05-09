"use client";

import { DollarSign } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import type { JournalEntriesReport } from "@/lib/types";

interface Props {
  data: JournalEntriesReport | undefined;
}

export function RevenueCard({ data }: Props) {
  const todayTotal = data?.creditTotal ?? 0;

  const paymentEntries = (data?.journalEntries ?? []).filter(
    (e) => e.accountType === "Asset" && e.debit > 0
  );

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Revenue Today
          </p>
          <p className="text-3xl font-bold text-white mt-1">
            {formatCurrency(todayTotal)}
          </p>
        </div>
        <div className="p-2 rounded-xl bg-green-900/40 flex-shrink-0">
          <DollarSign size={20} className="text-green-400" />
        </div>
      </div>

      {paymentEntries.length > 0 ? (
        <div className="space-y-1.5 pt-2 border-t border-slate-700">
          <p className="text-xs text-slate-500 uppercase tracking-wide">
            Today&apos;s breakdown
          </p>
          {paymentEntries.map((entry, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-400 truncate max-w-[65%]">
                {entry.accountName}
              </span>
              <span className="text-slate-200 font-medium tabular-nums">
                {formatCurrency(entry.debit)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 pt-2 border-t border-slate-700">
          No transactions recorded yet today
        </p>
      )}
    </Card>
  );
}
