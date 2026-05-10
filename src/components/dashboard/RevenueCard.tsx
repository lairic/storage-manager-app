"use client";

import { DollarSign } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import type { JournalEntriesReport } from "@/lib/types";

interface Props {
  data: JournalEntriesReport | undefined;
  label?: string;
}

export function RevenueCard({ data, label = "Today" }: Props) {
  const total = data?.creditTotal ?? 0;

  const paymentEntries = (data?.journalEntries ?? []).filter(
    (e) => e.accountType === "Asset" && e.debit > 0
  );

  return (
    <Card>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {label}
        </p>
        <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/40 flex-shrink-0">
          <DollarSign size={14} className="text-green-600 dark:text-green-400" />
        </div>
      </div>

      <p className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        {formatCurrency(total)}
      </p>

      {paymentEntries.length > 0 ? (
        <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
          {paymentEntries.map((entry, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 truncate max-w-[60%]">
                {entry.accountName}
              </span>
              <span className="text-slate-700 dark:text-slate-200 font-medium tabular-nums">
                {formatCurrency(entry.debit)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-700">
          No transactions yet
        </p>
      )}
    </Card>
  );
}
