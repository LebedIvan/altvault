/**
 * Server-side only — uses Neon DB via Drizzle ORM.
 */
import { eq, ilike, sql } from "drizzle-orm";
import { db, mtgCards } from "./db";
import type { MtgCardRecord } from "./mtgCardRecord";

// ─── Converters ───────────────────────────────────────────────────────────────

function recordToRow(r: MtgCardRecord) {
  return {
    id:                r.id,
    oracleId:          r.oracleId          ?? null,
    name:              r.name,
    setCode:           r.setCode,
    setName:           r.setName           ?? null,
    collectorNumber:   r.collectorNumber   ?? null,
    rarity:            r.rarity            ?? null,
    releasedAt:        r.releasedAt        ?? null,
    manaCost:          r.manaCost          ?? null,
    typeLine:          r.typeLine          ?? null,
    oracleText:        r.oracleText        ?? null,
    edhrecRank:        r.edhrecRank        ?? null,
    imageSmallUrl:     r.imageSmallUrl     ?? null,
    imageLargeUrl:     r.imageLargeUrl     ?? null,
    imagePngUrl:       r.imagePngUrl       ?? null,
    priceEurCents:     r.priceEurCents     ?? null,
    priceEurFoilCents: r.priceEurFoilCents ?? null,
    priceUsdCents:     r.priceUsdCents     ?? null,
    priceUsdFoilCents: r.priceUsdFoilCents ?? null,
    priceUpdatedAt:    r.priceUpdatedAt    ?? null,
    tcgplayerUrl:      r.tcgplayerUrl      ?? null,
    cardmarketUrl:     r.cardmarketUrl     ?? null,
    lastSyncedAt:      new Date().toISOString(),
  };
}

function rowToRecord(row: typeof mtgCards.$inferSelect): MtgCardRecord {
  return {
    id:                row.id,
    oracleId:          row.oracleId          ?? null,
    name:              row.name,
    setCode:           row.setCode,
    setName:           row.setName           ?? null,
    collectorNumber:   row.collectorNumber   ?? null,
    rarity:            row.rarity            ?? null,
    releasedAt:        row.releasedAt        ?? null,
    manaCost:          row.manaCost          ?? null,
    typeLine:          row.typeLine          ?? null,
    oracleText:        row.oracleText        ?? null,
    edhrecRank:        row.edhrecRank        ?? null,
    imageSmallUrl:     row.imageSmallUrl     ?? null,
    imageLargeUrl:     row.imageLargeUrl     ?? null,
    imagePngUrl:       row.imagePngUrl       ?? null,
    priceEurCents:     row.priceEurCents     ?? null,
    priceEurFoilCents: row.priceEurFoilCents ?? null,
    priceUsdCents:     row.priceUsdCents     ?? null,
    priceUsdFoilCents: row.priceUsdFoilCents ?? null,
    priceUpdatedAt:    row.priceUpdatedAt    ?? null,
    tcgplayerUrl:      row.tcgplayerUrl      ?? null,
    cardmarketUrl:     row.cardmarketUrl     ?? null,
    lastSyncedAt:      row.lastSyncedAt ?? new Date().toISOString(),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function upsertCards(incoming: MtgCardRecord[]): Promise<void> {
  if (incoming.length === 0) return;

  const CHUNK = 100;
  for (let i = 0; i < incoming.length; i += CHUNK) {
    const chunk = incoming.slice(i, i + CHUNK);
    await db.insert(mtgCards)
      .values(chunk.map(recordToRow))
      .onConflictDoUpdate({
        target: mtgCards.id,
        set: {
          // Scryfall bulk data is authoritative — always overwrite prices
          priceEurCents:     sql`excluded.price_eur_cents`,
          priceEurFoilCents: sql`excluded.price_eur_foil_cents`,
          priceUsdCents:     sql`excluded.price_usd_cents`,
          priceUsdFoilCents: sql`excluded.price_usd_foil_cents`,
          priceUpdatedAt:    sql`excluded.price_updated_at`,
          // Catalog fields: preserve existing if incoming null
          oracleId:          sql`COALESCE(excluded.oracle_id, mtg_cards.oracle_id)`,
          name:              sql`CASE WHEN excluded.name != '' THEN excluded.name ELSE mtg_cards.name END`,
          setCode:           sql`CASE WHEN excluded.set_code != '' THEN excluded.set_code ELSE mtg_cards.set_code END`,
          setName:           sql`COALESCE(excluded.set_name, mtg_cards.set_name)`,
          collectorNumber:   sql`COALESCE(excluded.collector_number, mtg_cards.collector_number)`,
          rarity:            sql`COALESCE(excluded.rarity, mtg_cards.rarity)`,
          releasedAt:        sql`COALESCE(excluded.released_at, mtg_cards.released_at)`,
          manaCost:          sql`COALESCE(excluded.mana_cost, mtg_cards.mana_cost)`,
          typeLine:          sql`COALESCE(excluded.type_line, mtg_cards.type_line)`,
          oracleText:        sql`COALESCE(excluded.oracle_text, mtg_cards.oracle_text)`,
          edhrecRank:        sql`COALESCE(excluded.edhrec_rank, mtg_cards.edhrec_rank)`,
          imageSmallUrl:     sql`COALESCE(excluded.image_small_url, mtg_cards.image_small_url)`,
          imageLargeUrl:     sql`COALESCE(excluded.image_large_url, mtg_cards.image_large_url)`,
          imagePngUrl:       sql`COALESCE(excluded.image_png_url, mtg_cards.image_png_url)`,
          tcgplayerUrl:      sql`COALESCE(excluded.tcgplayer_url, mtg_cards.tcgplayer_url)`,
          cardmarketUrl:     sql`COALESCE(excluded.cardmarket_url, mtg_cards.cardmarket_url)`,
          lastSyncedAt:      sql`excluded.last_synced_at`,
        },
      });
  }
}

/** Search by card name, sorted by EDHREC rank (most popular first). */
export async function searchCards(q: string, limit = 10): Promise<MtgCardRecord[]> {
  const rows = await db.select().from(mtgCards)
    .where(ilike(mtgCards.name, `%${q}%`))
    .orderBy(sql`${mtgCards.edhrecRank} ASC NULLS LAST`)
    .limit(limit);
  return rows.map(rowToRecord);
}

/** Exact name match — used for price refresh. */
export async function getByName(name: string): Promise<MtgCardRecord | null> {
  const rows = await db.select().from(mtgCards)
    .where(eq(mtgCards.name, name))
    .orderBy(sql`${mtgCards.edhrecRank} ASC NULLS LAST`)
    .limit(1);
  return rows[0] ? rowToRecord(rows[0]) : null;
}

export async function getById(id: string): Promise<MtgCardRecord | null> {
  const rows = await db.select().from(mtgCards).where(eq(mtgCards.id, id)).limit(1);
  return rows[0] ? rowToRecord(rows[0]) : null;
}

export async function getStats(): Promise<{
  total: number;
  withPrices: number;
  sets: number;
  syncedAt: string | null;
}> {
  const [[total], [withPrices], [sets], [last]] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(mtgCards),
    db.select({ c: sql<number>`count(*)::int` }).from(mtgCards)
      .where(sql`price_eur_cents IS NOT NULL OR price_usd_cents IS NOT NULL`),
    db.select({ c: sql<number>`count(distinct set_code)::int` }).from(mtgCards),
    db.select({ t: sql<string | null>`max(last_synced_at)` }).from(mtgCards),
  ]);
  return {
    total:      total?.c      ?? 0,
    withPrices: withPrices?.c ?? 0,
    sets:       sets?.c       ?? 0,
    syncedAt:   last?.t       ?? null,
  };
}

export async function isEmpty(): Promise<boolean> {
  const [row] = await db.select({ c: sql<number>`count(*)::int` }).from(mtgCards);
  return (row?.c ?? 0) === 0;
}
