/**
 * Server-side only — uses Neon DB via Drizzle ORM.
 */
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, sportsCards } from "./db";
import type { SportsCardRecord, SportType } from "./sportsCardRecord";

// ─── Converters ───────────────────────────────────────────────────────────────

function recordToRow(r: SportsCardRecord) {
  return {
    id:               r.id,
    sport:            r.sport,
    name:             r.name,
    fullName:         r.fullName         ?? null,
    setName:          r.setName          ?? null,
    year:             r.year             ?? null,
    playerName:       r.playerName       ?? null,
    cardNumber:       r.cardNumber       ?? null,
    loosePriceCents:  r.loosePriceCents  ?? null,
    gradedPriceCents: r.gradedPriceCents ?? null,
    imageUrl:         r.imageUrl         ?? null,
    priceChartingUrl: r.priceChartingUrl ?? null,
    priceUpdatedAt:   r.priceUpdatedAt   ?? null,
    lastSyncedAt:     new Date().toISOString(),
  };
}

function rowToRecord(row: typeof sportsCards.$inferSelect): SportsCardRecord {
  return {
    id:               row.id,
    sport:            row.sport as SportType,
    name:             row.name,
    fullName:         row.fullName         ?? null,
    setName:          row.setName          ?? null,
    year:             row.year             ?? null,
    playerName:       row.playerName       ?? null,
    cardNumber:       row.cardNumber       ?? null,
    loosePriceCents:  row.loosePriceCents  ?? null,
    gradedPriceCents: row.gradedPriceCents ?? null,
    imageUrl:         row.imageUrl         ?? null,
    priceChartingUrl: row.priceChartingUrl ?? null,
    priceUpdatedAt:   row.priceUpdatedAt   ?? null,
    lastSyncedAt:     row.lastSyncedAt ?? new Date().toISOString(),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function upsertCards(incoming: SportsCardRecord[]): Promise<void> {
  if (incoming.length === 0) return;

  const CHUNK = 100;
  for (let i = 0; i < incoming.length; i += CHUNK) {
    const chunk = incoming.slice(i, i + CHUNK);
    await db.insert(sportsCards)
      .values(chunk.map(recordToRow))
      .onConflictDoUpdate({
        target: sportsCards.id,
        set: {
          name:             sql`CASE WHEN excluded.name != '' THEN excluded.name ELSE sports_cards.name END`,
          sport:            sql`excluded.sport`,
          fullName:         sql`COALESCE(excluded.full_name, sports_cards.full_name)`,
          setName:          sql`COALESCE(excluded.set_name, sports_cards.set_name)`,
          year:             sql`COALESCE(excluded.year, sports_cards.year)`,
          playerName:       sql`COALESCE(excluded.player_name, sports_cards.player_name)`,
          cardNumber:       sql`COALESCE(excluded.card_number, sports_cards.card_number)`,
          loosePriceCents:  sql`COALESCE(excluded.loose_price_cents, sports_cards.loose_price_cents)`,
          gradedPriceCents: sql`COALESCE(excluded.graded_price_cents, sports_cards.graded_price_cents)`,
          imageUrl:         sql`COALESCE(excluded.image_url, sports_cards.image_url)`,
          priceChartingUrl: sql`COALESCE(excluded.pricecharting_url, sports_cards.pricecharting_url)`,
          priceUpdatedAt:   sql`COALESCE(excluded.price_updated_at, sports_cards.price_updated_at)`,
          lastSyncedAt:     sql`excluded.last_synced_at`,
        },
      });
  }
}

export async function searchCards(
  q: string,
  sport?: string,
  limit = 10,
): Promise<SportsCardRecord[]> {
  const term = `%${q}%`;
  const nameMatch = or(
    ilike(sportsCards.name, term),
    ilike(sportsCards.playerName, term),
    ilike(sportsCards.fullName, term),
  );

  const rows = sport
    ? await db.select().from(sportsCards)
        .where(sql`${sportsCards.sport} = ${sport} AND (${nameMatch})`)
        .limit(limit)
    : await db.select().from(sportsCards)
        .where(nameMatch)
        .limit(limit);

  return rows.map(rowToRecord);
}

export async function getBySport(sport: SportType, limit = 50): Promise<SportsCardRecord[]> {
  const rows = await db.select().from(sportsCards)
    .where(eq(sportsCards.sport, sport))
    .limit(limit);
  return rows.map(rowToRecord);
}

export async function getStats(): Promise<{
  total: number;
  bySport: Record<string, number>;
  syncedAt: string | null;
}> {
  const [rows, [last]] = await Promise.all([
    db.select({
      sport: sportsCards.sport,
      c: sql<number>`count(*)::int`,
    }).from(sportsCards).groupBy(sportsCards.sport),
    db.select({ t: sql<string | null>`max(last_synced_at)` }).from(sportsCards),
  ]);

  const bySport: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    bySport[row.sport] = row.c;
    total += row.c;
  }

  return { total, bySport, syncedAt: last?.t ?? null };
}

export async function isEmpty(): Promise<boolean> {
  const [row] = await db.select({ c: sql<number>`count(*)::int` }).from(sportsCards);
  return (row?.c ?? 0) === 0;
}
