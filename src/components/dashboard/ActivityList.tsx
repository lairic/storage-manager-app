"use client";

import { useState } from "react";
import { LogIn, LogOut, Calendar, X, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Lease, PaginatedResponse, Reservation } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTenure(
  moveIn: string | null,
  moveOut: string | null | undefined
): string {
  if (!moveIn || !moveOut) return "—";
  const start = new Date(moveIn);
  const end = new Date(moveOut);
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "—";
  if (days < 60) return `${days} day${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0
    ? `${years} yr${years === 1 ? "" : "s"}`
    : `${years} yr${years === 1 ? "" : "s"} ${rem} mo`;
}

function leaseTypeLabel(type: string): string {
  return type === "MoveIn" ? "New" : type;
}

function sourceBreakdown(
  items: Lease[],
  key: "leaseType" | "moveOutReason"
): string {
  if (items.length === 0) return "";
  const counts: Record<string, number> = {};
  for (const item of items) {
    const raw = key === "leaseType" ? item.leaseType : item.moveOutReason;
    const label =
      key === "leaseType"
        ? leaseTypeLabel(raw ?? "Unknown")
        : (raw ?? "Unknown");
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

// ── Shared sheet shell ────────────────────────────────────────────────────────

function Sheet({
  title,
  icon,
  children,
  onClose,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-base font-semibold text-slate-900 dark:text-white">{title}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {children}
      </div>
    </div>
  );
}

// ── Detail row helper ─────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
      <p className="text-xs text-slate-600 dark:text-slate-300">{value}</p>
    </div>
  );
}

// ── Move-Ins ──────────────────────────────────────────────────────────────────

export function MoveInsCard({ data }: { data: PaginatedResponse<Lease> | undefined }) {
  const [open, setOpen] = useState(false);
  const items = data?.results ?? [];
  const total = data?.totalCount ?? 0;
  const preview = sourceBreakdown(items, "leaseType");

  return (
    <>
      <Card>
        <button
          className="w-full text-left"
          onClick={() => total > 0 && setOpen(true)}
          disabled={total === 0}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                <LogIn size={15} className="text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Move-Ins</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-blue-500 dark:text-blue-400">{total}</span>
              {total > 0 && <ChevronRight size={14} className="text-slate-400 dark:text-slate-500" />}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            {preview ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{preview}</p>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">No move-ins today</p>
            )}
          </div>
        </button>
      </Card>

      {open && (
        <Sheet
          title={`Move-Ins Today (${total})`}
          icon={
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <LogIn size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
          }
          onClose={() => setOpen(false)}
        >
          {items.map((lease) => (
            <div
              key={lease.id}
              className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {lease.tenant?.fullName ?? "Unknown"}
                </p>
                <span className="text-xs text-blue-500 dark:text-blue-400 font-medium whitespace-nowrap">
                  Unit {lease.unit?.number ?? "—"}
                </span>
              </div>
              {lease.unit?.unitType?.name && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{lease.unit.unitType.name}</p>
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                <DetailRow
                  label="Move-In"
                  value={lease.moveInDate ? formatDateTime(lease.moveInDate) : "—"}
                />
                <DetailRow
                  label="Monthly Rate"
                  value={`${formatCurrency(lease.effectiveRate ?? 0)}/mo`}
                />
                <DetailRow
                  label="Type"
                  value={leaseTypeLabel(lease.leaseType ?? "—")}
                />
                {(lease.leadSource ?? lease.leadSourceId) && (
                  <DetailRow
                    label="Lead Source"
                    value={lease.leadSource ?? lease.leadSourceId ?? "—"}
                  />
                )}
              </div>
            </div>
          ))}
        </Sheet>
      )}
    </>
  );
}

// ── Move-Outs ─────────────────────────────────────────────────────────────────

export function MoveOutsCard({ data }: { data: PaginatedResponse<Lease> | undefined }) {
  const [open, setOpen] = useState(false);
  const items = data?.results ?? [];
  const total = data?.totalCount ?? 0;
  const preview = sourceBreakdown(items, "moveOutReason");

  return (
    <>
      <Card>
        <button
          className="w-full text-left"
          onClick={() => total > 0 && setOpen(true)}
          disabled={total === 0}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/40">
                <LogOut size={15} className="text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Move-Outs</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-orange-500 dark:text-orange-400">{total}</span>
              {total > 0 && <ChevronRight size={14} className="text-slate-400 dark:text-slate-500" />}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            {preview ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{preview}</p>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">No move-outs today</p>
            )}
          </div>
        </button>
      </Card>

      {open && (
        <Sheet
          title={`Move-Outs Today (${total})`}
          icon={
            <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/40">
              <LogOut size={16} className="text-orange-600 dark:text-orange-400" />
            </div>
          }
          onClose={() => setOpen(false)}
        >
          {items.map((lease) => (
            <div
              key={lease.id}
              className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {lease.tenant?.fullName ?? "Unknown"}
                </p>
                <span className="text-xs text-orange-500 dark:text-orange-400 font-medium whitespace-nowrap">
                  Unit {lease.unit?.number ?? "—"}
                </span>
              </div>
              {lease.unit?.unitType?.name && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{lease.unit.unitType.name}</p>
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                <DetailRow
                  label="Move-Out"
                  value={lease.moveOutDate ? formatDateTime(lease.moveOutDate) : "—"}
                />
                <DetailRow
                  label="Reason"
                  value={lease.moveOutReason ?? "—"}
                />
                <DetailRow
                  label="Tenure"
                  value={formatTenure(lease.moveInDate, lease.moveOutDate)}
                />
                <DetailRow
                  label="Processed By"
                  value={lease.processedBy ?? "—"}
                />
                {(lease.leadSource ?? lease.leadSourceId) && (
                  <DetailRow
                    label="Lead Source"
                    value={lease.leadSource ?? lease.leadSourceId ?? "—"}
                  />
                )}
              </div>
            </div>
          ))}
        </Sheet>
      )}
    </>
  );
}

// ── Reservations ──────────────────────────────────────────────────────────────

export function ReservationsCard({ data }: { data: PaginatedResponse<Reservation> | undefined }) {
  const [open, setOpen] = useState(false);
  const items = data?.results ?? [];
  const total = data?.totalCount ?? 0;

  return (
    <>
      <Card>
        <button
          className="w-full text-left"
          onClick={() => total > 0 && setOpen(true)}
          disabled={total === 0}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                <Calendar size={15} className="text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Reservations</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-purple-500 dark:text-purple-400">{total}</span>
              {total > 0 && <ChevronRight size={14} className="text-slate-400 dark:text-slate-500" />}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            {items.length > 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {items
                  .slice(0, 3)
                  .map((r) => r.endUser?.fullName ?? "Unknown")
                  .join(", ")}
                {total > 3 ? ` +${total - 3} more` : ""}
              </p>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">No active reservations</p>
            )}
          </div>
        </button>
      </Card>

      {open && (
        <Sheet
          title={`Active Reservations (${total})`}
          icon={
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40">
              <Calendar size={16} className="text-purple-600 dark:text-purple-400" />
            </div>
          }
          onClose={() => setOpen(false)}
        >
          {items.map((res) => {
            const unitNum = res.unit?.number ?? res.unit?.unitNumber ?? "—";
            const unitSize = res.unit?.unitType?.name ?? res.unit?.unitGroupName ?? "";
            const leadSource = res.leadSource ?? res.leadSourceId ?? "—";
            return (
              <div
                key={res.id}
                className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {res.endUser?.fullName ?? "Unknown"}
                  </p>
                  <span className="text-xs text-purple-500 dark:text-purple-400 font-medium whitespace-nowrap">
                    Unit {unitNum}
                  </span>
                </div>
                {unitSize && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{unitSize}</p>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <DetailRow
                    label="Reserved"
                    value={res.createdAt ? formatDateTime(res.createdAt) : "—"}
                  />
                  <DetailRow
                    label="Expires"
                    value={res.reservedUntil ? formatDateTime(res.reservedUntil) : "—"}
                  />
                  <div className="col-span-2">
                    <DetailRow label="Lead Source" value={leadSource} />
                  </div>
                </div>
              </div>
            );
          })}
        </Sheet>
      )}
    </>
  );
}
