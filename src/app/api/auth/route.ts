import { NextRequest, NextResponse } from "next/server";
import { loginWithCredentials, refreshAccessToken } from "@/lib/api-client";
import {
  serializeSession,
  clearSessionCookie,
  parseSession,
} from "@/lib/session";
import type { SessionData } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { action } = body as { action?: string };

  if (action === "logout") {
    return NextResponse.json(
      { ok: true },
      { headers: { "Set-Cookie": clearSessionCookie() } }
    );
  }

  if (action === "refresh") {
    const session = parseSession(req.headers.get("cookie"));
    if (!session?.refreshToken) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }
    try {
      const auth = await refreshAccessToken(session.refreshToken);
      const newSession: SessionData = {
        ...session,
        token: auth.token,
        refreshToken: auth.refreshToken,
        expiresAt: Date.now() + auth.expiresIn * 1000,
      };
      return NextResponse.json(
        { ok: true },
        { headers: { "Set-Cookie": serializeSession(newSession) } }
      );
    } catch {
      return NextResponse.json(
        { error: "Refresh failed" },
        {
          status: 401,
          headers: { "Set-Cookie": clearSessionCookie() },
        }
      );
    }
  }

  // Login
  const { clientId, clientSecret, companyCode, facilityCode } = body as {
    clientId?: string;
    clientSecret?: string;
    companyCode?: string;
    facilityCode?: string;
  };

  if (!clientId || !clientSecret || !companyCode || !facilityCode) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const auth = await loginWithCredentials(clientId, clientSecret);
    const session: SessionData = {
      token: auth.token,
      refreshToken: auth.refreshToken,
      expiresAt: Date.now() + auth.expiresIn * 1000,
      companyCode,
      facilityCode,
    };

    return NextResponse.json(
      { ok: true },
      { headers: { "Set-Cookie": serializeSession(session) } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
