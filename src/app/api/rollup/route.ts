import { NextRequest, NextResponse } from "next/server";
import { parseTokens, isExpired } from "@/lib/tokens";
import {
  getJournalEntries,
  getLeases,
  getReservations,
  getUnitCounts,
} from "@/lib/api-client";
import { todayISO, firstDayOfMonth, firstDayOfLastMonth, sameDayLastMonth } from "@/lib/utils";
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
  date: string,
  revenueFrom: string,
  revenueTo: string
): Promise<FacilityDashboardData> {
  const mtdFrom = firstDayOfMonth(date);
  const prevMonthFrom = firstDayOfLastMonth(date);
  const prevMonthTo = sameDayLastMonth(date);
  try {
    const [revenue, revenueMTD, revenueMTDPrevMonth, moveIns, moveOuts, reservations, occupancy] =
      await Promise.all([
        getJournalEntries(token, companyCode, facilityCode, revenueFrom, revenueTo),
        getJournalEntries(token, companyCode, facilityCode, mtdFrom, date),
        getJournalEntries(token, companyCode, facilityCode, prevMonthFrom, prevMonthTo),
        getLeases(token, companyCode, facilityCode, {
          MoveInDateFrom: date,
          MoveInDateTo: date,
          Page: 0,
          Size: 50,
        }),
        getLeases(token, companyCode, facilityCode, {
          Status: "Terminated",
          SortBy: "moveOutDate:desc",
          Page: 0,
          Size: 100,
        }),
        getReservations(token, companyCode, facilityCode, 0, 25),
        getUnitCounts(token, companyCode, facilityCode).catch(() => undefined),
      ]);
    // API ignores MoveOutDateFrom/To — filter terminated leases client-side by date prefix
    const todayMoveOuts = moveOuts.results.filter(
      (l) => l.moveOutDate?.slice(0, 10) === date
    );
    const filteredMoveOuts = { ...moveOuts, results: todayMoveOuts, totalCount: todayMoveOuts.length };
    return { companyCode, facilityCode, facilityName, revenue, revenueMTD, revenueMTDPrevMonth, moveIns, moveOuts: filteredMoveOuts, reservations, occupancy };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    const empty = { debitTotal: 0, creditTotal: 0, journalEntries: [] };
    return {
      companyCode, facilityCode, facilityName, error,
      revenue: empty, revenueMTD: empty, revenueMTDPrevMonth: empty,
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
    revenueFrom?: string;
    revenueTo?: string;
  };

  const date = body.date ?? todayISO();
  const targets: RollupTarget[] = body.targets ?? [];
  const revenueFrom = body.revenueFrom ?? date;
  const revenueTo = body.revenueTo ?? date;

  if (targets.length === 0) {
    return NextResponse.json({ error: "No targets provided" }, { status: 400 });
  }

  const tokens = parseTokens(req.headers.get("cookie"));

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

  const facilities = await Promise.all(
    targets.map(({ companyCode, facilityCode, facilityName }) =>
      fetchOneFacility(
        tokens[companyCode].token,
        companyCode,
        facilityCode,
        facilityName,
        date,
        revenueFrom,
        revenueTo
      )
    )
  );

  const summary: RollupSummary = facilities.reduce(
    (acc, f) => ({
      creditTotal: acc.creditTotal + (f.revenue?.creditTotal ?? 0),
      debitTotal: acc.debitTotal + (f.revenue?.debitTotal ?? 0),
      mtdCreditTotal: acc.mtdCreditTotal + (f.revenueMTD?.creditTotal ?? 0),
      prevMonthMTDCreditTotal: acc.prevMonthMTDCreditTotal + (f.revenueMTDPrevMonth?.creditTotal ?? 0),
      totalMoveIns: acc.totalMoveIns + (f.moveIns?.totalCount ?? 0),
      totalMoveOuts: acc.totalMoveOuts + (f.moveOuts?.totalCount ?? 0),
      totalReservations: acc.totalReservations + (f.reservations?.totalCount ?? 0),
    }),
    { creditTotal: 0, debitTotal: 0, mtdCreditTotal: 0, prevMonthMTDCreditTotal: 0, totalMoveIns: 0, totalMoveOuts: 0, totalReservations: 0 }
  );

  const response: RollupResponse = { date, summary, facilities };
  return NextResponse.json(response);
}
