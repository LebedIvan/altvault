/**
 * Comics price lookup.
 *
 * Strategy:
 *   1. Look up the comic in our local comics-db (data/comics-db.json) by cvId.
 *   2. If found, build an eBay search query from volumeName + issueNumber.
 *   3. Query the eBay Finding API (or fall back to simulated data).
 *   4. Return the median sold price as priceCents.
 *
 * If the local DB doesn't have the comic yet, falls back to ComicVine API
 * to fetch the name on-demand.
 *
 * GET /api/prices/comics?id=92090
 */
import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({
  /** ComicVine issue ID — numeric string, e.g. "92090" */
  id: z.string().min(1).max(20),
});

function abortFetch(url: string, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(url, {
    headers: { "User-Agent": "Vaulty/1.0" },
    signal: controller.signal,
  }).finally(() => clearTimeout(t));
}

// ─── Local DB lookup (server-side only) ──────────────────────────────────────

interface ComicMeta {
  volumeName: string;
  issueNumber: string;
  publisher: string | null;
}

async function getComicMetaFromDb(cvId: string): Promise<ComicMeta | null> {
  try {
    // Dynamic import keeps Node.js fs out of the edge runtime
    const { getByCvId } = await import("@/lib/comicsDb");
    const record = getByCvId(cvId);
    if (!record) return null;
    return {
      volumeName:  record.volumeName,
      issueNumber: record.issueNumber,
      publisher:   record.publisher,
    };
  } catch {
    return null;
  }
}

// ─── ComicVine fallback ───────────────────────────────────────────────────────

interface CVIssueBasic {
  name: string | null;
  issue_number: string;
  volume: { name: string };
}

async function getComicMetaFromCV(cvId: string): Promise<ComicMeta | null> {
  const key = process.env.COMICVINE_API_KEY;
  if (!key) return null;

  try {
    const url =
      `https://comicvine.gamespot.com/api/issue/4000-${cvId}/` +
      `?api_key=${key}&format=json&field_list=name,issue_number,volume`;
    const res = await abortFetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: CVIssueBasic };
    const issue = data.results;
    if (!issue) return null;
    return {
      volumeName:  issue.volume.name,
      issueNumber: issue.issue_number,
      publisher:   null,
    };
  } catch {
    return null;
  }
}

// ─── eBay Finding API ─────────────────────────────────────────────────────────

interface EbayItem {
  sellingStatus: { currentPrice: { __value__: string; "@currencyId": string }[] }[];
}

interface EbayFindingResponse {
  findCompletedItemsResponse?: [{
    searchResult?: [{ item?: EbayItem[] }];
  }];
}

async function fetchEbayMedianPrice(
  query: string,
): Promise<{ priceCents: number; currency: string; source: "ebay" } | null> {
  const appId = process.env.EBAY_APP_ID;
  if (!appId) return null;

  const params = new URLSearchParams({
    "OPERATION-NAME":                "findCompletedItems",
    "SERVICE-VERSION":               "1.0.0",
    "SECURITY-APPNAME":              appId,
    "RESPONSE-DATA-FORMAT":          "JSON",
    "keywords":                      query,
    "itemFilter(0).name":            "SoldItemsOnly",
    "itemFilter(0).value":           "true",
    "sortOrder":                     "EndTimeSoonest",
    "paginationInput.entriesPerPage": "30",
  });

  try {
    const res = await abortFetch(
      `https://svcs.ebay.com/services/search/FindingService/v1?${params}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as EbayFindingResponse;
    const items = data.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item ?? [];
    if (items.length === 0) return null;

    const prices = items
      .map((item) => parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ ?? "0"))
      .filter((p) => p > 0)
      .sort((a, b) => a - b);

    if (prices.length === 0) return null;

    const currency =
      items[0]?.sellingStatus?.[0]?.currentPrice?.[0]?.["@currencyId"] ?? "USD";
    const median = prices[Math.floor(prices.length / 2)] ?? 0;

    return { priceCents: Math.round(median * 100), currency, source: "ebay" };
  } catch {
    return null;
  }
}

// ─── Simulated fallback ───────────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function simulatePrice(cvId: string): { priceCents: number; currency: string; source: "simulated" } {
  const seed = cvId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = 50 + (seed % 950); // $0.50–$10 base, scale up
  const priceCents = Math.round((base + seededRandom(seed) * base * 2) * 100);
  return { priceCents, currency: "USD", source: "simulated" };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({ id: searchParams.get("id") });
  if (!parsed.success)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const cvId = parsed.data.id.replace(/^cv-/, ""); // strip "cv-" prefix if present

  // 1. Resolve comic metadata
  let meta = await getComicMetaFromDb(cvId);
  if (!meta) {
    meta = await getComicMetaFromCV(cvId);
  }

  if (!meta) {
    return NextResponse.json(
      { error: "Comic not found in local DB or ComicVine" },
      { status: 404 },
    );
  }

  // 2. Build eBay query: "Amazing Fantasy #15 comic"
  const ebayQuery = `${meta.volumeName} #${meta.issueNumber} comic`;

  // 3. Try real eBay data
  const ebayResult = await fetchEbayMedianPrice(ebayQuery);
  if (ebayResult) {
    return NextResponse.json({
      priceCents: ebayResult.priceCents,
      currency:   ebayResult.currency,
      source:     ebayResult.source,
      query:      ebayQuery,
    });
  }

  // 4. Simulated fallback
  const sim = simulatePrice(cvId);
  return NextResponse.json({
    priceCents: sim.priceCents,
    currency:   sim.currency,
    source:     sim.source,
    query:      ebayQuery,
    hint:       process.env.EBAY_APP_ID
      ? undefined
      : "Set EBAY_APP_ID for live eBay sold price data",
  });
}
