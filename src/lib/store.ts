"use client";

import type { StoredCompany, CardId, CardPref } from "./types";

const COMPANIES_KEY = "storage_companies";
const CARD_PREFS_KEY = "storage_card_prefs";

export const DEFAULT_CARDS: CardPref[] = [
  { id: "revenue", enabled: true, order: 0 },
  { id: "move-ins", enabled: true, order: 1 },
  { id: "move-outs", enabled: true, order: 2 },
  { id: "reservations", enabled: true, order: 3 },
  { id: "communications", enabled: true, order: 4 },
];

export const CARD_LABELS: Record<CardId, string> = {
  revenue: "Revenue",
  "move-ins": "Move-Ins",
  "move-outs": "Move-Outs",
  reservations: "Reservations",
  communications: "Communications",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ── Companies ─────────────────────────────────────────────────────────────────

export function getCompanies(): StoredCompany[] {
  return read<StoredCompany[]>(COMPANIES_KEY, []);
}

export function getCompany(companyCode: string): StoredCompany | undefined {
  return getCompanies().find((c) => c.companyCode === companyCode);
}

export function upsertCompany(company: StoredCompany): void {
  const companies = getCompanies();
  const idx = companies.findIndex((c) => c.companyCode === company.companyCode);
  if (idx >= 0) {
    companies[idx] = company;
  } else {
    companies.push(company);
  }
  write(COMPANIES_KEY, companies);
}

export function removeCompany(companyCode: string): void {
  write(
    COMPANIES_KEY,
    getCompanies().filter((c) => c.companyCode !== companyCode)
  );
}

export function hasCompanies(): boolean {
  return getCompanies().length > 0;
}

// ── Card preferences ──────────────────────────────────────────────────────────

function cardKey(companyCode: string, facilityCode: string): string {
  return `${companyCode}/${facilityCode}`;
}

export function getCardPrefs(
  companyCode: string,
  facilityCode: string
): CardPref[] {
  const all = read<Record<string, CardPref[]>>(CARD_PREFS_KEY, {});
  return all[cardKey(companyCode, facilityCode)] ?? [...DEFAULT_CARDS];
}

export function setCardPrefs(
  companyCode: string,
  facilityCode: string,
  prefs: CardPref[]
): void {
  const all = read<Record<string, CardPref[]>>(CARD_PREFS_KEY, {});
  all[cardKey(companyCode, facilityCode)] = prefs;
  write(CARD_PREFS_KEY, all);
}

export function toggleCard(
  companyCode: string,
  facilityCode: string,
  id: CardId
): CardPref[] {
  const prefs = getCardPrefs(companyCode, facilityCode);
  const updated = prefs.map((p) =>
    p.id === id ? { ...p, enabled: !p.enabled } : p
  );
  setCardPrefs(companyCode, facilityCode, updated);
  return updated;
}
