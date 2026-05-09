import { NextRequest, NextResponse } from "next/server";
import { parseTokens, isExpired } from "@/lib/tokens";
import {
  getJournalEntries,
  getLeases,
  getReservations,
} from "@/lib/api-client";
import { todayISO, firstDayOfMonth, sameDayLastMonth } from "@/lib/utils";
import type {
  FacilityDashboardData,
  RollupResponse,
  RollupSummary,
} from "@/lib/types";

interface RollupTarget {
  companyCode: string;
  facilityCode: string;
  facilityName: string;
}

async function fetchOneFacility(
  token: string,
  companyCode: string,
  facilityCode: string,
  facilityName: string,
  date: string
): Promise<FacilityDashboardData> {
  const mtdFrom = firstDayOfMonth(date);
  const prevDay = sameDayLastMonth(date);
  try {
    const [revenue, revenueMTD, revenuePrevDay, moveIns, moveOuts, reservations] =
      await Promise.all([
        getJournalEntries(token, companyCode, facilityCode, date),
        getJournalEntries(token, companyCode, facilityCode, mtdFrom, date),
        getJournalEntries(token, companyCode, facilityCode, prevDay),
        getLeases(token, companyCode, facilityCode, {
          MoveInDateFrom: date,
          MoveInDateTo: date,
          Page: 0,
          Size: 50,
        }),
        getLeases(token, companyCode, facilityCode, {
          MoveOutDateFrom: date,
          MoveOutDateTo: date,
          Page: 0,
          Size: 50,
        }),
        getReservations(token, companyCode, facilityCode, 0, 25),
      ]);
    return { companyCode, facilityCode, facilityName, revenue, revenueMTD, revenuePrevDay, moveIns, moveOuts, reservations };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    const empty = { debitTotal: 0, creditTotal: 0, journalEntries: [] };
    return {
      companyCode, facilityCode, facilityName, error,
      revenue: empty, revenueMTD: empty, revenuePrevDay: empty,
      moveIns: { results: [], totalCount: 0, page: 0, size: 0 },
      moveOuts: { results: [], totalCount: 0, page: 0, size: 0 },
      reservations: { results: [], totalCount: 0, page: 0, size: 0 },
    };
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    date?: string;
    targets?: RollupTarget[];
  };

  const date = body.date ?? todayISO();
  const targets: RollupTarget[] = body.targets ?? [];

  if (targets.length === 0) {
    return NextResponse.json({ error: "No targets provided" }, { status: 400 });
  }

  const tokens = parseTokens(req.headers.get("cookie"));

  // Check all required tokens are present and not expired
  for (const { companyCode } of targets) {
    const ct = tokens[companyCode];
    if (!ct) {
      return NextResponse.json(
        { error: `Not authenticated for company ${companyCode}`, code: "UNAUTHORIZED", companyCode },
        { status: 401 }
      );
    }
    if (isExpired(ct)) {
      return NextResponse.json(
        { error: `Token expired for company ${companyCode}`, code: "TOKEN_EXPIRED", companyCode },
        { status: 401 }
      );
    }
  }

  // Fetch all facilities in parallel
  const facilities = await Promise.all(
    targets.map(({ companyCode, facilityCode, facilityName }) =>
      fetchOneFacility(
        tokens[companyCode].token,
        companyCode,
        facilityCode,
        facilityName,
        date
      )
    )
  );

  // Aggregate summary
  const summary: RollupSummary = facilities.reduce(
    (acc, f) => ({
      creditTotal: acc.creditTotal + (f.revenue?.creditTotal ?? 0),
      debitTotal: acc.debitTotal + (f.revenue?.debitTotal ?? 0),
      mtdCreditTotal: acc.mtdCreditTotal + (f.revenueMTD?.creditTotal ?? 0),
      prevDayCreditTotal: acc.prevDayCreditTotal + (f.revenuePrevDay?.creditTotal ?? 0),
      totalMoveIns: acc.totalMoveIns + (f.moveIns?.totalCount ?? 0),
      totalMoveOuts: acc.totalMoveOuts + (f.moveOuts?.totalCount ?? 0),
      totalReservations: acc.totalReservations + (f.reservations?.totalCount ?? 0),
    }),
    { creditTotal: 0, debitTotal: 0, mtdCreditTotal: 0, prevDayCreditTotal: 0, totalMoveIns: 0, totalMoveOuts: 0, totalReservations: 0 }
  );

  const response: RollupResponse = { date, summary, facilities };
  return NextResponse.json(response);
}
