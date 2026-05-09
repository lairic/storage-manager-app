import { NextRequest, NextResponse } from "next/server";
import { parseTokens, isExpired } from "@/lib/tokens";
import {
  getJournalEntries,
  getLeases,
  getReservations,
  getUnitCounts,
} from "@/lib/api-client";
import { todayISO, firstDayOfMonth, firstDayOfLastMonth, sameDayLastMonth } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const companyCode = searchParams.get("companyCode");
  const facilityCode = searchParams.get("facilityCode");
  const date = searchParams.get("date") ?? todayISO();

  if (!companyCode || !facilityCode) {
    return NextResponse.json(
      { error: "companyCode and facilityCode are required" },
      { status: 400 }
    );
  }

  const tokens = parseTokens(req.headers.get("cookie"));
  const ct = tokens[companyCode];

  if (!ct) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isExpired(ct)) {
    return NextResponse.json(
      { error: "Token expired", code: "TOKEN_EXPIRED", companyCode },
      { status: 401 }
    );
  }

  const mtdFrom = firstDayOfMonth(date);
  const prevMonthFrom = firstDayOfLastMonth(date);
  const prevMonthTo = sameDayLastMonth(date);

  try {
    const [revenue, revenueMTD, revenueMTDPrevMonth, moveIns, moveOuts, reservations, occupancy] =
      await Promise.all([
        getJournalEntries(ct.token, companyCode, facilityCode, date),
        getJournalEntries(ct.token, companyCode, facilityCode, mtdFrom, date),
        getJournalEntries(ct.token, companyCode, facilityCode, prevMonthFrom, prevMonthTo),
        getLeases(ct.token, companyCode, facilityCode, {
          MoveInDateFrom: date,
          MoveInDateTo: date,
          Page: 0,
          Size: 50,
        }),
        getLeases(ct.token, companyCode, facilityCode, {
          Status: "Terminated",
          SortBy: "moveOutDate:desc",
          Page: 0,
          Size: 100,
        }),
        getReservations(ct.token, companyCode, facilityCode, 0, 25),
        getUnitCounts(ct.token, companyCode, facilityCode).catch(() => undefined),
      ]);

    // API ignores MoveOutDateFrom/To — filter terminated leases client-side by date prefix
    const todayMoveOuts = moveOuts.results.filter(
      (l) => l.moveOutDate?.slice(0, 10) === date
    );
    const filteredMoveOuts = { ...moveOuts, results: todayMoveOuts, totalCount: todayMoveOuts.length };
    return NextResponse.json({ date, companyCode, facilityCode, revenue, revenueMTD, revenueMTDPrevMonth, moveIns, moveOuts: filteredMoveOuts, reservations, occupancy });
  } catch (err) {
    const message = err instanceof Error ? err.message : "API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
