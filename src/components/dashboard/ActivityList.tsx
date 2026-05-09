"use client";

import { LogIn, LogOut, Calendar } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Lease, PaginatedResponse, Reservation } from "@/lib/types";

interface MoveInsCardProps {
  data: PaginatedResponse<Lease> | undefined;
}

export function MoveInsCard({ data }: MoveInsCardProps) {
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
            <li
              key={lease.id}
              className="flex items-center justify-between text-sm"
            >
              <div>
                <p className="text-slate-200 font-medium">
                  {lease.tenant?.fullName ?? "Unknown"}
                </p>
                <p className="text-xs text-slate-500">
                  Unit {lease.unit?.unitNumber ?? "—"}
                </p>
              </div>
              <span className="text-xs text-slate-400">
                ${lease.monthlyRate?.toFixed(2) ?? "—"}/mo
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

interface MoveOutsCardProps {
  data: PaginatedResponse<Lease> | undefined;
}

export function MoveOutsCard({ data }: MoveOutsCardProps) {
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
            <li
              key={lease.id}
              className="flex items-center justify-between text-sm"
            >
              <div>
                <p className="text-slate-200 font-medium">
                  {lease.tenant?.fullName ?? "Unknown"}
                </p>
                <p className="text-xs text-slate-500">
                  Unit {lease.unit?.unitNumber ?? "—"}
                </p>
              </div>
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

interface ReservationsCardProps {
  data: PaginatedResponse<Reservation> | undefined;
}

export function ReservationsCard({ data }: ReservationsCardProps) {
  const items = data?.results ?? [];

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-900/40">
            <Calendar size={16} className="text-purple-400" />
          </div>
          <p className="text-sm font-semibold text-white">Active Reservations</p>
        </div>
        <span className="text-2xl font-bold text-purple-400">
          {data?.totalCount ?? 0}
        </span>
      </div>

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.slice(0, 5).map((res) => (
            <li key={res.id} className="text-sm">
              <div className="flex items-center justify-between">
                <p className="text-slate-200 font-medium">
                  {res.endUser?.fullName ?? "Unknown"}
                </p>
                <span className="text-xs text-slate-400">
                  Unit {res.unit?.unitNumber ?? "—"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Expires {res.reservedUntil}
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
        <p className="text-sm text-slate-500">No active reservations</p>
      )}
    </Card>
  );
}
