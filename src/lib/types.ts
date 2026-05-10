// ── Stored config (localStorage) ─────────────────────────────────────────────

export interface StoredFacility {
  facilityCode: string;
  facilityId: string;
  name: string;
  timeZoneId: string;
  isActive: boolean;
}

export interface StoredCompany {
  id: string;           // local UUID, stable client-side identifier
  name: string;         // user-facing label
  companyCode: string;  // used in API paths
  clientId?: string;    // saved for reconnect pre-fill (not sensitive)
  facilities: StoredFacility[];
  addedAt: number;
}

export type CardId =
  | "revenue"
  | "move-ins"
  | "move-outs"
  | "reservations"
  | "communications";

export interface CardPref {
  id: CardId;
  enabled: boolean;
  order: number;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthToken {
  token: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string | null;
}

export interface CompanyToken {
  token: string;
  refreshToken: string | null;
  expiresAt: number;
}

export type TokenMap = Record<string, CompanyToken>; // keyed by companyCode

// ── API: Revenue / Journal Entries ────────────────────────────────────────────

export interface JournalEntryResponse {
  accountType: string;
  accountName: string;
  debit: number;
  credit: number;
  facilityCode?: string;
  facilityName?: string;
}

export interface JournalEntriesReport {
  debitTotal: number;
  creditTotal: number;
  journalEntries: JournalEntryResponse[];
}

// ── API: Leases (move-ins / move-outs) ────────────────────────────────────────

export type LeaseStatus = "Pending" | "Active" | "Discarded" | "Terminated";
export type LeaseType = "MoveIn" | "Transfer" | "Migration";

export interface TenantSummary {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
}

export interface UnitSummary {
  id?: string;
  number: string;
  availabilityStatus?: string;
  unitType?: { id?: string; name: string };
}

export interface Lease {
  id: string;
  status: LeaseStatus;
  leaseType: string;
  moveInDate: string | null;
  moveOutDate?: string | null;
  tenant: TenantSummary;
  unit: UnitSummary;
  effectiveRate: number;
  balanceDue?: number;
  paidThroughDate?: string;
  moveOutReason?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  processedBy?: string;
  leadSource?: string;
  leadSourceId?: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  totalCount: number;
  page: number;
  size: number;
}

// ── API: Reservations ─────────────────────────────────────────────────────────

export type ReservationStatus = "Active" | "Canceled" | "Converted";

export interface Reservation {
  id: string;
  facilityId?: string;
  unit: {
    number?: string;
    unitNumber?: string;
    unitGroupName?: string;
    unitType?: { id?: string; name: string };
  };
  reservedUntil: string;
  status: ReservationStatus;
  leadSourceId?: string;
  leadSource?: string;
  endUser: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    status: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ── API: Tenant Notes ─────────────────────────────────────────────────────────

export interface TenantNote {
  id: string;
  text: string;
  createdAt: string;
  createdBy: string;
  endUserId: string;
  tenantName?: string;
}

// ── Occupancy ─────────────────────────────────────────────────────────────────

export interface OccupancyData {
  occupied: number;
  vacant: number;
  total: number;
}

// ── API: Facilities ───────────────────────────────────────────────────────────

export interface FacilityResponse {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  location: { lat: number; lng: number; timeZoneId: string };
  tenantPortalUrl?: string;
}

// ── Dashboard aggregates ──────────────────────────────────────────────────────

export interface FacilityDashboardData {
  companyCode: string;
  facilityCode: string;
  facilityName: string;
  revenue: JournalEntriesReport;
  revenueMTD: JournalEntriesReport;
  revenueMTDPrevMonth: JournalEntriesReport;
  moveIns: PaginatedResponse<Lease>;
  moveOuts: PaginatedResponse<Lease>;
  reservations: PaginatedResponse<Reservation>;
  occupancy?: OccupancyData;
  error?: string;
}

export interface RollupSummary {
  creditTotal: number;
  debitTotal: number;
  mtdCreditTotal: number;
  prevMonthMTDCreditTotal: number;
  totalMoveIns: number;
  totalMoveOuts: number;
  totalReservations: number;
}

export interface RollupResponse {
  date: string;
  summary: RollupSummary;
  facilities: FacilityDashboardData[];
}
