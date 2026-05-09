"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Warehouse, ChevronRight, Check, ArrowLeft } from "lucide-react";
import { upsertCompany } from "@/lib/store";
import type { FacilityResponse, PaginatedResponse, StoredFacility } from "@/lib/types";
import { randomUUID } from "@/lib/utils";

type Step = "credentials" | "facilities" | "done";

interface FacilityOption extends StoredFacility {
  selected: boolean;
}

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdding = searchParams.get("add") === "1";

  const [step, setStep] = useState<Step>("credentials");
  const [form, setForm] = useState({
    companyName: "",
    companyCode: "",
    clientId: "",
    clientSecret: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [facilityOptions, setFacilityOptions] = useState<FacilityOption[]>([]);

  function updateForm(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // ── Step 1: Connect company ───────────────────────────────────────────────

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Authenticate the company
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

      // Auto-fetch facilities
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
    <main className="min-h-dvh flex flex-col bg-slate-900 px-5 py-8 safe-top safe-bottom">
      {/* Back button when adding from settings */}
      {isAdding && step === "credentials" && (
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-slate-400 mb-6 self-start"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Back</span>
        </button>
      )}

      {/* Header */}
      {step !== "done" && (
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 rounded-2xl bg-blue-600 mb-4">
            <Warehouse size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isAdding ? "Add Company" : "Welcome"}
          </h1>
          {!isAdding && (
            <p className="text-slate-400 text-sm mt-1 text-center">
              Connect your first storage company to get started
            </p>
          )}
        </div>
      )}

      {/* Step indicators */}
      {step !== "done" && (
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className={`h-2 rounded-full transition-all ${step === "credentials" ? "w-8 bg-blue-500" : "w-2 bg-blue-700"}`} />
          <div className={`h-2 rounded-full transition-all ${step === "facilities" ? "w-8 bg-blue-500" : "w-2 bg-slate-600"}`} />
        </div>
      )}

      {/* ── Step 1: Credentials ─────────────────────────────────────────── */}
      {step === "credentials" && (
        <form onSubmit={handleConnect} className="space-y-4 w-full max-w-sm mx-auto">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Company Name <span className="text-slate-500">(your label)</span>
            </label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => updateForm("companyName", e.target.value)}
              placeholder="What is your company name?"
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Company Code
            </label>
            <input
              type="text"
              required
              autoCapitalize="characters"
              autoCorrect="off"
              value={form.companyCode}
              onChange={(e) => updateForm("companyCode", e.target.value)}
              placeholder="e.g. ABC"
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
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
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Client Secret
            </label>
            <input
              type="password"
              required
              value={form.clientSecret}
              onChange={(e) => updateForm("clientSecret", e.target.value)}
              placeholder="Your API client secret"
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 rounded-xl px-4 py-3 border border-red-800">
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

      {/* ── Step 2: Confirm facilities ──────────────────────────────────── */}
      {step === "facilities" && (
        <div className="w-full max-w-sm mx-auto">
          <p className="text-slate-300 text-sm mb-4 text-center">
            Found {facilityOptions.length} facilit{facilityOptions.length === 1 ? "y" : "ies"} for{" "}
            <span className="text-white font-medium">{form.companyName || form.companyCode}</span>.
            {facilityOptions.length > 1 && " Choose which to include."}
          </p>

          <div className="space-y-2 mb-6">
            {facilityOptions.map((opt) => (
              <button
                key={opt.facilityCode}
                onClick={() => toggleFacility(opt.facilityCode)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-colors text-left ${
                  opt.selected
                    ? "bg-blue-900/30 border-blue-600 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-400"
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
            <p className="text-sm text-red-400 bg-red-900/20 rounded-xl px-4 py-3 border border-red-800 mb-4">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setStep("credentials"); setError(""); }}
              className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 font-medium"
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
