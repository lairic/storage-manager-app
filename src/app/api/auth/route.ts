import { NextRequest, NextResponse } from "next/server";
import { loginWithCredentials, refreshAccessToken } from "@/lib/api-client";
import {
  parseTokens,
  serializeTokens,
  clearTokenCookie,
  setToken,
  removeToken,
  isExpired,
} from "@/lib/tokens";
import type { CompanyToken } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Record<string, string>;
  const { action } = body;

  // ── Logout (clear all tokens) ─────────────────────────────────────────────
  if (action === "logout") {
    return NextResponse.json(
      { ok: true },
      { headers: { "Set-Cookie": clearTokenCookie() } }
    );
  }

  // ── Remove a single company ───────────────────────────────────────────────
  if (action === "remove-company") {
    const { companyCode } = body;
    if (!companyCode) {
      return NextResponse.json({ error: "Missing companyCode" }, { status: 400 });
    }
    const tokens = parseTokens(req.headers.get("cookie"));
    const updated = removeToken(tokens, companyCode);
    const cookieHeader = Object.keys(updated).length === 0
      ? clearTokenCookie()
      : serializeTokens(updated);
    return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": cookieHeader } });
  }

  // ── Refresh a single company token ────────────────────────────────────────
  if (action === "refresh") {
    const { companyCode } = body;
    if (!companyCode) {
      return NextResponse.json({ error: "Missing companyCode" }, { status: 400 });
    }
    const tokens = parseTokens(req.headers.get("cookie"));
    const existing = tokens[companyCode];
    if (!existing?.refreshToken) {
      return NextResponse.json(
        { error: "No refresh token", code: "NEEDS_REAUTH" },
        { status: 401 }
      );
    }
    try {
      const auth = await refreshAccessToken(existing.refreshToken);
      const updated = setToken(tokens, companyCode, {
        token: auth.token,
        refreshToken: auth.refreshToken,
        expiresAt: Date.now() + auth.expiresIn * 1000,
      });
      return NextResponse.json(
        { ok: true },
        { headers: { "Set-Cookie": serializeTokens(updated) } }
      );
    } catch {
      const withoutStale = removeToken(tokens, companyCode);
      const cookieHeader = Object.keys(withoutStale).length === 0
        ? clearTokenCookie()
        : serializeTokens(withoutStale);
      return NextResponse.json(
        { error: "Refresh failed", code: "NEEDS_REAUTH" },
        { status: 401, headers: { "Set-Cookie": cookieHeader } }
      );
    }
  }

  // ── Add / login a company ─────────────────────────────────────────────────
  const { clientId, clientSecret, companyCode } = body;
  if (!clientId || !clientSecret || !companyCode) {
    return NextResponse.json(
      { error: "clientId, clientSecret, and companyCode are required" },
      { status: 400 }
    );
  }

  try {
    const auth = await loginWithCredentials(clientId, clientSecret);
    const ct: CompanyToken = {
      token: auth.token,
      refreshToken: auth.refreshToken,
      expiresAt: Date.now() + auth.expiresIn * 1000,
    };

    const existing = parseTokens(req.headers.get("cookie"));
    // Suppress unused warning — isExpired is available for future use
    void isExpired;
    const updated = setToken(existing, companyCode, ct);

    return NextResponse.json(
      { ok: true },
      { headers: { "Set-Cookie": serializeTokens(updated) } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
