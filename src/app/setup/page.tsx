"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Warehouse, ChevronRight, Check, ArrowLeft, KeyRound, RefreshCw } from "lucide-react";
import { getCompanies, upsertCompany } from "@/lib/store";
import type { FacilityResponse, PaginatedResponse, StoredCompany, StoredFacility } from "@/lib/types";
import { randomUUID } from "@/lib/utils";

type Step = "reconnect" | "credentials" | "facilities";

interface FacilityOption extends StoredFacility {
  selected: boolean;
}

interface ReconnectEntry {
  clientId: string;
  clientSecret: string;
  loading: boolean;
  error: string;
  done: boolean;
}

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdding = searchParams.get("add") === "1";

  const [step, setStep] = useState<Step>("credentials");
  const [existingCompanies, setExistingCompanies] = useState<StoredCompany[]>([]);
  const [reconnect, setReconnect] = useState<Record<string, ReconnectEntry>>({});

  const [form, setForm] = useState({
    companyName: "",
    companyCode: "",
    clientId: "",
    clientSecret: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [facilityOptions, setFacilityOptions] = useState<FacilityOption[]>([]);

  useEffect(() => {
    if (isAdding) return;
    const companies = getCompanies();
    if (companies.length > 0) {
      setExistingCompanies(companies);
      setStep("reconnect");
      const initial: Record<string, ReconnectEntry> = {};
      for (const c of companies) {
        initial[c.companyCode] = {
          clientId: c.clientId ?? "",
          clientSecret: "",
          loading: false,
          error: "",
          done: false,
        };
      }
      setReconnect(initial);
    }
  }, [isAdding]);

  function updateForm(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateReconnect(companyCode: string, patch: Partial<ReconnectEntry>) {
    setReconnect((r) => ({ ...r, [companyCode]: { ...r[companyCode], ...patch } }));
  }

  // ── Reconnect an existing company ─────────────────────────────────────────

  async function handleReconnect(companyCode: string) {
    const entry = reconnect[companyCode];
    if (!entry.clientId || !entry.clientSecret) {
      updateReconnect(companyCode, { error: "Client ID and Secret are required." });
      return;
    }
    updateReconnect(companyCode, { loading: true, error: "" });
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCode, clientId: entry.clientId, clientSecret: entry.clientSecret }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        updateReconnect(companyCode, { loading: false, error: d.error ?? "Invalid credentials." });
        return;
      }
      // Save clientId for next reconnect pre-fill
      const company = existingCompanies.find((c) => c.companyCode === companyCode);
      if (company) upsertCompany({ ...company, clientId: entry.clientId });
      updateReconnect(companyCode, { loading: false, done: true, error: "" });
    } catch {
      updateReconnect(companyCode, { loading: false, error: "Network error. Try again." });
    }
  }

  function allReconnected() {
    return Object.values(reconnect).every((e) => e.done);
  }

  // ── Step 1: Connect new company ───────────────────────────────────────────

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const authRes = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyCode: form.companyCode.trim().toUpperCase(),
          clientId: form.clientId.trim(),
          clientSecret: form.clientSecret,
        }),
      });
      if (!authRes.ok) {
        const d = await authRes.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? "Authentication failed. Check your credentials.");
        return;
      }
      const facRes = await fetch(
        `/api/setup/facilities?companyCode=${encodeURIComponent(form.companyCode.trim().toUpperCase())}`
      );
      if (!facRes.ok) {
        setError("Authenticated, but couldn't load facilities. Try again.");
        return;
      }
      const facData = await facRes.json() as PaginatedResponse<FacilityResponse>;
      const options: FacilityOption[] = facData.results
        .filter((f) => f.isActive)
        .map((f) => ({
          facilityCode: f.code,
          facilityId: f.id,
          name: f.name,
          timeZoneId: f.location.timeZoneId,
          isActive: f.isActive,
          selected: true,
        }));
      setFacilityOptions(options);
      setStep("facilities");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Confirm facilities ────────────────────────────────────────────

  function toggleFacility(code: string) {
    setFacilityOptions((opts) =>
      opts.map((o) => (o.facilityCode === code ? { ...o, selected: !o.selected } : o))
    );
  }

  function handleFinish() {
    const selected = facilityOptions.filter((o) => o.selected);
    if (selected.length === 0) {
      setError("Please select at least one facility.");
      return;
    }
    const companyCode = form.companyCode.trim().toUpperCase();
    upsertCompany({
      id: randomUUID(),
      name: form.companyName.trim() || companyCode,
      companyCode,
      clientId: form.clientId.trim(),
      facilities: selected.map((opt) => ({
        facilityCode: opt.facilityCode,
        facilityId: opt.facilityId,
        name: opt.name,
        timeZoneId: opt.timeZoneId,
        isActive: opt.isActive,
      })),
      addedAt: Date.now(),
    });
    router.push("/dashboard");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-dvh flex flex-col bg-slate-50 dark:bg-slate-900 px-5 py-8 safe-top safe-bottom">

      {/* ── Reconnect: session expired, companies already stored ── */}
      {step === "reconnect" && (
        <div className="w-full max-w-sm mx-auto">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 rounded-2xl bg-amber-500 mb-4">
              <KeyRound size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Session Expired</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center">
              Re-enter your API credentials to reconnect.
            </p>
          </div>

          <div className="space-y-4">
            {existingCompanies.map((company) => {
              const entry = reconnect[company.companyCode];
              if (!entry) return null;
              return (
                <div
                  key={company.companyCode}
                  className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">{company.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{company.companyCode}</p>
                    </div>
                    {entry.done && (
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </div>

                  {!entry.done && (
                    <>
                      <input
                        type="text"
                        value={entry.clientId}
                        onChange={(e) => updateReconnect(company.companyCode, { clientId: e.target.value })}
                        placeholder="Client ID"
                        autoCapitalize="off"
                        autoCorrect="off"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="password"
                        value={entry.clientSecret}
                        onChange={(e) => updateReconnect(company.companyCode, { clientSecret: e.target.value })}
                        placeholder="Client Secret"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {entry.error && (
                        <p className="text-xs text-red-500 dark:text-red-400">{entry.error}</p>
                      )}
                      <button
                        onClick={() => handleReconnect(company.companyCode)}
                        disabled={entry.loading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                      >
                        {entry.loading ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          "Reconnect"
                        )}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {allReconnected() && (
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors"
            >
              Go to Dashboard <ChevronRight size={18} />
            </button>
          )}

          <button
            onClick={() => { setStep("credentials"); setError(""); }}
            className="w-full mt-3 py-2.5 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Add a different company instead
          </button>
        </div>
      )}

      {/* ── New company setup ── */}
      {(step === "credentials" || step === "facilities") && (
        <>
          {isAdding && step === "credentials" && (
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-slate-500 dark:text-slate-400 mb-6 self-start"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">Back</span>
            </button>
          )}

          {!isAdding && step === "credentials" && existingCompanies.length > 0 && (
            <button
              onClick={() => setStep("reconnect")}
              className="flex items-center gap-1 text-slate-500 dark:text-slate-400 mb-6 self-start"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">Back</span>
            </button>
          )}

          <div className="flex flex-col items-center mb-8">
            <div className="p-4 rounded-2xl bg-blue-600 mb-4">
              <Warehouse size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isAdding ? "Add Company" : "Welcome"}
            </h1>
            {!isAdding && (
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center">
                Connect your first storage company to get started
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 justify-center mb-8">
            <div className={`h-2 rounded-full transition-all ${step === "credentials" ? "w-8 bg-blue-500" : "w-2 bg-blue-700"}`} />
            <div className={`h-2 rounded-full transition-all ${step === "facilities" ? "w-8 bg-blue-500" : "w-2 bg-slate-300 dark:bg-slate-600"}`} />
          </div>

          {step === "credentials" && (
            <form onSubmit={handleConnect} className="space-y-4 w-full max-w-sm mx-auto">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  Company Name <span className="text-slate-400 dark:text-slate-500">(your label)</span>
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => updateForm("companyName", e.target.value)}
                  placeholder="e.g. Agua Dulce Storage"
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  Company Code
                </label>
                <input
                  type="text"
                  required
                  autoCapitalize="characters"
                  autoCorrect="off"
                  value={form.companyCode}
                  onChange={(e) => updateForm("companyCode", e.target.value)}
                  placeholder="e.g. ADS"
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  Client ID
                </label>
                <input
                  type="text"
                  required
                  autoCapitalize="off"
                  autoCorrect="off"
                  value={form.clientId}
                  onChange={(e) => updateForm("clientId", e.target.value)}
                  placeholder="Your API client ID"
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  Client Secret
                </label>
                <input
                  type="password"
                  required
                  value={form.clientSecret}
                  onChange={(e) => updateForm("clientSecret", e.target.value)}
                  placeholder="Your API client secret"
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {error && (
                <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-60 mt-2"
              >
                {loading ? "Connecting…" : <>Connect <ChevronRight size={18} /></>}
              </button>
            </form>
          )}

          {step === "facilities" && (
            <div className="w-full max-w-sm mx-auto">
              <p className="text-slate-600 dark:text-slate-300 text-sm mb-4 text-center">
                Found {facilityOptions.length} facilit{facilityOptions.length === 1 ? "y" : "ies"} for{" "}
                <span className="text-slate-900 dark:text-white font-medium">{form.companyName || form.companyCode}</span>.
                {facilityOptions.length > 1 && " Choose which to include."}
              </p>
              <div className="space-y-2 mb-6">
                {facilityOptions.map((opt) => (
                  <button
                    key={opt.facilityCode}
                    onClick={() => toggleFacility(opt.facilityCode)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-colors text-left ${
                      opt.selected
                        ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600 text-slate-900 dark:text-white"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm">{opt.name}</p>
                      <p className="text-xs opacity-60 mt-0.5">{opt.facilityCode}</p>
                    </div>
                    {opt.selected && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {error && (
                <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800 mb-4">
                  {error}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep("credentials"); setError(""); }}
                  className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
                >
                  Finish
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default function SetupPage() {
  return (
    <Suspense>
      <SetupContent />
    </Suspense>
  );
}
