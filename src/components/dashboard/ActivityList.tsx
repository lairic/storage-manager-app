"use client";

import { useState } from "react";
import { LogIn, LogOut, Calendar, X, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { Lease, PaginatedResponse, Reservation } from "@/lib/types";

// ── Move-Ins ──────────────────────────────────────────────────────────────────

export function MoveInsCard({ data }: { data: PaginatedResponse<Lease> | undefined }) {
  const items = data?.results ?? [];

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-900/40">
            <LogIn size={16} className="text-blue-400" />
          </div>
          <p className="text-sm font-semibold text-white">Move-Ins</p>
        </div>
        <span className="text-2xl font-bold text-blue-400">
          {data?.totalCount ?? 0}
        </span>
      </div>

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.slice(0, 5).map((lease) => (
            <li key={lease.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="text-slate-200 font-medium">
                  {lease.tenant?.fullName ?? "Unknown"}
                </p>
                <p className="text-xs text-slate-500">
                  Unit {lease.unit?.number ?? "—"} · {lease.unit?.unitType?.name ?? ""}
                </p>
              </div>
              <span className="text-xs text-slate-400 tabular-nums">
                {formatCurrency(lease.effectiveRate ?? 0)}/mo
              </span>
            </li>
          ))}
          {(data?.totalCount ?? 0) > 5 && (
            <p className="text-xs text-slate-500 text-right">
              +{(data?.totalCount ?? 0) - 5} more
            </p>
          )}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No move-ins today</p>
      )}
    </Card>
  );
}

// ── Move-Outs ─────────────────────────────────────────────────────────────────

export function MoveOutsCard({ data }: { data: PaginatedResponse<Lease> | undefined }) {
  const items = data?.results ?? [];

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-900/40">
            <LogOut size={16} className="text-orange-400" />
          </div>
          <p className="text-sm font-semibold text-white">Move-Outs</p>
        </div>
        <span className="text-2xl font-bold text-orange-400">
          {data?.totalCount ?? 0}
        </span>
      </div>

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.slice(0, 5).map((lease) => (
            <li key={lease.id} className="text-sm">
              <p className="text-slate-200 font-medium">
                {lease.tenant?.fullName ?? "Unknown"}
              </p>
              <p className="text-xs text-slate-500">
                Unit {lease.unit?.number ?? "—"} · {lease.unit?.unitType?.name ?? ""}
              </p>
            </li>
          ))}
          {(data?.totalCount ?? 0) > 5 && (
            <p className="text-xs text-slate-500 text-right">
              +{(data?.totalCount ?? 0) - 5} more
            </p>
          )}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No move-outs today</p>
      )}
    </Card>
  );
}

// ── Reservations ──────────────────────────────────────────────────────────────

function ReservationSheet({
  reservations,
  onClose,
}: {
  reservations: Reservation[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-900/40">
            <Calendar size={16} className="text-purple-400" />
          </div>
          <p className="text-base font-semibold text-white">
            Active Reservations ({reservations.length})
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {reservations.length === 0 ? (
          <p className="text-sm text-slate-500 text-center pt-8">
            No active reservations
          </p>
        ) : (
          reservations.map((res) => {
            const unitNum = res.unit?.number ?? res.unit?.unitNumber ?? "—";
            const unitSize = res.unit?.unitType?.name ?? res.unit?.unitGroupName ?? "";
            const leadSource = res.leadSource ?? res.leadSourceId ?? "—";

            return (
              <div
                key={res.id}
                className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white">
                    {res.endUser?.fullName ?? "Unknown"}
                  </p>
                  <span className="text-xs text-purple-400 font-medium whitespace-nowrap">
                    Unit {unitNum}
                  </span>
                </div>

                {unitSize && (
                  <p className="text-xs text-slate-400">{unitSize}</p>
                )}

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 border-t border-slate-700">
                  <div>
                    <p className="text-xs text-slate-500">Reserved</p>
                    <p className="text-xs text-slate-300">
                      {res.createdAt ? formatDate(res.createdAt) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Expires</p>
                    <p className="text-xs text-slate-300">
                      {res.reservedUntil ? formatDateTime(res.reservedUntil) : "—"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500">Lead Source</p>
                    <p className="text-xs text-slate-300 truncate">{leadSource}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ReservationsCard({ data }: { data: PaginatedResponse<Reservation> | undefined }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const items = data?.results ?? [];
  const total = data?.totalCount ?? 0;

  return (
    <>
      <Card>
        <button
          className="w-full text-left"
          onClick={() => setSheetOpen(true)}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-900/40">
                <Calendar size={16} className="text-purple-400" />
              </div>
              <p className="text-sm font-semibold text-white">Active Reservations</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-purple-400">{total}</span>
              {total > 0 && <ChevronRight size={16} className="text-slate-500" />}
            </div>
          </div>

          {items.length > 0 ? (
            <ul className="space-y-2">
              {items.slice(0, 3).map((res) => {
                const unitNum = res.unit?.number ?? res.unit?.unitNumber ?? "—";
                const unitSize = res.unit?.unitType?.name ?? res.unit?.unitGroupName ?? "";
                return (
                  <li key={res.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-slate-200 font-medium">
                        {res.endUser?.fullName ?? "Unknown"}
                      </p>
                      <span className="text-xs text-slate-400">Unit {unitNum}</span>
                    </div>
                    {unitSize && (
                      <p className="text-xs text-slate-500">{unitSize}</p>
                    )}
                  </li>
                );
              })}
              {total > 3 && (
                <p className="text-xs text-purple-400">
                  View all {total} reservations →
                </p>
              )}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No active reservations</p>
          )}
        </button>
      </Card>

      {sheetOpen && (
        <ReservationSheet
          reservations={items}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}
