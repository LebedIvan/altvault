export const dynamic = "force-dynamic";
/**
 * eBay API diagnostic endpoint.
 * GET /api/ebay/debug?q=LEGO+21336
 * Returns raw eBay Finding API response for debugging.
 */
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "LEGO 21336 set";
  const appId = process.env.EBAY_APP_ID;

  if (!appId) {
    return NextResponse.json({ error: "EBAY_APP_ID is not set" }, { status: 200 });
  }

  const params = new URLSearchParams({
    "OPERATION-NAME":                 "findCompletedItems",
    "SERVICE-VERSION":                "1.0.0",
    "SECURITY-APPNAME":               appId,
    "RESPONSE-DATA-FORMAT":           "JSON",
    "keywords":                       q,
    "itemFilter(0).name":             "SoldItemsOnly",
    "itemFilter(0).value":            "true",
    "sortOrder":                      "EndTimeSoonest",
    "paginationInput.entriesPerPage": "5",
  });

  const url = `https://svcs.ebay.com/services/search/FindingService/v1?${params}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "User-Agent": "Vaulty/1.0" },
        signal: controller.signal,
      });
    } finally { clearTimeout(timer); }

    const text = await res.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(text); } catch { /* not JSON */ }

    return NextResponse.json({
      appIdPrefix: appId.slice(0, 12) + "...",
      httpStatus: res.status,
      ok: res.ok,
      query: q,
      requestUrl: url.replace(appId, "[REDACTED]"),
      rawResponse: parsed ?? text.slice(0, 500),
    });
  } catch (err) {
    return NextResponse.json({
      appIdPrefix: appId.slice(0, 12) + "...",
      error: String(err),
    });
  }
}
