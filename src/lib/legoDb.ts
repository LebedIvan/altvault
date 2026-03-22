/**
 * Server-side only — uses Neon DB via Drizzle ORM.
 * All functions are async.
 */
import { eq, isNotNull, sql } from "drizzle-orm";
import { db, legoSets } from "./db";
import type { LegoSetRecord } from "./legoSetRecord";

// ─── Converters ───────────────────────────────────────────────────────────────

function recordToRow(s: Partial<LegoSetRecord>) {
  return {
    setNumber:            s.setNumber!,
    name:                 s.name ?? "",
    theme:                s.theme ?? "",
    themeId:              s.themeId ?? null,
    year:                 s.year ?? null,
    pieces:               s.pieces ?? null,
    imageUrl:             s.imageUrl ?? null,
    brickowlId:           s.brickowlId ?? null,
    brickowlUrl:          s.brickowlUrl ?? null,
    marketPriceGbp:       s.marketPriceGbp ?? null,
    marketPriceUpdatedAt: s.marketPriceUpdatedAt ?? null,
    launchDate:           s.launchDate ?? null,
    exitDate:             s.exitDate ?? null,
    msrpUsd:              s.msrpUsd ?? null,
    msrpGbp:              s.msrpGbp ?? null,
    msrpEur:              s.msrpEur ?? null,
    rebrickableUrl:       s.rebrickableUrl ?? null,
    bricksetUrl:          s.bricksetUrl ?? "",
    sources:              s.sources ?? [],
    lastSyncedAt:         new Date().toISOString(),
  };
}

function rowToRecord(row: typeof legoSets.$inferSelect): LegoSetRecord {
  return {
    setNumber:            row.setNumber,
    name:                 row.name,
    theme:                row.theme,
    themeId:              row.themeId ?? null,
    year:                 row.year ?? null,
    pieces:               row.pieces ?? null,
    imageUrl:             row.imageUrl ?? null,
    brickowlId:           row.brickowlId ?? null,
    brickowlUrl:          row.brickowlUrl ?? null,
    marketPriceGbp:       row.marketPriceGbp ?? null,
    marketPriceUpdatedAt: row.marketPriceUpdatedAt ?? null,
    launchDate:           row.launchDate ?? null,
    exitDate:             row.exitDate ?? null,
    msrpUsd:              row.msrpUsd ?? null,
    msrpGbp:              row.msrpGbp ?? null,
    msrpEur:              row.msrpEur ?? null,
    rebrickableUrl:       row.rebrickableUrl ?? null,
    bricksetUrl:          row.bricksetUrl,
    sources:              (row.sources as string[]) ?? [],
    lastSyncedAt:         row.lastSyncedAt ?? new Date().toISOString(),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Upsert a batch of set records.
 * Merge strategy: COALESCE(new, existing) — existing non-null values are
 * preserved when the incoming value is null.
 */
export async function upsertSets(incoming: Partial<LegoSetRecord>[]): Promise<void> {
  const valid = incoming.filter((s) => s.setNumber);
  if (valid.length === 0) return;

  // Process in chunks of 100 to keep queries manageable
  const CHUNK = 100;
  for (let i = 0; i < valid.length; i += CHUNK) {
    const chunk = valid.slice(i, i + CHUNK);
    await db.insert(legoSets)
      .values(chunk.map(recordToRow))
      .onConflictDoUpdate({
        target: legoSets.setNumber,
        set: {
          name:                 sql`CASE WHEN excluded.name != '' THEN excluded.name ELSE lego_sets.name END`,
          theme:                sql`CASE WHEN excluded.theme != '' THEN excluded.theme ELSE lego_sets.theme END`,
          themeId:              sql`COALESCE(excluded.theme_id, lego_sets.theme_id)`,
          year:                 sql`COALESCE(excluded.year, lego_sets.year)`,
          pieces:               sql`COALESCE(excluded.pieces, lego_sets.pieces)`,
          imageUrl:             sql`COALESCE(excluded.image_url, lego_sets.image_url)`,
          brickowlId:           sql`COALESCE(excluded.brickowl_id, lego_sets.brickowl_id)`,
          brickowlUrl:          sql`COALESCE(excluded.brickowl_url, lego_sets.brickowl_url)`,
          marketPriceGbp:       sql`COALESCE(excluded.market_price_gbp, lego_sets.market_price_gbp)`,
          marketPriceUpdatedAt: sql`COALESCE(excluded.market_price_updated_at, lego_sets.market_price_updated_at)`,
          launchDate:           sql`COALESCE(excluded.launch_date, lego_sets.launch_date)`,
          exitDate:             sql`COALESCE(excluded.exit_date, lego_sets.exit_date)`,
          msrpUsd:              sql`COALESCE(excluded.msrp_usd, lego_sets.msrp_usd)`,
          msrpGbp:              sql`COALESCE(excluded.msrp_gbp, lego_sets.msrp_gbp)`,
          msrpEur:              sql`COALESCE(excluded.msrp_eur, lego_sets.msrp_eur)`,
          rebrickableUrl:       sql`COALESCE(excluded.rebrickable_url, lego_sets.rebrickable_url)`,
          bricksetUrl:          sql`CASE WHEN excluded.brickset_url != '' THEN excluded.brickset_url ELSE lego_sets.brickset_url END`,
          sources:              sql`(SELECT jsonb_agg(DISTINCT elem) FROM jsonb_array_elements_text(COALESCE(lego_sets.sources, '[]'::jsonb) || COALESCE(excluded.sources, '[]'::jsonb)) AS elem)`,
          lastSyncedAt:         sql`excluded.last_synced_at`,
        },
      });
  }
}

export async function getAll(): Promise<LegoSetRecord[]> {
  const rows = await db.select().from(legoSets);
  return rows.map(rowToRecord);
}

export async function getByNumber(setNumber: string): Promise<LegoSetRecord | null> {
  const rows = await db.select().from(legoSets).where(eq(legoSets.setNumber, setNumber)).limit(1);
  return rows[0] ? rowToRecord(rows[0]) : null;
}

export async function getStats(): Promise<{
  totalSets:    number;
  withBrickowl: number;
  withPrices:   number;
  withDates:    number;
  syncedAt:     string | null;
}> {
  const [[total], [brickowl], [prices], [dates], [last]] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(legoSets),
    db.select({ c: sql<number>`count(*)::int` }).from(legoSets).where(isNotNull(legoSets.brickowlId)),
    db.select({ c: sql<number>`count(*)::int` }).from(legoSets).where(isNotNull(legoSets.marketPriceGbp)),
    db.select({ c: sql<number>`count(*)::int` }).from(legoSets).where(isNotNull(legoSets.launchDate)),
    db.select({ t: sql<string | null>`max(last_synced_at)` }).from(legoSets),
  ]);

  return {
    totalSets:    total?.c ?? 0,
    withBrickowl: brickowl?.c ?? 0,
    withPrices:   prices?.c ?? 0,
    withDates:    dates?.c ?? 0,
    syncedAt:     last?.t ?? null,
  };
}

export async function isEmpty(): Promise<boolean> {
  const [row] = await db.select({ c: sql<number>`count(*)::int` }).from(legoSets);
  return (row?.c ?? 0) === 0;
}
