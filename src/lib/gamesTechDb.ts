/**
 * Server-side only — uses Neon DB via Drizzle ORM.
 */
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, gamesTech } from "./db";
import type { GamesTechRecord } from "./gamesTechRecord";

// ─── Converters ───────────────────────────────────────────────────────────────

function recordToRow(r: GamesTechRecord) {
  return {
    id:                r.id,
    name:              r.name,
    platform:          r.platform,
    category:          r.category,
    loosePriceCents:   r.loosePriceCents   ?? null,
    cibPriceCents:     r.cibPriceCents     ?? null,
    newPriceCents:     r.newPriceCents     ?? null,
    priceUpdatedAt:    r.priceUpdatedAt    ?? null,
    cexBoxId:          r.cexBoxId          ?? null,
    cexSellPriceCents: r.cexSellPriceCents ?? null,
    cexCashPriceCents: r.cexCashPriceCents ?? null,
    igdbId:            r.igdbId            ?? null,
    description:       r.description       ?? null,
    genres:            r.genres,
    coverUrl:          r.coverUrl          ?? null,
    releaseYear:       r.releaseYear       ?? null,
    imageUrl:          r.imageUrl          ?? null,
    priceChartingUrl:  r.priceChartingUrl  ?? null,
    sources:           r.sources,
    lastSyncedAt:      new Date().toISOString(),
  };
}

function rowToRecord(row: typeof gamesTech.$inferSelect): GamesTechRecord {
  return {
    id:                row.id,
    name:              row.name,
    platform:          row.platform,
    category:          row.category,
    loosePriceCents:   row.loosePriceCents   ?? null,
    cibPriceCents:     row.cibPriceCents     ?? null,
    newPriceCents:     row.newPriceCents     ?? null,
    priceUpdatedAt:    row.priceUpdatedAt    ?? null,
    cexBoxId:          row.cexBoxId          ?? null,
    cexSellPriceCents: row.cexSellPriceCents ?? null,
    cexCashPriceCents: row.cexCashPriceCents ?? null,
    igdbId:            row.igdbId            ?? null,
    description:       row.description       ?? null,
    genres:            (row.genres as string[]) ?? [],
    coverUrl:          row.coverUrl          ?? null,
    releaseYear:       row.releaseYear       ?? null,
    imageUrl:          row.imageUrl          ?? null,
    priceChartingUrl:  row.priceChartingUrl  ?? null,
    sources:           (row.sources as string[]) ?? [],
    lastSyncedAt:      row.lastSyncedAt ?? new Date().toISOString(),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function upsertGamesTech(incoming: GamesTechRecord[]): Promise<void> {
  if (incoming.length === 0) return;

  const CHUNK = 100;
  for (let i = 0; i < incoming.length; i += CHUNK) {
    const chunk = incoming.slice(i, i + CHUNK);
    await db.insert(gamesTech)
      .values(chunk.map(recordToRow))
      .onConflictDoUpdate({
        target: gamesTech.id,
        set: {
          name:              sql`CASE WHEN excluded.name != '' THEN excluded.name ELSE games_tech.name END`,
          platform:          sql`CASE WHEN excluded.platform != '' THEN excluded.platform ELSE games_tech.platform END`,
          category:          sql`CASE WHEN excluded.category != '' THEN excluded.category ELSE games_tech.category END`,
          loosePriceCents:   sql`COALESCE(excluded.loose_price_cents, games_tech.loose_price_cents)`,
          cibPriceCents:     sql`COALESCE(excluded.cib_price_cents, games_tech.cib_price_cents)`,
          newPriceCents:     sql`COALESCE(excluded.new_price_cents, games_tech.new_price_cents)`,
          priceUpdatedAt:    sql`COALESCE(excluded.price_updated_at, games_tech.price_updated_at)`,
          cexBoxId:          sql`COALESCE(excluded.cex_box_id, games_tech.cex_box_id)`,
          cexSellPriceCents: sql`COALESCE(excluded.cex_sell_price_cents, games_tech.cex_sell_price_cents)`,
          cexCashPriceCents: sql`COALESCE(excluded.cex_cash_price_cents, games_tech.cex_cash_price_cents)`,
          igdbId:            sql`COALESCE(excluded.igdb_id, games_tech.igdb_id)`,
          description:       sql`COALESCE(excluded.description, games_tech.description)`,
          genres:            sql`CASE WHEN excluded.genres IS NOT NULL AND excluded.genres != '[]'::jsonb THEN excluded.genres ELSE games_tech.genres END`,
          coverUrl:          sql`COALESCE(excluded.cover_url, games_tech.cover_url)`,
          releaseYear:       sql`COALESCE(excluded.release_year, games_tech.release_year)`,
          imageUrl:          sql`COALESCE(excluded.image_url, games_tech.image_url)`,
          priceChartingUrl:  sql`COALESCE(excluded.pricecharting_url, games_tech.pricecharting_url)`,
          sources:           sql`(SELECT jsonb_agg(DISTINCT elem) FROM jsonb_array_elements_text(COALESCE(games_tech.sources, '[]'::jsonb) || COALESCE(excluded.sources, '[]'::jsonb)) AS elem)`,
          lastSyncedAt:      sql`excluded.last_synced_at`,
        },
      });
  }
}

export async function searchGamesTech(q: string, limit = 10): Promise<GamesTechRecord[]> {
  const term = `%${q}%`;
  const rows = await db.select().from(gamesTech)
    .where(or(ilike(gamesTech.name, term), ilike(gamesTech.platform, term)))
    .limit(limit);
  return rows.map(rowToRecord);
}

export async function getById(id: string): Promise<GamesTechRecord | null> {
  const rows = await db.select().from(gamesTech).where(eq(gamesTech.id, id)).limit(1);
  return rows[0] ? rowToRecord(rows[0]) : null;
}

export async function getStats(): Promise<{
  total:      number;
  withPrices: number;
  withCex:    number;
  withIgdb:   number;
  platforms:  number;
  syncedAt:   string | null;
}> {
  const [[total], [withPrices], [withCex], [withIgdb], [platforms], [last]] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(gamesTech),
    db.select({ c: sql<number>`count(*)::int` }).from(gamesTech)
      .where(sql`loose_price_cents IS NOT NULL OR cib_price_cents IS NOT NULL OR cex_sell_price_cents IS NOT NULL`),
    db.select({ c: sql<number>`count(*)::int` }).from(gamesTech)
      .where(sql`cex_box_id IS NOT NULL`),
    db.select({ c: sql<number>`count(*)::int` }).from(gamesTech)
      .where(sql`igdb_id IS NOT NULL`),
    db.select({ c: sql<number>`count(distinct platform)::int` }).from(gamesTech),
    db.select({ t: sql<string | null>`max(last_synced_at)` }).from(gamesTech),
  ]);
  return {
    total:      total?.c      ?? 0,
    withPrices: withPrices?.c ?? 0,
    withCex:    withCex?.c    ?? 0,
    withIgdb:   withIgdb?.c   ?? 0,
    platforms:  platforms?.c  ?? 0,
    syncedAt:   last?.t       ?? null,
  };
}

export async function isEmpty(): Promise<boolean> {
  const [row] = await db.select({ c: sql<number>`count(*)::int` }).from(gamesTech);
  return (row?.c ?? 0) === 0;
}
