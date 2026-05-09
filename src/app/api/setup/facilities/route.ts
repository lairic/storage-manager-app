import { NextRequest, NextResponse } from "next/server";
import { parseTokens } from "@/lib/tokens";
import { getFacilities } from "@/lib/api-client";

export async function GET(req: NextRequest) {
  const companyCode = req.nextUrl.searchParams.get("companyCode");
  if (!companyCode) {
    return NextResponse.json({ error: "Missing companyCode" }, { status: 400 });
  }

  const tokens = parseTokens(req.headers.get("cookie"));
  const ct = tokens[companyCode];
  if (!ct) {
    return NextResponse.json(
      { error: "Not authenticated for this company" },
      { status: 401 }
    );
  }

  try {
    const data = await getFacilities(ct.token, companyCode);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
