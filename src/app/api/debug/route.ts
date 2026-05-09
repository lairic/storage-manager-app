import { NextRequest, NextResponse } from "next/server";
import { parseTokens } from "@/lib/tokens";
import { todayISO } from "@/lib/utils";
import https from "node:https";

const BASE_URL = process.env.STORAGE_API_BASE_URL ?? "";

function nodeGet(url: string, token: string, body?: object): Promise<{ status: number; data: unknown; raw: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = body ? JSON.stringify(body) : undefined;
    const headers: Record<string, string | number> = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (payload) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = https.request(
      { hostname: parsed.hostname, port: 443, path: parsed.pathname + parsed.search, method: "GET", headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf-8");
          let data: unknown = raw;
          try { data = JSON.parse(raw); } catch { /* keep raw */ }
          resolve({ status: res.statusCode ?? 0, data, raw: raw.slice(0, 500) });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const companyCode = searchParams.get("companyCode") ?? "";
  const facilityCode = searchParams.get("facilityCode") ?? "";
  const date = searchParams.get("date") ?? todayISO();

  const tokens = parseTokens(req.headers.get("cookie"));
  const ct = tokens[companyCode];
  if (!ct) {
    return NextResponse.json({ error: "No token", available: Object.keys(tokens) });
  }

  const token = ct.token;
  const results: Record<string, unknown> = { baseUrl: BASE_URL, date };

  // 1. Journal entries with JSON body (node:https)
  try {
    const r = await nodeGet(
      `${BASE_URL}/api/v2/companies/${companyCode}/facilities/${facilityCode}/reports/journal-entries`,
      token,
      { fromDate: date, toDate: date }
    );
    results.journalEntries = { status: r.status, body: r.data };
  } catch (e) { results.journalEntriesError = String(e); }

  // 2. Leases — MoveOutDateFrom filter
  try {
    const r = await nodeGet(
      `${BASE_URL}/api/v2/companies/${companyCode}/facilities/${facilityCode}/leases?MoveOutDateFrom=${date}&MoveOutDateTo=${date}&Page=0&Size=10`,
      token
    );
    results.leasesMoveOut = { status: r.status, body: r.data };
  } catch (e) { results.leasesMoveOutError = String(e); }

  // 3. Leases — first page, no filter (see real field names)
  try {
    const r = await nodeGet(
      `${BASE_URL}/api/v2/companies/${companyCode}/facilities/${facilityCode}/leases?Page=0&Size=5`,
      token
    );
    results.leasesAll = { status: r.status, body: r.data };
  } catch (e) { results.leasesAllError = String(e); }

  // 4. Leases — MoveInDateFrom filter (verify it works)
  try {
    const r = await nodeGet(
      `${BASE_URL}/api/v2/companies/${companyCode}/facilities/${facilityCode}/leases?MoveInDateFrom=${date}&MoveInDateTo=${date}&Page=0&Size=10`,
      token
    );
    results.leasesMoveIn = { status: r.status, body: r.data };
  } catch (e) { results.leasesMoveInError = String(e); }

  return NextResponse.json(results);
}
