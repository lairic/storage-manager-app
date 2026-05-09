"use client";

import { useState } from "react";
import { LogIn, LogOut, Calendar, X, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Lease, PaginatedResponse, Reservation } from "@/lib/types";

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
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-base font-semibold text-white">{title}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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

// ── Move-Ins ──────────────────────────────────────────────────────────────────

export function MoveInsCard({ data }: { data: PaginatedResponse<Lease> | undefined }) {
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
              <div className="p-1.5 rounded-lg bg-blue-900/40">
                <LogIn size={15} className="text-blue-400" />
              </div>
              <p className="text-sm font-semibold text-white">Move-Ins</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-blue-400">{total}</span>
              {total > 0 && <ChevronRight size={14} className="text-slate-500" />}
            </div>
          </div>

          {items.length > 0 ? (
            <ul className="space-y-1.5 pt-2 border-t border-slate-700">
              {items.slice(0, 3).map((lease) => (
                <li key={lease.id} className="text-xs">
                  <p className="text-slate-200 font-medium truncate">
                    {lease.tenant?.fullName ?? "Unknown"}
                  </p>
                  <p className="text-slate-500">
                    Unit {lease.unit?.number ?? "—"}
                  </p>
                </li>
              ))}
              {total > 3 && (
                <p className="text-xs text-blue-400">+{total - 3} more</p>
              )}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 pt-2 border-t border-slate-700">
              No move-ins today
            </p>
          )}
        </button>
      </Card>

      {open && (
        <Sheet
          title={`Move-Ins Today (${total})`}
          icon={
            <div className="p-1.5 rounded-lg bg-blue-900/40">
              <LogIn size={16} className="text-blue-400" />
            </div>
          }
          onClose={() => setOpen(false)}
        >
          {items.map((lease) => (
            <div
              key={lease.id}
              className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-white">
                  {lease.tenant?.fullName ?? "Unknown"}
                </p>
                <span className="text-xs text-blue-400 font-medium whitespace-nowrap">
                  Unit {lease.unit?.number ?? "—"}
                </span>
              </div>
              {lease.unit?.unitType?.name && (
                <p className="text-xs text-slate-400">{lease.unit.unitType.name}</p>
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 border-t border-slate-700">
                <div>
                  <p className="text-xs text-slate-500">Move-In</p>
                  <p className="text-xs text-slate-300">
                    {lease.moveInDate ? formatDateTime(lease.moveInDate) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Monthly Rate</p>
                  <p className="text-xs text-slate-300">
                    {formatCurrency(lease.effectiveRate ?? 0)}/mo
                  </p>
                </div>
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
              <div className="p-1.5 rounded-lg bg-orange-900/40">
                <LogOut size={15} className="text-orange-400" />
              </div>
              <p className="text-sm font-semibold text-white">Move-Outs</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-orange-400">{total}</span>
              {total > 0 && <ChevronRight size={14} className="text-slate-500" />}
            </div>
          </div>

          {items.length > 0 ? (
            <ul className="space-y-1.5 pt-2 border-t border-slate-700">
              {items.slice(0, 3).map((lease) => (
                <li key={lease.id} className="text-xs">
                  <p className="text-slate-200 font-medium truncate">
                    {lease.tenant?.fullName ?? "Unknown"}
                  </p>
                  <p className="text-slate-500">Unit {lease.unit?.number ?? "—"}</p>
                </li>
              ))}
              {total > 3 && (
                <p className="text-xs text-orange-400">+{total - 3} more</p>
              )}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 pt-2 border-t border-slate-700">
              No move-outs today
            </p>
          )}
        </button>
      </Card>

      {open && (
        <Sheet
          title={`Move-Outs Today (${total})`}
          icon={
            <div className="p-1.5 rounded-lg bg-orange-900/40">
              <LogOut size={16} className="text-orange-400" />
            </div>
          }
          onClose={() => setOpen(false)}
        >
          {items.map((lease) => (
            <div
              key={lease.id}
              className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-white">
                  {lease.tenant?.fullName ?? "Unknown"}
                </p>
                <span className="text-xs text-orange-400 font-medium whitespace-nowrap">
                  Unit {lease.unit?.number ?? "—"}
                </span>
              </div>
              {lease.unit?.unitType?.name && (
                <p className="text-xs text-slate-400">{lease.unit.unitType.name}</p>
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 border-t border-slate-700">
                <div>
                  <p className="text-xs text-slate-500">Move-Out</p>
                  <p className="text-xs text-slate-300">
                    {lease.moveOutDate ? formatDateTime(lease.moveOutDate) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Reason</p>
                  <p className="text-xs text-slate-300">
                    {lease.moveOutReason ?? "—"}
                  </p>
                </div>
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
              <div className="p-1.5 rounded-lg bg-purple-900/40">
                <Calendar size={15} className="text-purple-400" />
              </div>
              <p className="text-sm font-semibold text-white">Reservations</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-purple-400">{total}</span>
              {total > 0 && <ChevronRight size={14} className="text-slate-500" />}
            </div>
          </div>

          {items.length > 0 ? (
            <ul className="space-y-1.5 pt-2 border-t border-slate-700">
              {items.slice(0, 3).map((res) => {
                const unitNum = res.unit?.number ?? res.unit?.unitNumber ?? "—";
                return (
                  <li key={res.id} className="text-xs">
                    <p className="text-slate-200 font-medium truncate">
                      {res.endUser?.fullName ?? "Unknown"}
                    </p>
                    <p className="text-slate-500">Unit {unitNum}</p>
                  </li>
                );
              })}
              {total > 3 && (
                <p className="text-xs text-purple-400">+{total - 3} more</p>
              )}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 pt-2 border-t border-slate-700">
              No active reservations
            </p>
          )}
        </button>
      </Card>

      {open && (
        <Sheet
          title={`Active Reservations (${total})`}
          icon={
            <div className="p-1.5 rounded-lg bg-purple-900/40">
              <Calendar size={16} className="text-purple-400" />
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
                {unitSize && <p className="text-xs text-slate-400">{unitSize}</p>}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 border-t border-slate-700">
                  <div>
                    <p className="text-xs text-slate-500">Reserved</p>
                    <p className="text-xs text-slate-300">
                      {res.createdAt ? formatDateTime(res.createdAt) : "—"}
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
          })}
        </Sheet>
      )}
    </>
  );
}
