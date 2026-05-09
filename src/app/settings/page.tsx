"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";
import { getCompanies, removeCompany, getCardPrefs, toggleCard, CARD_LABELS } from "@/lib/store";
import type { StoredCompany, CardId } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<StoredCompany[]>([]);
  const [expandedFacility, setExpandedFacility] = useState<string | null>(null);
  const [cardPrefs, setCardPrefs] = useState<Record<string, ReturnType<typeof getCardPrefs>>>({});

  useEffect(() => {
    const loaded = getCompanies();
    setCompanies(loaded);
    // Pre-load card prefs for all facilities
    const prefs: typeof cardPrefs = {};
    for (const company of loaded) {
      for (const facility of company.facilities) {
        const key = `${company.companyCode}/${facility.facilityCode}`;
        prefs[key] = getCardPrefs(company.companyCode, facility.facilityCode);
      }
    }
    setCardPrefs(prefs);
  }, []);

  async function handleRemoveCompany(companyCode: string) {
    if (!confirm(`Remove ${companyCode} and all its facilities?`)) return;

    // Remove token server-side
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove-company", companyCode }),
    });

    // Remove from localStorage
    removeCompany(companyCode);
    const updated = getCompanies();
    setCompanies(updated);

    if (updated.length === 0) {
      router.push("/setup");
    }
  }

  function handleToggleCard(companyCode: string, facilityCode: string, id: CardId) {
    const updated = toggleCard(companyCode, facilityCode, id);
    const key = `${companyCode}/${facilityCode}`;
    setCardPrefs((prev) => ({ ...prev, [key]: updated }));
  }

  async function handleLogout() {
    if (!confirm("Sign out and remove all companies?")) return;
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    // Clear localStorage
    localStorage.removeItem("storage_companies");
    localStorage.removeItem("storage_card_prefs");
    router.push("/setup");
  }

  return (
    <div className="min-h-dvh bg-slate-900 safe-top safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-white">Settings</h1>
      </header>

      <div className="px-4 py-4 space-y-6 pb-8">
        {/* Companies */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Companies & Facilities
            </h2>
            <button
              onClick={() => router.push("/setup?add=1")}
              className="flex items-center gap-1 text-sm text-blue-400 font-medium"
            >
              <Plus size={16} />
              Add
            </button>
          </div>

          {companies.length === 0 ? (
            <p className="text-slate-500 text-sm">No companies configured.</p>
          ) : (
            <div className="space-y-3">
              {companies.map((company) => (
                <div
                  key={company.companyCode}
                  className="rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden"
                >
                  {/* Company header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                    <div>
                      <p className="font-semibold text-white text-sm">{company.name}</p>
                      <p className="text-xs text-slate-500">{company.companyCode}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveCompany(company.companyCode)}
                      className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Facilities */}
                  {company.facilities.map((facility) => {
                    const key = `${company.companyCode}/${facility.facilityCode}`;
                    const prefs = cardPrefs[key] ?? [];
                    const isExpanded = expandedFacility === key;

                    return (
                      <div key={facility.facilityCode}>
                        <button
                          onClick={() => setExpandedFacility(isExpanded ? null : key)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-700/50 transition-colors"
                        >
                          <div>
                            <p className="text-sm text-slate-200">{facility.name}</p>
                            <p className="text-xs text-slate-500">{facility.facilityCode}</p>
                          </div>
                          <ChevronRight
                            size={16}
                            className={`text-slate-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          />
                        </button>

                        {/* Card toggles */}
                        {isExpanded && (
                          <div className="bg-slate-900/50 px-4 py-3 border-t border-slate-700">
                            <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">
                              Dashboard Cards
                            </p>
                            <div className="space-y-2">
                              {prefs
                                .slice()
                                .sort((a, b) => a.order - b.order)
                                .map((pref) => (
                                  <div
                                    key={pref.id}
                                    className="flex items-center justify-between"
                                  >
                                    <span className="text-sm text-slate-300">
                                      {CARD_LABELS[pref.id]}
                                    </span>
                                    <button
                                      onClick={() =>
                                        handleToggleCard(
                                          company.companyCode,
                                          facility.facilityCode,
                                          pref.id as CardId
                                        )
                                      }
                                      className={`transition-colors ${
                                        pref.enabled ? "text-blue-400" : "text-slate-600"
                                      }`}
                                    >
                                      {pref.enabled ? (
                                        <ToggleRight size={24} />
                                      ) : (
                                        <ToggleLeft size={24} />
                                      )}
                                    </button>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sign out */}
        <section className="pt-2">
          <button
            onClick={handleLogout}
            className="w-full py-3.5 rounded-xl border border-red-800 text-red-400 font-medium text-sm hover:bg-red-900/20 transition-colors"
          >
            Sign Out & Remove All Data
          </button>
        </section>
      </div>
    </div>
  );
}
