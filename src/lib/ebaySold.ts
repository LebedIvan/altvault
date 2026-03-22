/**
 * Shared eBay sold-listings logic.
 * Used by /api/ebay/sold route and marketSources.ts
 */
import { eq } from "drizzle-orm";
import { db, ebayCache } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  /** "ebay" = sold listings (Finding API), "ebay_browse" = active listings (Browse API), "simulated" = fake */
  source: "ebay" | "ebay_browse" | "simulated";
}

// ─── Two-level cache: L1 in-memory, L2 DB ────────────────────────────────────

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const memCache = new Map<string, { data: EbaySoldData; expiresAt: number }>();

export async function getCachedEbay(key: string): Promise<EbaySoldData | null> {
  const mem = memCache.get(key);
  if (mem) {
    if (Date.now() <= mem.expiresAt) return mem.data;
    memCache.delete(key);
  }
  try {
    const rows = await db.select().from(ebayCache).where(eq(ebayCache.query, key)).limit(1);
    const row = rows[0];
    if (row && new Date(row.expiresAt) > new Date()) {
      const data = row.data as unknown as EbaySoldData;
      memCache.set(key, { data, expiresAt: new Date(row.expiresAt).getTime() });
      return data;
    }
  } catch { /* DB unavailable */ }
  return null;
}

/** Return stale (expired) cached data — used as fallback when API is rate-limited */
async function getStaleCachedEbay(key: string): Promise<EbaySoldData | null> {
  try {
    const rows = await db.select().from(ebayCache).where(eq(ebayCache.query, key)).limit(1);
    const row = rows[0];
    if (row) return row.data as unknown as EbaySoldData;
  } catch { /* DB unavailable */ }
  return null;
}

/** Cache a rate-limit signal for 1 hour so we don't hammer eBay */
const RATE_LIMIT_KEY = "__ebay_rate_limited__";
const RATE_LIMIT_TTL = 60 * 60 * 1000; // 1h

function isRateLimited(): boolean {
  const entry = memCache.get(RATE_LIMIT_KEY);
  return !!(entry && Date.now() <= entry.expiresAt);
}

function setRateLimited(): void {
  // Reuse memCache with a sentinel value
  memCache.set(RATE_LIMIT_KEY, {
    data: {} as EbaySoldData,
    expiresAt: Date.now() + RATE_LIMIT_TTL,
  });
}

export async function setCachedEbay(key: string, data: EbaySoldData): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
  memCache.set(key, { data, expiresAt: expiresAt.getTime() });
  try {
    await db.delete(ebayCache).where(eq(ebayCache.query, key));
    await db.insert(ebayCache).values({
      query:     key,
      data:      data as unknown as Record<string, unknown>,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("[ebaySold] setCachedEbay failed for key:", key, err);
  }
}

// ─── eBay Browse API (OAuth 2.0) ─────────────────────────────────────────────
// Modern replacement for Finding API. Requires EBAY_APP_ID + EBAY_CERT_ID.
// Shows active listings (not sold), but gives real current market prices.

let browseToken: { token: string; expiresAt: number } | null = null;

async function getEbayOAuthToken(): Promise<string | null> {
  const appId  = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  if (!appId || !certId) return null;

  if (browseToken && Date.now() < browseToken.expiresAt - 60_000) return browseToken.token;

  try {
    const creds = Buffer.from(`${appId}:${certId}`).toString("base64");
    const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
    });
    if (!res.ok) return null;
    const data = await res.json() as { access_token: string; expires_in: number };
    browseToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return browseToken.token;
  } catch { return null; }
}

interface BrowseItem {
  title: string;
  price: { value: string; currency: string };
  itemCreationDate?: string;
}

async function fetchEbayBrowse(q: string): Promise<EbaySoldData | null> {
  const token = await getEbayOAuthToken();
  if (!token) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let res: Response;
    try {
      res = await fetch(
        `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(q)}&limit=50`,
        { headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" }, signal: controller.signal },
      );
    } finally { clearTimeout(timer); }

    if (!res.ok) return null;
    const data = await res.json() as { itemSummaries?: BrowseItem[]; total?: number };

    const items = data.itemSummaries ?? [];
    if (items.length === 0) return null;

    const sales: SoldItem[] = items.map((item) => ({
      title:    item.title,
      price:    parseFloat(item.price.value),
      currency: item.price.currency,
      date:     item.itemCreationDate ?? new Date().toISOString(),
    }));

    const prices = sales.map((s) => s.price).filter((p) => p > 0).sort((a, b) => a - b);
    const avg    = prices.reduce((a, b) => a + b, 0) / prices.length;
    const median = prices[Math.floor(prices.length / 2)] ?? null;

    return {
      totalSales:    data.total ?? items.length,
      trendingPrice: median,
      lowestPrice:   prices[0]                   ?? null,
      highestPrice:  prices[prices.length - 1]   ?? null,
      averagePrice:  avg,
      currency:      items[0]?.price.currency    ?? "USD",
      recentSales:   sales.slice(0, 20),
      source:        "ebay_browse",
    };
  } catch { return null; }
}

// ─── eBay Finding API ─────────────────────────────────────────────────────────

interface EbayItem {
  itemId: string[];
  title: string[];
  sellingStatus: { currentPrice: { __value__: string; "@currencyId": string }[] }[];
  listingInfo?: { endTime?: string[] }[];
}

interface EbayFindingResponse {
  findCompletedItemsResponse?: [{
    searchResult?: [{ item?: EbayItem[]; "@count"?: string }];
    paginationOutput?: [{ totalEntries?: string[] }];
  }];
}

function abortFetch(url: string, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(url, {
    headers: { "User-Agent": "Vaulty/1.0" },
    signal: controller.signal,
  }).finally(() => clearTimeout(t));
}

/**
 * Fetch completed (sold) eBay listings for a query.
 * Returns null if EBAY_APP_ID is not set or the API call fails.
 * Results are cached 24h in DB.
 */
export async function fetchEbaySold(q: string): Promise<EbaySoldData | null> {
  const appId = process.env.EBAY_APP_ID;
  if (!appId) return null;

  const cached = await getCachedEbay(q);
  if (cached) return cached;

  // Try Browse API first (modern OAuth, no Partner Network required, generous limits)
  if (process.env.EBAY_CERT_ID) {
    const browseData = await fetchEbayBrowse(q);
    if (browseData) {
      await setCachedEbay(q, browseData);
      return browseData;
    }
  }

  // Fall back to Finding API findCompletedItems (may require Partner Network)
  if (isRateLimited()) return await getStaleCachedEbay(q);

  const params = new URLSearchParams({
    "OPERATION-NAME":                 "findCompletedItems",
    "SERVICE-VERSION":                "1.0.0",
    "SECURITY-APPNAME":               appId,
    "RESPONSE-DATA-FORMAT":           "JSON",
    "keywords":                       q,
    "itemFilter(0).name":             "SoldItemsOnly",
    "itemFilter(0).value":            "true",
    "sortOrder":                      "EndTimeSoonest",
    "paginationInput.entriesPerPage": "50",
  });

  try {
    const res = await abortFetch(
      `https://svcs.ebay.com/services/search/FindingService/v1?${params}`,
    );
    const text = await res.text();
    if (!res.ok) {
      // HTTP 500 from eBay usually means rate-limited (errorId 10001)
      setRateLimited();
      return await getStaleCachedEbay(q);
    }

    let data: EbayFindingResponse;
    try { data = JSON.parse(text) as EbayFindingResponse; }
    catch { return null; }

    // eBay returns errorMessage wrapper for auth/rate-limit errors (even as HTTP 200 sometimes)
    const errData = data as unknown as { errorMessage?: unknown };
    if (errData.errorMessage) {
      setRateLimited();
      return await getStaleCachedEbay(q);
    }

    const root  = data.findCompletedItemsResponse?.[0];
    const rootA = root as unknown as Record<string, string[]>;
    const ack   = rootA?.ack?.[0];
    if (ack && ack !== "Success" && ack !== "Warning") {
      return await getStaleCachedEbay(q);
    }

    const items = root?.searchResult?.[0]?.item ?? [];
    const total = parseInt(root?.paginationOutput?.[0]?.totalEntries?.[0] ?? "0");
    if (items.length === 0) return null;

    const sales: SoldItem[] = items.map((item) => {
      const priceObj = item.sellingStatus?.[0]?.currentPrice?.[0];
      return {
        date:     item.listingInfo?.[0]?.endTime?.[0] ?? new Date().toISOString(),
        price:    parseFloat(priceObj?.__value__ ?? "0"),
        currency: priceObj?.["@currencyId"] ?? "USD",
        title:    item.title?.[0] ?? q,
      };
    });

    const prices = sales.map((s) => s.price).filter((p) => p > 0).sort((a, b) => a - b);
    const avg    = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
    const median = prices.length > 0 ? prices[Math.floor(prices.length / 2)] ?? null : null;

    const result: EbaySoldData = {
      totalSales:    total,
      trendingPrice: median,
      lowestPrice:   prices[0] ?? null,
      highestPrice:  prices[prices.length - 1] ?? null,
      averagePrice:  avg,
      currency:      sales[0]?.currency ?? "USD",
      recentSales:   sales.slice(0, 20),
      source:        "ebay",
    };
    await setCachedEbay(q, result);
    return result;
  } catch {
    return null;
  }
}

// ─── Simulated fallback (for /api/ebay/sold only) ─────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

export function generateSimulated(q: string, currency: string): EbaySoldData {
  const seed      = q.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const basePrice = 20 + (seed % 200);
  const variance  = basePrice * 0.4;
  const totalSales = 30 + (seed % 300);
  const now = Date.now();

  const recentSales: SoldItem[] = [];
  for (let i = 0; i < 20; i++) {
    const r1   = seededRandom(seed + i * 3);
    const r2   = seededRandom(seed + i * 3 + 1);
    const gauss = Math.sqrt(-2 * Math.log(r1 + 0.0001)) * Math.cos(2 * Math.PI * r2);
    const price = Math.max(1, Math.round((basePrice + gauss * variance) * 100) / 100);
    const daysAgo = Math.floor(seededRandom(seed + i * 7) * 90);
    recentSales.push({
      date:     new Date(now - daysAgo * 86400000).toISOString(),
      price,
      currency,
      title: q,
    });
  }
  recentSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const prices = recentSales.map((s) => s.price).sort((a, b) => a - b);
  const avg    = prices.reduce((a, b) => a + b, 0) / prices.length;
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
