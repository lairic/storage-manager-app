import { NextRequest, NextResponse } from "next/server";
import { parseTokens, isExpired } from "@/lib/tokens";
import {
  getJournalEntries,
  getLeases,
  getReservations,
} from "@/lib/api-client";
import { todayISO } from "@/lib/utils";

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

  try {
    const [revenue, moveIns, moveOuts, reservations] = await Promise.all([
      getJournalEntries(ct.token, companyCode, facilityCode, date),
      getLeases(ct.token, companyCode, facilityCode, {
        MoveInDateFrom: date,
        MoveInDateTo: date,
        Page: 0,
        Size: 50,
      }),
      getLeases(ct.token, companyCode, facilityCode, {
        MoveOutDateFrom: date,
        MoveOutDateTo: date,
        Page: 0,
        Size: 50,
      }),
      getReservations(ct.token, companyCode, facilityCode, 0, 25),
    ]);

    return NextResponse.json({ date, companyCode, facilityCode, revenue, moveIns, moveOuts, reservations });
  } catch (err) {
    const message = err instanceof Error ? err.message : "API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
