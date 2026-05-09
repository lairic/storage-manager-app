"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Warehouse } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    clientId: "",
    clientSecret: "",
    companyCode: "",
    facilityCode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed. Check your credentials.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 bg-slate-900">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 rounded-2xl bg-blue-600 mb-4">
            <Warehouse size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Storage Manager</h1>
          <p className="text-slate-400 text-sm mt-1">
            Sign in to your facility dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Company Code
            </label>
            <input
              type="text"
              required
              autoCapitalize="off"
              autoCorrect="off"
              value={form.companyCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, companyCode: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. ACME"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Facility Code
            </label>
            <input
              type="text"
              required
              autoCapitalize="off"
              autoCorrect="off"
              value={form.facilityCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, facilityCode: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. FAC01"
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
              onChange={(e) =>
                setForm((f) => ({ ...f, clientId: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your API client ID"
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
              onChange={(e) =>
                setForm((f) => ({ ...f, clientSecret: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your API client secret"
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
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-base transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}
