import type { SessionData } from "./types";

const COOKIE_NAME = "storage_session";

// Server-side: parse session from raw cookie string
export function parseSession(cookieHeader: string | null): SessionData | null {
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));

  if (!cookie) return null;

  try {
    const value = cookie.slice(COOKIE_NAME.length + 1);
    return JSON.parse(decodeURIComponent(value)) as SessionData;
  } catch {
    return null;
  }
}

export function serializeSession(data: SessionData): string {
  const value = encodeURIComponent(JSON.stringify(data));
  const maxAge = Math.floor((data.expiresAt - Date.now()) / 1000);
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function isTokenExpired(session: SessionData): boolean {
  // Refresh 60 seconds before expiry
  return Date.now() >= session.expiresAt - 60_000;
}
