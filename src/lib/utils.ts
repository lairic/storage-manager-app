import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayISO(): string {
  // Use Intl to get the correct local calendar date instead of UTC
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

export function todayInTimezone(tzId: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tzId }).format(new Date());
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function firstDayOfMonth(isoDate: string): string {
  return isoDate.slice(0, 8) + "01";
}

export function firstDayOfLastMonth(isoDate: string): string {
  const [y, m] = isoDate.split("-").map(Number);
  const prev = new Date(y, m - 2, 1);
  return prev.toISOString().slice(0, 10);
}

export function sameDayLastMonth(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  // JS Date normalizes automatically (e.g. March 31 → Feb 28/29)
  const prev = new Date(y, m - 2, d);
  return prev.toISOString().slice(0, 10);
}

export function nDaysAgo(n: number, isoDate: string): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function firstDayOfQuarter(isoDate: string): string {
  const [y, m] = isoDate.split("-").map(Number);
  const firstMonth = (Math.ceil(m / 3) - 1) * 3 + 1;
  return `${y}-${String(firstMonth).padStart(2, "0")}-01`;
}

export function randomUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
