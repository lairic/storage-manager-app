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
  date: string
): Promise<JournalEntriesReport> {
  return request<JournalEntriesReport>(
    `/api/v2/companies/${companyCode}/facilities/${facilityCode}/reports/journal-entries`,
    token,
    {
      method: "GET",
      body: JSON.stringify({ fromDate: date, toDate: date }),
    }
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
