import { NextRequest, NextResponse } from "next/server";
import { parseSession, isTokenExpired } from "@/lib/session";
import {
  getJournalEntries,
  getLeases,
  getReservations,
} from "@/lib/api-client";
import { todayISO } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = parseSession(req.headers.get("cookie"));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isTokenExpired(session)) {
    return NextResponse.json(
      { error: "Token expired", code: "TOKEN_EXPIRED" },
      { status: 401 }
    );
  }

  const { token, companyCode, facilityCode } = session;
  const date = req.nextUrl.searchParams.get("date") ?? todayISO();

  try {
    const [revenue, moveIns, moveOuts, reservations] = await Promise.all([
      getJournalEntries(token, companyCode, facilityCode, date),
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

    return NextResponse.json({
      date,
      revenue,
      moveIns,
      moveOuts,
      reservations,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
