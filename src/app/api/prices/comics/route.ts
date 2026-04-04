export const dynamic = "force-dynamic";
/**
 * Comics price lookup.
 *
 * Strategy:
 *   1. Look up the comic in DB by cvId — return cached price if updated within 24h.
 *   2. Otherwise, call fetchEbaySold (Browse API → Finding API, with 24h cache).
 *   3. Fall back to ComicVine for unknown comics to resolve volume/issue.
 *
 * GET /api/prices/comics?id=92090
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchEbaySold } from "@/lib/ebaySold";

const QuerySchema = z.object({
  id: z.string().min(1).max(20),
});

const PRICE_FRESH_MS = 24 * 60 * 60 * 1000; // 24h

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({ id: searchParams.get("id") });
  if (!parsed.success)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const cvId = parsed.data.id.replace(/^cv-/, "");

  // 1. Resolve comic metadata from DB; return cached price if still fresh
  const { getByCvId } = await import("@/lib/comicsDb");
  const record = await getByCvId(cvId);

  if (record?.priceRawCents != null && record.priceUpdatedAt) {
    const age = Date.now() - new Date(record.priceUpdatedAt).getTime();
    if (age < PRICE_FRESH_MS) {
      return NextResponse.json({
        priceCents: record.priceRawCents,
        currency:   record.priceCurrency ?? "USD",
        source:     record.priceSource   ?? "ebay",
        query:      `${record.volumeName} #${record.issueNumber}`,
      });
    }
  }

  // 2. Resolve volume + issue number for the eBay query
  let volumeName:  string | null = record?.volumeName  ?? null;
  let issueNumber: string | null = record?.issueNumber ?? null;

  if (!volumeName || !issueNumber) {
    const key = process.env.COMICVINE_API_KEY;
    if (key) {
      try {
        const res = await fetch(
          `https://comicvine.gamespot.com/api/issue/4000-${cvId}/?api_key=${key}&format=json&field_list=issue_number,volume`,
          { headers: { "User-Agent": "Vaulty/1.0" } },
        );
        if (res.ok) {
          const data = await res.json() as {
            results?: { issue_number: string; volume: { name: string } };
          };
          if (data.results) {
            volumeName  = data.results.volume.name;
            issueNumber = data.results.issue_number;
          }
        }
      } catch { /* skip */ }
    }
  }

  if (!volumeName || !issueNumber) {
    return NextResponse.json({ error: "Comic not found" }, { status: 404 });
  }

  // 3. Fetch live eBay price (Browse → Finding, with 24h DB cache)
  const ebayQuery = `"${volumeName} #${issueNumber}" comic book`;
  const data = await fetchEbaySold(ebayQuery);

  if (data && data.trendingPrice != null) {
    return NextResponse.json({
      priceCents: Math.round(data.trendingPrice * 100),
      currency:   data.currency,
      source:     data.source,
      query:      ebayQuery,
    });
  }

  return NextResponse.json({
    priceCents: null,
    currency:   "USD",
    source:     "unavailable",
    query:      ebayQuery,
    error:      process.env.EBAY_APP_ID
      ? "No recent eBay sales found. Enter price manually."
      : "Set EBAY_APP_ID for live eBay sold price data.",
  });
}
