export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

interface GamesPriceResult {
  loosePriceCents:    number | null;
  cibPriceCents:      number | null;
  newPriceCents:      number | null;
  priceCents:         number | null;
  ebayMedianCents:    number | null;
  cexSellPriceCents:  number | null;
  cexBuyPriceCents:   number | null;
  cexUrl:             string;
  source:             string;
}

// ─── PriceCharting ─────────────────────────────────────────────────────────────

async function fetchPriceCharting(externalId: string): Promise<{
  loose: number | null; cib: number | null; newP: number | null;
} | null> {
  const apiKey = process.env.PRICECHARTING_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    `https://www.pricecharting.com/api/product?id=${apiKey}&status=price&id=${externalId}`,
    { next: { revalidate: 21600 } }
  );
  if (!res.ok) return null;

  const data = await res.json() as {
    "loose-price"?: number;
    "cib-price"?: number;
    "new-price"?: number;
  };

  return {
    loose: data["loose-price"] ? Math.round(data["loose-price"]) : null,
    cib:   data["cib-price"]   ? Math.round(data["cib-price"])   : null,
    newP:  data["new-price"]   ? Math.round(data["new-price"])   : null,
  };
}

// ─── eBay sold listings median ────────────────────────────────────────────────

async function fetchEbayMedian(name: string): Promise<number | null> {
  const appId = process.env.EBAY_APP_ID;
  if (!appId || !name) return null;

  const url = new URL("https://svcs.ebay.com/services/search/FindingService/v1");
  url.searchParams.set("OPERATION-NAME",        "findCompletedItems");
  url.searchParams.set("SERVICE-VERSION",       "1.0.0");
  url.searchParams.set("SECURITY-APPNAME",      appId);
  url.searchParams.set("RESPONSE-DATA-FORMAT",  "JSON");
  url.searchParams.set("keywords",              `"${name}" game`);
  url.searchParams.set("itemFilter(0).name",    "SoldItemsOnly");
  url.searchParams.set("itemFilter(0).value",   "true");
  url.searchParams.set("paginationInput.entriesPerPage", "30");
  url.searchParams.set("sortOrder",             "EndTimeSoonest");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return null;

  const data = await res.json() as {
    findCompletedItemsResponse?: Array<{
      searchResult?: Array<{
        item?: Array<{ sellingStatus: Array<{ currentPrice: Array<{ __value__: string }> }> }>;
      }>;
    }>;
  };

  const items = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item ?? [];
  if (!items.length) return null;

  const prices = items
    .map((item) => parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ ?? "0"))
    .filter((p) => p > 0)
    .sort((a, b) => a - b);

  if (!prices.length) return null;
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 === 0
    ? (prices[mid - 1]! + prices[mid]!) / 2
    : prices[mid]!;

  return Math.round(median * 100);
}

// ─── CeX (best effort) ────────────────────────────────────────────────────────

async function fetchCex(name: string): Promise<{
  sellPrice: number | null; buyPrice: number | null;
}> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/cex?q=${encodeURIComponent(name)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { sellPrice: null, buyPrice: null };
    const data = await res.json() as { items?: Array<{ sellPrice: number; cashPrice: number }> };
    const first = data.items?.[0];
    if (!first) return { sellPrice: null, buyPrice: null };
    return {
      sellPrice: Math.round(first.sellPrice * 100),
      buyPrice:  Math.round(first.cashPrice * 100),
    };
  } catch {
    return { sellPrice: null, buyPrice: null };
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json() as { externalId?: string; name?: string };
  const { externalId, name } = body;

  const cexUrl = `https://uk.webuy.com/search?q=${encodeURIComponent(name ?? "")}`;

  // Fetch PriceCharting + eBay + CeX in parallel
  const [pc, ebayMedianCents, cex] = await Promise.all([
    externalId ? fetchPriceCharting(externalId) : Promise.resolve(null),
    name        ? fetchEbayMedian(name)          : Promise.resolve(null),
    name        ? fetchCex(name)                 : Promise.resolve({ sellPrice: null, buyPrice: null }),
  ]);

  const loosePriceCents = pc?.loose ?? null;
  const cibPriceCents   = pc?.cib   ?? null;
  const newPriceCents   = pc?.newP  ?? null;

  // Primary FMV: PriceCharting loose if available, else eBay median
  const priceCents = loosePriceCents ?? ebayMedianCents ?? null;

  let source = "none";
  if (loosePriceCents) source = "pricecharting";
  else if (ebayMedianCents) source = "ebay";

  const result: GamesPriceResult = {
    loosePriceCents,
    cibPriceCents,
    newPriceCents,
    priceCents,
    ebayMedianCents,
    cexSellPriceCents: cex.sellPrice,
    cexBuyPriceCents:  cex.buyPrice,
    cexUrl,
    source,
  };

  return NextResponse.json(result);
}
