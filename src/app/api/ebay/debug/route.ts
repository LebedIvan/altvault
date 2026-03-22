export const dynamic = "force-dynamic";
/**
 * eBay API diagnostic endpoint.
 * GET /api/ebay/debug?q=LEGO+21336
 */
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q      = searchParams.get("q") ?? "LEGO 21336 set";
  const appId  = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;

  const result: Record<string, unknown> = {
    appIdSet:  !!appId,
    certIdSet: !!certId,
    appIdPrefix: appId ? appId.slice(0, 12) + "..." : null,
    query: q,
  };

  // ── Test Browse API (OAuth) ───────────────────────────────────────────────
  if (appId && certId) {
    try {
      const creds  = Buffer.from(`${appId}:${certId}`).toString("base64");
      const tokRes = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
        method: "POST",
        headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
      });
      const tokJson = await tokRes.json() as { access_token?: string; error?: string };
      result.browseTokenStatus = tokRes.status;
      result.browseTokenOk     = tokRes.ok;
      if (tokRes.ok && tokJson.access_token) {
        // Test Browse search
        const srchRes = await fetch(
          `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(q)}&limit=3`,
          { headers: { Authorization: `Bearer ${tokJson.access_token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" } },
        );
        const srchJson = await srchRes.json() as { total?: number; itemSummaries?: unknown[] };
        result.browseSearchStatus = srchRes.status;
        result.browseSearchOk     = srchRes.ok;
        result.browseTotal        = srchJson.total;
        result.browseItemCount    = srchJson.itemSummaries?.length ?? 0;
      } else {
        result.browseTokenError = tokJson.error;
      }
    } catch (err) {
      result.browseError = String(err);
    }
  }

  // ── Test Finding API (findCompletedItems) ────────────────────────────────
  if (appId) {
    const params = new URLSearchParams({
      "OPERATION-NAME": "findCompletedItems", "SERVICE-VERSION": "1.0.0",
      "SECURITY-APPNAME": appId, "RESPONSE-DATA-FORMAT": "JSON",
      "keywords": q, "itemFilter(0).name": "SoldItemsOnly", "itemFilter(0).value": "true",
      "paginationInput.entriesPerPage": "3",
    });
    try {
      const res  = await fetch(`https://svcs.ebay.com/services/search/FindingService/v1?${params}`, { headers: { "User-Agent": "Vaulty/1.0" } });
      const text = await res.text();
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 200); }
      result.findingStatus   = res.status;
      result.findingOk       = res.ok;
      result.findingResponse = parsed;
    } catch (err) {
      result.findingError = String(err);
    }
  }

  return NextResponse.json(result);
}
