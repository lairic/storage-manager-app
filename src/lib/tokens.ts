import type { TokenMap, CompanyToken } from "./types";

const COOKIE_NAME = "storage_tokens";

export function parseTokens(cookieHeader: string | null): TokenMap {
  if (!cookieHeader) return {};
  const cookie = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return {};
  try {
    return JSON.parse(
      decodeURIComponent(cookie.slice(COOKIE_NAME.length + 1))
    ) as TokenMap;
  } catch {
    return {};
  }
}

export function serializeTokens(tokens: TokenMap): string {
  const value = encodeURIComponent(JSON.stringify(tokens));
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
    30 * 24 * 3600
  }`;
}

export function clearTokenCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function hasAnyToken(tokens: TokenMap): boolean {
  return Object.keys(tokens).length > 0;
}

export function isExpired(ct: CompanyToken): boolean {
  return Date.now() >= ct.expiresAt - 60_000;
}

export function getToken(
  tokens: TokenMap,
  companyCode: string
): CompanyToken | undefined {
  return tokens[companyCode];
}

export function setToken(
  tokens: TokenMap,
  companyCode: string,
  ct: CompanyToken
): TokenMap {
  return { ...tokens, [companyCode]: ct };
}

export function removeToken(tokens: TokenMap, companyCode: string): TokenMap {
  const next = { ...tokens };
  delete next[companyCode];
  return next;
}
