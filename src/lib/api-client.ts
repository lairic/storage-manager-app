import https from "node:https";
import http from "node:http";
import type {
  AuthToken,
  FacilityResponse,
  JournalEntriesReport,
  Lease,
  PaginatedResponse,
  Reservation,
  TenantNote,
} from "./types";

const BASE_URL = process.env.STORAGE_API_BASE_URL ?? "";

// Standard fetch-based request (no body on GET)
async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Node.js https.request — used for GET endpoints that require a JSON body,
// which the WHATWG fetch spec (and Node 18+ undici) disallows.
function nodeRequest<T>(
  path: string,
  token: string,
  body: object,
  method = "GET"
): Promise<T> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const payload = JSON.stringify(body);
    const isHttps = url.protocol === "https:";
    const mod = isHttps ? https : http;

    const req = mod.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf-8");
          if ((res.statusCode ?? 0) >= 400) {
            reject(new Error(`API ${res.statusCode}: ${text}`));
            return;
          }
          try {
            resolve(JSON.parse(text) as T);
          } catch {
            reject(new Error(`Non-JSON response: ${text.slice(0, 200)}`));
          }
        });
      }
    );

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function loginWithCredentials(
  clientId: string,
  clientSecret: string
): Promise<AuthToken> {
  const res = await fetch(`${BASE_URL}/api/v2/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grantType: "Client_Credentials",
      clientId,
      clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || "Invalid credentials");
  }

  return res.json();
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<AuthToken> {
  const res = await fetch(`${BASE_URL}/api/v2/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ grantType: "Refresh_Token", refreshToken }),
  });

  if (!res.ok) throw new Error("Token refresh failed");
  return res.json();
}

// ── Facilities ────────────────────────────────────────────────────────────────

export async function getFacilities(
  token: string,
  companyCode: string
): Promise<PaginatedResponse<FacilityResponse>> {
  return request<PaginatedResponse<FacilityResponse>>(
    `/api/v2/companies/${companyCode}/facilities?Page=0&Size=100`,
    token
  );
}

// ── Revenue / Journal Entries ─────────────────────────────────────────────────

export async function getJournalEntries(
  token: string,
  companyCode: string,
  facilityCode: string,
  fromDate: string,
  toDate?: string
): Promise<JournalEntriesReport> {
  // Spec requires GET with a JSON body (Content-Type: application/json).
  // Node.js fetch rejects GET bodies, so we use node:https directly.
  return nodeRequest<JournalEntriesReport>(
    `/api/v2/companies/${companyCode}/facilities/${facilityCode}/reports/journal-entries`,
    token,
    { fromDate, toDate: toDate ?? fromDate }
  );
}

// ── Leases (move-ins / move-outs) ─────────────────────────────────────────────

export async function getLeases(
  token: string,
  companyCode: string,
  facilityCode: string,
  params: {
    MoveInDateFrom?: string;
    MoveInDateTo?: string;
    MoveOutDateFrom?: string;
    MoveOutDateTo?: string;
    Page?: number;
    Size?: number;
  }
): Promise<PaginatedResponse<Lease>> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) qs.set(k, String(v));
  });
  return request<PaginatedResponse<Lease>>(
    `/api/v2/companies/${companyCode}/facilities/${facilityCode}/leases?${qs}`,
    token
  );
}

// ── Reservations ──────────────────────────────────────────────────────────────

export async function getReservations(
  token: string,
  companyCode: string,
  facilityCode: string,
  page = 0,
  size = 25
): Promise<PaginatedResponse<Reservation>> {
  const qs = new URLSearchParams({
    Statuses: "Active",
    Page: String(page),
    Size: String(size),
  });
  return request<PaginatedResponse<Reservation>>(
    `/api/v2/companies/${companyCode}/facilities/${facilityCode}/reservations?${qs}`,
    token
  );
}

// ── Tenant Notes ──────────────────────────────────────────────────────────────

export async function getTenantNotes(
  token: string,
  companyCode: string,
  facilityCode: string,
  endUserId: string
): Promise<TenantNote[]> {
  return request<TenantNote[]>(
    `/api/v2/companies/${companyCode}/facilities/${facilityCode}/end-users/${endUserId}/notes`,
    token
  );
}
