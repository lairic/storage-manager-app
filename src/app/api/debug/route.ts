import { NextRequest, NextResponse } from "next/server";
import { parseTokens } from "@/lib/tokens";
import { todayISO } from "@/lib/utils";

const BASE_URL = process.env.STORAGE_API_BASE_URL ?? "";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const companyCode = searchParams.get("companyCode") ?? "";
  const facilityCode = searchParams.get("facilityCode") ?? "";
  const date = searchParams.get("date") ?? todayISO();

  const tokens = parseTokens(req.headers.get("cookie"));
  const ct = tokens[companyCode];
  if (!ct) {
    return NextResponse.json({ error: "No token for company", companyCode, availableCompanies: Object.keys(tokens) });
  }

  const results: Record<string, unknown> = {
    baseUrl: BASE_URL,
    companyCode,
    facilityCode,
    date,
    tokenPresent: true,
    tokenExpiresAt: new Date(ct.expiresAt).toISOString(),
  };

  // Test 1: journal entries with query params
  const qs = new URLSearchParams({ fromDate: date, toDate: date });
  const url = `${BASE_URL}/api/v2/companies/${companyCode}/facilities/${facilityCode}/reports/journal-entries?${qs}`;
  results.journalEntriesUrl = url;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${ct.token}`,
      },
    });
    results.journalEntriesStatus = res.status;
    results.journalEntriesHeaders = Object.fromEntries(res.headers.entries());
    const text = await res.text();
    try {
      results.journalEntriesBody = JSON.parse(text);
    } catch {
      results.journalEntriesBodyRaw = text.slice(0, 1000);
    }
  } catch (err) {
    results.journalEntriesError = err instanceof Error ? err.message : String(err);
  }

  // Test 2: leases move-outs
  const leasesUrl = `${BASE_URL}/api/v2/companies/${companyCode}/facilities/${facilityCode}/leases?MoveOutDateFrom=${date}&MoveOutDateTo=${date}&Page=0&Size=10`;
  results.leasesUrl = leasesUrl;

  try {
    const res = await fetch(leasesUrl, {
      headers: { Accept: "application/json", Authorization: `Bearer ${ct.token}` },
    });
    results.leasesStatus = res.status;
    const text = await res.text();
    try {
      results.leasesBody = JSON.parse(text);
    } catch {
      results.leasesBodyRaw = text.slice(0, 1000);
    }
  } catch (err) {
    results.leasesError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(results, { headers: { "Content-Type": "application/json" } });
}
