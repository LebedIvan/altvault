/**
 * Server-side only — uses Neon DB via Drizzle ORM.
 * Fixed catalog of 5 precious metals, seeded once.
 */
import { eq, sql } from "drizzle-orm";
import { db, commodities } from "./db";
import type { CommodityRecord, MetalSymbol } from "./commodityRecord";

// ─── Static catalog ───────────────────────────────────────────────────────────

const METALS: Array<{ symbol: MetalSymbol; name: string; yahooTicker: string | null }> = [
  { symbol: "XAU", name: "Gold",      yahooTicker: "GC=F" },
  { symbol: "XAG", name: "Silver",    yahooTicker: "SI=F" },
  { symbol: "XPT", name: "Platinum",  yahooTicker: "PL=F" },
  { symbol: "XPD", name: "Palladium", yahooTicker: "PA=F" },
  { symbol: "XRH", name: "Rhodium",   yahooTicker: null   },
];

// ─── Converters ───────────────────────────────────────────────────────────────

function rowToRecord(row: typeof commodities.$inferSelect): CommodityRecord {
  return {
    symbol:             row.symbol as MetalSymbol,
    name:               row.name,
    pricePerOzEurCents: row.pricePerOzEurCents ?? null,
    pricePerOzUsdCents: row.pricePerOzUsdCents ?? null,
    priceUpdatedAt:     row.priceUpdatedAt     ?? null,
    yahooTicker:        row.yahooTicker        ?? null,
    unit:               row.unit,
    lastSyncedAt:       row.lastSyncedAt ?? new Date().toISOString(),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Insert the 5 metal rows if they don't exist yet. Idempotent. */
export async function seedCommodities(): Promise<void> {
  await db.insert(commodities)
    .values(
      METALS.map((m) => ({
        symbol:             m.symbol,
        name:               m.name,
        yahooTicker:        m.yahooTicker,
        unit:               "troy_oz",
        pricePerOzEurCents: null,
        pricePerOzUsdCents: null,
        priceUpdatedAt:     null,
        lastSyncedAt:       new Date().toISOString(),
      })),
    )
    .onConflictDoNothing();
}

/** Update the live price for a single metal symbol. */
export async function updatePrice(
  symbol: MetalSymbol,
  eurCents: number,
  usdCents: number | null,
): Promise<void> {
  await db.update(commodities)
    .set({
      pricePerOzEurCents: eurCents,
      pricePerOzUsdCents: usdCents ?? null,
      priceUpdatedAt:     new Date().toISOString(),
      lastSyncedAt:       new Date().toISOString(),
    })
    .where(eq(commodities.symbol, symbol));
}

export async function getBySymbol(symbol: MetalSymbol): Promise<CommodityRecord | null> {
  const rows = await db.select().from(commodities).where(eq(commodities.symbol, symbol)).limit(1);
  return rows[0] ? rowToRecord(rows[0]) : null;
}

export async function getAll(): Promise<CommodityRecord[]> {
  const rows = await db.select().from(commodities);
  return rows.map(rowToRecord);
}

export async function getStats(): Promise<{ withPrices: number; syncedAt: string | null }> {
  const [[withPrices], [last]] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(commodities)
      .where(sql`price_per_oz_eur_cents IS NOT NULL`),
    db.select({ t: sql<string | null>`max(last_synced_at)` }).from(commodities),
  ]);
  return { withPrices: withPrices?.c ?? 0, syncedAt: last?.t ?? null };
}
