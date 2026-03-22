export const dynamic = "force-dynamic";
/**
 * eBay sold price data — fetches completed/sold listings.
 *
 * Uses eBay Finding API if EBAY_APP_ID is set,
 * otherwise generates realistic simulated price history.
 *
 * GET /api/ebay/sold?q=Pikachu+Zekrom+GX&currency=USD
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, ebayCache } from "@/lib/db";

// ─── Two-level cache: L1 in-memory (process lifetime), L2 DB (persists restarts) ──

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const memCache = new Map<string, { data: EbaySoldData; expiresAt: number }>();

async function getCached(key: string): Promise<EbaySoldData | null> {
  // L1: memory
  const mem = memCache.get(key);
  if (mem) {
    if (Date.now() <= mem.expiresAt) return mem.data;
    memCache.delete(key);
  }

  // L2: DB
  try {
    const rows = await db.select().from(ebayCache).where(eq(ebayCache.query, key)).limit(1);
    const row = rows[0];
    if (row && new Date(row.expiresAt) > new Date()) {
      const data = row.data as unknown as EbaySoldData;
      memCache.set(key, { data, expiresAt: new Date(row.expiresAt).getTime() });
      return data;
    }
  } catch {
    // DB unavailable — fall through
  }

  return null;
}

async function setCached(key: string, data: EbaySoldData): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS);

  // L1: memory
  memCache.set(key, { data, expiresAt: expiresAt.getTime() });

  // L2: DB
  try {
    await db
      .insert(ebayCache)
      .values({
        query:     key,
        data:      data as unknown as Record<string, unknown>,
        expiresAt: expiresAt.toISOString(),
      })
      .onConflictDoUpdate({
        target: ebayCache.query,
        set: {
          data:      data as unknown as Record<string, unknown>,
          expiresAt: expiresAt.toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
  } catch {
    // DB write failed — in-memory cache still protects within this process
  }
}

const QuerySchema = z.object({
  q:        z.string().min(1).max(200),
  currency: z.enum(["EUR", "USD", "GBP"]).optional().default("USD"),
});

function abortFetch(url: string, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(url, {
    headers: { "User-Agent": "Vaulty/1.0" },
    signal: controller.signal,
  }).finally(() => clearTimeout(t));
}

// ─── eBay Finding API types ───────────────────────────────────────────────────

interface EbayItem {
  itemId: string[];
  title: string[];
  sellingStatus: { currentPrice: { __value__: string; "@currencyId": string }[] }[];
  listingInfo?: { endTime?: string[] }[];
}

interface EbayFindingResponse {
  findCompletedItemsResponse?: [{
    searchResult?: [{
      item?: EbayItem[];
      "@count"?: string;
    }];
    paginationOutput?: [{ totalEntries?: string[] }];
  }];
}

export interface SoldItem {
  date: string;       // ISO date string
  price: number;      // in base currency units (not cents)
  currency: string;
  title: string;
}

export interface EbaySoldData {
  totalSales: number;
  trendingPrice: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  averagePrice: number | null;
  currency: string;
  recentSales: SoldItem[];
  source: "ebay" | "simulated";
}

// ─── eBay Finding API ─────────────────────────────────────────────────────────

async function fetchEbaySold(q: string): Promise<EbaySoldData | null> {
  const appId = process.env.EBAY_APP_ID;
  if (!appId) return null;

  const cached = await getCached(q);
  if (cached) return cached;

  const params = new URLSearchParams({
    "OPERATION-NAME":                "findCompletedItems",
    "SERVICE-VERSION":               "1.0.0",
    "SECURITY-APPNAME":              appId,
    "RESPONSE-DATA-FORMAT":          "JSON",
    "keywords":                      q,
    "itemFilter(0).name":            "SoldItemsOnly",
    "itemFilter(0).value":           "true",
    "sortOrder":                     "EndTimeSoonest",
    "paginationInput.entriesPerPage": "50",
  });

  const url = `https://svcs.ebay.com/services/search/FindingService/v1?${params}`;

  try {
    const res = await abortFetch(url);
    const text = await res.text();
    if (!res.ok) {
      console.error("[ebay/sold] HTTP error", res.status, text.slice(0, 200));
      return null;
    }

    let data: EbayFindingResponse;
    try {
      data = JSON.parse(text) as EbayFindingResponse;
    } catch {
      console.error("[ebay/sold] JSON parse error:", text.slice(0, 200));
      return null;
    }

    const root = data.findCompletedItemsResponse?.[0];
    const rootAny = root as unknown as Record<string, string[]>;
    const ack = rootAny?.ack?.[0];
    if (ack && ack !== "Success" && ack !== "Warning") {
      console.error("[ebay/sold] eBay API error:", ack);
      return null;
    }

    const items = root?.searchResult?.[0]?.item ?? [];
    const total = parseInt(
      root?.paginationOutput?.[0]?.totalEntries?.[0] ?? "0",
    );

    if (items.length === 0) {
      console.warn("[ebay/sold] 0 results for query:", q);
      return null;
    }

    const sales: SoldItem[] = items.map((item) => {
      const priceObj = item.sellingStatus?.[0]?.currentPrice?.[0];
      return {
        date:     item.listingInfo?.[0]?.endTime?.[0] ?? new Date().toISOString(),
        price:    parseFloat(priceObj?.__value__ ?? "0"),
        currency: priceObj?.["@currencyId"] ?? "USD",
        title:    item.title?.[0] ?? q,
      };
    });

    const prices = sales.map((s) => s.price).filter((p) => p > 0);
    prices.sort((a, b) => a - b);

    const avg = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
    const median = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : null;

    const result: EbaySoldData = {
      totalSales:    total,
      trendingPrice: median ?? null,
      lowestPrice:   prices[0] ?? null,
      highestPrice:  prices[prices.length - 1] ?? null,
      averagePrice:  avg,
      currency:      sales[0]?.currency ?? "USD",
      recentSales:   sales.slice(0, 20),
      source:        "ebay",
    };
    await setCached(q, result);
    return result;
  } catch {
    return null;
  }
}

// ─── Simulated fallback ───────────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function generateSimulated(q: string, currency: string): EbaySoldData {
  const seed = q.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const basePrice = 20 + (seed % 200);
  const variance = basePrice * 0.4;
  const totalSales = 30 + (seed % 300);
  const numSamples = 20;
  const recentSales: SoldItem[] = [];
  const now = Date.now();

  for (let i = 0; i < numSamples; i++) {
    const r1 = seededRandom(seed + i * 3);
    const r2 = seededRandom(seed + i * 3 + 1);
    const gauss = Math.sqrt(-2 * Math.log(r1 + 0.0001)) * Math.cos(2 * Math.PI * r2);
    const price = Math.max(1, Math.round((basePrice + gauss * variance) * 100) / 100);
    const daysAgo = Math.floor(seededRandom(seed + i * 7) * 90);
    const date = new Date(now - daysAgo * 86400000).toISOString();
    recentSales.push({ date, price, currency, title: q });
  }

  recentSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const prices = recentSales.map((s) => s.price).sort((a, b) => a - b);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const median = prices[Math.floor(prices.length / 2)] ?? 0;

  return {
    totalSales,
    trendingPrice: Math.round(median * 100) / 100,
    lowestPrice:   Math.round((prices[0] ?? 0) * 100) / 100,
    highestPrice:  Math.round((prices[prices.length - 1] ?? 0) * 100) / 100,
    averagePrice:  Math.round(avg * 100) / 100,
    currency,
    recentSales,
    source: "simulated",
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    q:        searchParams.get("q"),
    currency: searchParams.get("currency") ?? undefined,
  });

  if (!parsed.success)
    return NextResponse.json({ error: "Missing q" }, { status: 400 });

  const { q, currency } = parsed.data;

  const ebayData = await fetchEbaySold(q);
  if (ebayData) return NextResponse.json(ebayData);

  return NextResponse.json(generateSimulated(q, currency));
}
