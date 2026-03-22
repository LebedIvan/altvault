/**
 * Market price sources — fetches prices from multiple sources per asset class
 * and caches the result in the ebayCache table (key prefix "market:").
 *
 * Cache TTL: 12 hours. Pass forceRefresh=true to bypass.
 *
 * Server-side only.
 */
import { eq } from "drizzle-orm";
import { db, ebayCache, legoSets } from "./db";
import { fetchEbaySold } from "./ebaySold";
import type { SoldItem } from "./ebaySold";

export type { SoldItem };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceSource {
  key: string;
  label: string;
  priceCents: number | null;
  currency: "EUR" | "USD" | "GBP";
  status: "ok" | "unavailable" | "no_key";
  recentSales?: SoldItem[];
  meta?: {
    minCents?: number;
    maxCents?: number;
    avgCents?: number;
    count?: number;
    url?: string;
    note?: string;
  };
}

// ─── Cache (reuses ebayCache table with "market:" key prefix) ─────────────────

const MARKET_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const KEY_PREFIX    = "market:";

async function getFromCache(cacheKey: string): Promise<PriceSource[] | null> {
  try {
    const rows = await db
      .select()
      .from(ebayCache)
      .where(eq(ebayCache.query, KEY_PREFIX + cacheKey))
      .limit(1);
    const row = rows[0];
    if (row && new Date(row.expiresAt) > new Date()) {
      const payload = row.data as unknown as { sources: PriceSource[] };
      return payload.sources ?? null;
    }
  } catch { /* DB unavailable */ }
  return null;
}

async function saveToCache(cacheKey: string, sources: PriceSource[]): Promise<void> {
  const expiresAt = new Date(Date.now() + MARKET_TTL_MS);
  try {
    const payload = { sources } as unknown as Record<string, unknown>;
    await db
      .insert(ebayCache)
      .values({ query: KEY_PREFIX + cacheKey, data: payload, expiresAt: expiresAt.toISOString() })
      .onConflictDoUpdate({
        target: ebayCache.query,
        set: { data: payload, expiresAt: expiresAt.toISOString(), updatedAt: new Date().toISOString() },
      });
  } catch { /* write failed */ }
}

// ─── eBay source builder (universal) ─────────────────────────────────────────

async function buildEbaySource(query: string): Promise<PriceSource> {
  if (!process.env.EBAY_APP_ID) {
    return { key: "ebay", label: "eBay (sold)", priceCents: null, currency: "USD", status: "no_key" };
  }
  const data = await fetchEbaySold(query);
  if (!data || data.source === "simulated") {
    return { key: "ebay", label: "eBay (sold)", priceCents: null, currency: "USD", status: "unavailable" };
  }
  const currency = (data.currency === "EUR" ? "EUR" : data.currency === "GBP" ? "GBP" : "USD") as "EUR" | "USD" | "GBP";
  return {
    key:   "ebay",
    label: "eBay (sold)",
    priceCents: data.trendingPrice ? Math.round(data.trendingPrice * 100) : null,
    currency,
    status: "ok",
    recentSales: data.recentSales,
    meta: {
      minCents: data.lowestPrice   ? Math.round(data.lowestPrice   * 100) : undefined,
      maxCents: data.highestPrice  ? Math.round(data.highestPrice  * 100) : undefined,
      avgCents: data.averagePrice  ? Math.round(data.averagePrice  * 100) : undefined,
      count:    data.totalSales,
    },
  };
}

// ─── Per-class source fetchers ────────────────────────────────────────────────

async function fetchLegoSources(externalId: string | null, name: string): Promise<PriceSource[]> {
  const setNumber = externalId ?? name.match(/\b(\d{4,6})\b/)?.[1] ?? "";
  const ebayQuery = setNumber ? `LEGO ${setNumber} set` : `LEGO ${name}`;

  const [ebay, bricklink, msrp] = await Promise.allSettled([
    buildEbaySource(ebayQuery),
    fetchBrickLinkSource(setNumber),
    fetchLegoMsrpSource(setNumber),
  ]);

  return [
    ebay.status      === "fulfilled" ? ebay.value      : fallback("ebay",       "eBay (sold)"),
    bricklink.status === "fulfilled" ? bricklink.value : fallback("bricklink",  "BrickLink"),
    msrp.status      === "fulfilled" ? msrp.value      : fallback("msrp",       "MSRP"),
  ];
}

async function fetchBrickLinkSource(setNumber: string): Promise<PriceSource> {
  const ck = process.env.BRICKLINK_CONSUMER_KEY ?? "";
  const cs = process.env.BRICKLINK_CONSUMER_SECRET ?? "";
  const tv = process.env.BRICKLINK_TOKEN_VALUE ?? "";
  const ts = process.env.BRICKLINK_TOKEN_SECRET ?? "";

  if (!ck || !cs || !tv || !ts || !setNumber) {
    const url = setNumber ? `https://www.bricklink.com/v2/catalog/catalogitem.page?S=${setNumber}-1` : undefined;
    return { key: "bricklink", label: "BrickLink", priceCents: null, currency: "USD", status: "no_key", meta: { url } };
  }

  try {
    const { buildOAuthHeader } = await import("./bricklinkOAuth");
    const itemNo  = `${setNumber}-1`;
    const url     = `https://api.bricklink.com/api/store/v1/items/SET/${itemNo}/price?guide_type=sold&condition=N&currency_code=USD`;
    const authHdr = buildOAuthHeader("GET", url, { consumerKey: ck, consumerSecret: cs, tokenValue: tv, tokenSecret: ts });
    const res     = await fetch(url, { headers: { Authorization: authHdr }, next: { revalidate: 21600 } });
    if (!res.ok) return fallback("bricklink", "BrickLink");
    const json = await res.json() as { data?: { avg_price?: string; min_price?: string; max_price?: string; total_quantity?: number } };
    const d    = json.data ?? {};
    const avg  = d.avg_price ? Math.round(parseFloat(d.avg_price) * 100) : null;
    return {
      key:        "bricklink",
      label:      "BrickLink",
      priceCents: avg,
      currency:   "USD",
      status:     avg ? "ok" : "unavailable",
      meta: {
        minCents: d.min_price ? Math.round(parseFloat(d.min_price) * 100) : undefined,
        maxCents: d.max_price ? Math.round(parseFloat(d.max_price) * 100) : undefined,
        count:    d.total_quantity ?? undefined,
        url:      `https://www.bricklink.com/v2/catalog/catalogitem.page?S=${setNumber}-1`,
      },
    };
  } catch {
    return fallback("bricklink", "BrickLink");
  }
}

async function fetchLegoMsrpSource(setNumber: string): Promise<PriceSource> {
  if (!setNumber) return fallback("msrp", "MSRP");
  try {
    const rows = await db.select({ msrpEur: legoSets.msrpEur, msrpUsd: legoSets.msrpUsd })
      .from(legoSets)
      .where(eq(legoSets.setNumber, setNumber))
      .limit(1);
    const row = rows[0];
    if (row?.msrpEur) {
      return {
        key: "msrp", label: "MSRP (retail)", currency: "EUR", status: "ok",
        priceCents: Math.round(row.msrpEur * 100),
        meta: { note: "Original retail price" },
      };
    }
    if (row?.msrpUsd) {
      return {
        key: "msrp", label: "MSRP (retail)", currency: "USD", status: "ok",
        priceCents: Math.round(row.msrpUsd * 100),
        meta: { note: "Original retail price" },
      };
    }
  } catch { /* DB unavailable */ }
  return fallback("msrp", "MSRP");
}

async function fetchCs2Sources(externalId: string | null, name: string): Promise<PriceSource[]> {
  const itemName  = externalId ?? name;
  const ebayQuery = `${name} CS2 skin`;

  const [ebay, skinport, csgotrader] = await Promise.allSettled([
    buildEbaySource(ebayQuery),
    fetchSkinportSource(itemName),
    fetchCsgoTraderSource(itemName),
  ]);

  return [
    ebay.status        === "fulfilled" ? ebay.value        : fallback("ebay",       "eBay (sold)"),
    skinport.status    === "fulfilled" ? skinport.value    : fallback("skinport",   "Skinport"),
    csgotrader.status  === "fulfilled" ? csgotrader.value  : fallback("csgotrader", "CSGO Trader"),
  ];
}

async function fetchSkinportSource(itemName: string): Promise<PriceSource> {
  try {
    const res = await fetch("https://api.skinport.com/v1/items?app_id=730&currency=EUR", {
      headers: { "User-Agent": "Vaulty/1.0", Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return fallback("skinport", "Skinport");
    const items = (await res.json()) as { market_hash_name: string; suggested_price: number | null; min_price: number | null }[];
    const item  = items.find((i) => i.market_hash_name === itemName);
    const price = item?.suggested_price ?? item?.min_price ?? null;
    return {
      key: "skinport", label: "Skinport", currency: "EUR", status: price ? "ok" : "unavailable",
      priceCents: price ? Math.round(price * 100) : null,
      meta: { url: `https://skinport.com/item/${encodeURIComponent(itemName)}` },
    };
  } catch {
    return fallback("skinport", "Skinport");
  }
}

async function fetchCsgoTraderSource(itemName: string): Promise<PriceSource> {
  try {
    const res = await fetch("https://prices.csgotrader.app/latest/prices_v6.json", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return fallback("csgotrader", "CSGO Trader");
    const data = (await res.json()) as Record<string, { steam?: { last_24h?: number }; skinport?: { suggested_amount_avg?: number } }>;
    const item = data[itemName];
    const priceUsd = item?.steam?.last_24h ?? null;
    return {
      key: "csgotrader", label: "CSGO Trader", currency: "USD", status: priceUsd ? "ok" : "unavailable",
      priceCents: priceUsd ? Math.round(priceUsd * 100) : null,
      meta: { note: "Steam 24h avg (USD)" },
    };
  } catch {
    return fallback("csgotrader", "CSGO Trader");
  }
}

async function fetchMtgSources(_externalId: string | null, name: string): Promise<PriceSource[]> {
  const cardName  = name.replace(/ — MTG$/, "").trim();
  const ebayQuery = `${cardName} mtg card`;

  const [ebay, cardmarket, tcgplayer] = await Promise.allSettled([
    buildEbaySource(ebayQuery),
    fetchScryfallSource(cardName, "eur"),
    fetchScryfallSource(cardName, "usd"),
  ]);

  return [
    ebay.status       === "fulfilled" ? ebay.value       : fallback("ebay",       "eBay (sold)"),
    cardmarket.status === "fulfilled" ? cardmarket.value : fallback("cardmarket", "CardMarket"),
    tcgplayer.status  === "fulfilled" ? tcgplayer.value  : fallback("tcgplayer",  "TCGPlayer"),
  ];
}

async function fetchScryfallSource(cardName: string, prefer: "eur" | "usd"): Promise<PriceSource> {
  const isEur = prefer === "eur";
  const key   = isEur ? "cardmarket" : "tcgplayer";
  const label = isEur ? "CardMarket" : "TCGPlayer";
  const cur   = isEur ? "EUR" : "USD";

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 8000);
    let res: Response;
    try {
      res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`, {
        headers: { "User-Agent": "Vaulty/1.0" },
        signal: controller.signal,
      });
    } finally { clearTimeout(timeout); }

    if (!res.ok) return fallback(key, label);
    const card = await res.json() as { prices: { eur?: string | null; usd?: string | null; eur_foil?: string | null; usd_foil?: string | null } };
    const p    = card.prices;
    const val  = isEur
      ? (p.eur ? parseFloat(p.eur) : p.eur_foil ? parseFloat(p.eur_foil!) : null)
      : (p.usd ? parseFloat(p.usd) : p.usd_foil ? parseFloat(p.usd_foil!) : null);
    return {
      key, label, currency: cur, status: val ? "ok" : "unavailable",
      priceCents: val ? Math.round(val * 100) : null,
    };
  } catch {
    return fallback(key, label);
  }
}

async function fetchPokemonSources(externalId: string | null, name: string): Promise<PriceSource[]> {
  const ebayQuery = `${name} pokemon card`;

  const [ebay, cardmarket, tcgplayer] = await Promise.allSettled([
    buildEbaySource(ebayQuery),
    fetchTcgdexSource(externalId, "eur"),
    fetchTcgdexSource(externalId, "usd"),
  ]);

  return [
    ebay.status       === "fulfilled" ? ebay.value       : fallback("ebay",       "eBay (sold)"),
    cardmarket.status === "fulfilled" ? cardmarket.value : fallback("cardmarket", "CardMarket"),
    tcgplayer.status  === "fulfilled" ? tcgplayer.value  : fallback("tcgplayer",  "TCGPlayer"),
  ];
}

async function fetchTcgdexSource(externalId: string | null, prefer: "eur" | "usd"): Promise<PriceSource> {
  const isEur = prefer === "eur";
  const key   = isEur ? "cardmarket" : "tcgplayer";
  const label = isEur ? "CardMarket" : "TCGPlayer";
  const cur   = isEur ? "EUR" : "USD";

  if (!externalId) return fallback(key, label);

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 8000);
    let res: Response;
    try {
      res = await fetch(`https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(externalId)}`, {
        headers: { "User-Agent": "Vaulty/1.0" },
        signal: controller.signal,
      });
    } finally { clearTimeout(timeout); }

    if (!res.ok) return fallback(key, label);
    const card = await res.json() as { pricing?: { cardmarket?: { trend?: number | null; avg?: number | null }; tcgplayer?: { holofoil?: { marketPrice?: number | null }; normal?: { marketPrice?: number | null } } } };
    let val: number | null = null;
    if (isEur) {
      const cm = card.pricing?.cardmarket;
      val = cm?.trend ?? cm?.avg ?? null;
    } else {
      const tcp = card.pricing?.tcgplayer;
      val = tcp?.holofoil?.marketPrice ?? tcp?.normal?.marketPrice ?? null;
    }
    return {
      key, label, currency: cur, status: val ? "ok" : "unavailable",
      priceCents: val ? Math.round(val * 100) : null,
    };
  } catch {
    return fallback(key, label);
  }
}

async function fetchComicsSources(_externalId: string | null, name: string): Promise<PriceSource[]> {
  const ebayQuery = `${name} comic`;
  const ebay = await buildEbaySource(ebayQuery).catch(() => fallback("ebay", "eBay (sold)"));
  return [ebay];
}

async function fetchGamesTechSources(externalId: string | null, name: string): Promise<PriceSource[]> {
  const ebayQuery = `${name} game`;

  const [ebay, pc] = await Promise.allSettled([
    buildEbaySource(ebayQuery),
    fetchPriceChartingSource(externalId),
  ]);

  return [
    ebay.status === "fulfilled" ? ebay.value : fallback("ebay",          "eBay (sold)"),
    pc.status   === "fulfilled" ? pc.value   : fallback("pricecharting", "PriceCharting"),
  ];
}

async function fetchPriceChartingSource(externalId: string | null): Promise<PriceSource> {
  const apiKey = process.env.PRICECHARTING_API_KEY;
  if (!apiKey || !externalId) {
    return { key: "pricecharting", label: "PriceCharting", priceCents: null, currency: "USD", status: apiKey ? "unavailable" : "no_key" };
  }
  try {
    const res = await fetch(`https://www.pricecharting.com/api/product?id=${externalId}&api_key=${apiKey}`, {
      next: { revalidate: 21600 },
    });
    if (!res.ok) return fallback("pricecharting", "PriceCharting");
    const data = await res.json() as { "loose-price"?: number; "cib-price"?: number; "new-price"?: number };
    const loose = data["loose-price"];
    const cib   = data["cib-price"];
    const sealed = data["new-price"];
    return {
      key: "pricecharting", label: "PriceCharting", currency: "USD",
      status: loose ? "ok" : "unavailable",
      priceCents: loose ?? null,
      meta: {
        minCents: loose  ?? undefined,
        maxCents: sealed ?? undefined,
        avgCents: cib    ?? undefined,
        note: loose && cib && sealed ? `Loose: $${(loose/100).toFixed(0)} · CIB: $${(cib/100).toFixed(0)} · Sealed: $${(sealed/100).toFixed(0)}` : undefined,
      },
    };
  } catch {
    return fallback("pricecharting", "PriceCharting");
  }
}

async function fetchCommoditiesSources(externalId: string | null, name: string): Promise<PriceSource[]> {
  const ebayQuery = name;
  const [ebay, spot] = await Promise.allSettled([
    buildEbaySource(ebayQuery),
    fetchMetalsSpotSource(externalId ?? name),
  ]);
  return [
    ebay.status  === "fulfilled" ? ebay.value  : fallback("ebay",  "eBay (sold)"),
    spot.status  === "fulfilled" ? spot.value  : fallback("spot",  "Spot price"),
  ];
}

async function fetchMetalsSpotSource(symbol: string): Promise<PriceSource> {
  const yahooMap: Record<string, string> = {
    XAU: "GC=F", GOLD: "GC=F",
    XAG: "SI=F", SILVER: "SI=F",
    XPT: "PL=F", PLATINUM: "PL=F",
    XPD: "PA=F", PALLADIUM: "PA=F",
  };
  const ticker = yahooMap[symbol.toUpperCase()];
  if (!ticker) return fallback("spot", "Spot price");

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 3600 } },
    );
    if (!res.ok) return fallback("spot", "Spot price");
    const json = await res.json() as { chart?: { result?: [{ meta?: { regularMarketPrice?: number; currency?: string } }] } };
    const meta  = json.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    const cur   = (meta?.currency === "EUR" ? "EUR" : "USD") as "EUR" | "USD";
    return {
      key: "spot", label: "Spot price (Yahoo)", currency: cur,
      status: price ? "ok" : "unavailable",
      priceCents: price ? Math.round(price * 100) : null,
      meta: { note: `Per troy oz` },
    };
  } catch {
    return fallback("spot", "Spot price");
  }
}

// ─── Fallback helper ──────────────────────────────────────────────────────────

function fallback(key: string, label: string): PriceSource {
  return { key, label, priceCents: null, currency: "USD", status: "unavailable" };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch market prices from all relevant sources for the given asset.
 * Results are cached in ebayCache table for 12h.
 * Pass forceRefresh=true to bypass cache.
 */
export async function fetchAllSources(
  assetClass: string,
  externalId: string | null,
  name: string,
  forceRefresh = false,
): Promise<PriceSource[]> {
  const cacheKey = `${assetClass}:${externalId ?? name}`;

  if (!forceRefresh) {
    const cached = await getFromCache(cacheKey);
    if (cached) return cached;
  }

  let sources: PriceSource[];
  switch (assetClass) {
    case "lego":
      sources = await fetchLegoSources(externalId, name);
      break;
    case "cs2_skins":
      sources = await fetchCs2Sources(externalId, name);
      break;
    case "trading_cards":
      // Distinguish MTG vs Pokemon by name suffix or externalId format
      if (name.endsWith("— MTG") || name.endsWith("MTG")) {
        sources = await fetchMtgSources(externalId, name);
      } else {
        sources = await fetchPokemonSources(externalId, name);
      }
      break;
    case "comics":
      sources = await fetchComicsSources(externalId, name);
      break;
    case "games_tech":
      sources = await fetchGamesTechSources(externalId, name);
      break;
    case "commodities":
      sources = await fetchCommoditiesSources(externalId, name);
      break;
    default: {
      // Unknown class — just eBay
      const ebay = await buildEbaySource(name).catch(() => fallback("ebay", "eBay (sold)"));
      sources = [ebay];
    }
  }

  await saveToCache(cacheKey, sources);
  return sources;
}
