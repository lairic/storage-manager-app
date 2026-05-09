// Auth
export interface AuthToken {
  token: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string | null;
}

export interface SessionData {
  token: string;
  refreshToken: string | null;
  expiresAt: number;
  companyCode: string;
  facilityCode: string;
}

// Revenue / Journal Entries
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

// Leases (move-ins / move-outs)
export type LeaseStatus = "Pending" | "Active" | "Discarded" | "Terminated";
export type LeaseType = "MoveIn" | "Transfer" | "Migration";

export interface TenantSummary {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

export interface UnitSummary {
  unitNumber: string;
  unitGroupName?: string;
}

export interface Lease {
  id: string;
  status: LeaseStatus;
  type: LeaseType;
  moveInDate: string | null;
  moveOutDate: string | null;
  tenant: TenantSummary;
  unit: UnitSummary;
  monthlyRate: number;
}

export interface PaginatedResponse<T> {
  results: T[];
  totalCount: number;
  page: number;
  size: number;
}

// Reservations
export type ReservationStatus = "Active" | "Canceled" | "Converted";

export interface Reservation {
  id: string;
  facilityId: string;
  unit: {
    unitNumber: string;
    unitGroupName?: string;
  };
  reservedUntil: string;
  status: ReservationStatus;
  leadSourceId: string;
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

// Tenant Notes (communications)
export interface TenantNote {
  id: string;
  text: string;
  createdAt: string;
  createdBy: string;
  endUserId: string;
  tenantName?: string;
}

// Dashboard aggregate
export interface DashboardData {
  date: string;
  revenue: JournalEntriesReport;
  moveIns: PaginatedResponse<Lease>;
  moveOuts: PaginatedResponse<Lease>;
  reservations: PaginatedResponse<Reservation>;
  recentNotes: TenantNote[];
}
