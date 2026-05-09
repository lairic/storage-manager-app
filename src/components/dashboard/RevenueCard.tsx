"use client";

import { DollarSign } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import type { JournalEntriesReport } from "@/lib/types";

interface Props {
  data: JournalEntriesReport | undefined;
}

const REVENUE_ACCOUNT_TYPES = ["Revenue", "Income"];

export function RevenueCard({ data }: Props) {
  const revenueEntries =
    data?.journalEntries.filter((e) =>
      REVENUE_ACCOUNT_TYPES.some((t) =>
        e.accountType?.toLowerCase().includes(t.toLowerCase())
      )
    ) ?? [];

  const totalRevenue = revenueEntries.reduce((sum, e) => sum + e.credit, 0);
  const creditTotal = data?.creditTotal ?? 0;

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Revenue Today
          </p>
          <p className="text-3xl font-bold text-white mt-1">
            {formatCurrency(totalRevenue || creditTotal)}
          </p>
        </div>
        <div className="p-2 rounded-xl bg-green-900/40">
          <DollarSign size={20} className="text-green-400" />
        </div>
      </div>

      {data && data.journalEntries.length > 0 && (
        <div className="space-y-1 mt-3 border-t border-slate-700 pt-3">
          {data.journalEntries.slice(0, 5).map((entry, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-400 truncate max-w-[60%]">
                {entry.accountName}
              </span>
              <span className="text-slate-200 font-medium">
                {formatCurrency(entry.credit)}
              </span>
            </div>
          ))}
          {data.journalEntries.length > 5 && (
            <p className="text-xs text-slate-500 text-right">
              +{data.journalEntries.length - 5} more accounts
            </p>
          )}
        </div>
      )}

      {data && data.journalEntries.length === 0 && (
        <p className="text-sm text-slate-500 mt-2">No transactions today</p>
      )}
    </Card>
  );
}
