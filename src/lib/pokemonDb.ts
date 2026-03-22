/**
 * Server-side only — uses Neon DB via Drizzle ORM.
 */
import { eq, ilike, sql, and } from "drizzle-orm";
import { db, pokemonCards } from "./db";
import type { PokemonCardRecord } from "./pokemonCardRecord";

// ─── Converters ───────────────────────────────────────────────────────────────

function recordToRow(r: PokemonCardRecord) {
  return {
    id:             r.id,
    name:           r.name,
    localId:        r.localId,
    setId:          r.setId          ?? null,
    setName:        r.setName        ?? null,
    serieName:      r.serieName      ?? null,
    releaseDate:    r.releaseDate    ?? null,
    rarity:         r.rarity         ?? null,
    hp:             r.hp             ?? null,
    types:          r.types,
    imageSmallUrl:  r.imageSmallUrl  ?? null,
    imageLargeUrl:  r.imageLargeUrl  ?? null,
    priceEurCents:  r.priceEurCents  ?? null,
    priceUsdCents:  r.priceUsdCents  ?? null,
    priceUpdatedAt: r.priceUpdatedAt ?? null,
    lang:           r.lang,
    lastSyncedAt:   new Date().toISOString(),
  };
}

function rowToRecord(row: typeof pokemonCards.$inferSelect): PokemonCardRecord {
  return {
    id:             row.id,
    name:           row.name,
    localId:        row.localId,
    setId:          row.setId          ?? null,
    setName:        row.setName        ?? null,
    serieName:      row.serieName      ?? null,
    releaseDate:    row.releaseDate    ?? null,
    rarity:         row.rarity         ?? null,
    hp:             row.hp             ?? null,
    types:          (row.types as string[]) ?? [],
    imageSmallUrl:  row.imageSmallUrl  ?? null,
    imageLargeUrl:  row.imageLargeUrl  ?? null,
    priceEurCents:  row.priceEurCents  ?? null,
    priceUsdCents:  row.priceUsdCents  ?? null,
    priceUpdatedAt: row.priceUpdatedAt ?? null,
    lang:           (row.lang as "en" | "ja") ?? "en",
    lastSyncedAt:   row.lastSyncedAt ?? new Date().toISOString(),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function upsertCards(incoming: PokemonCardRecord[]): Promise<void> {
  if (incoming.length === 0) return;

  const CHUNK = 100;
  for (let i = 0; i < incoming.length; i += CHUNK) {
    const chunk = incoming.slice(i, i + CHUNK);
    await db.insert(pokemonCards)
      .values(chunk.map(recordToRow))
      .onConflictDoUpdate({
        target: pokemonCards.id,
        set: {
          name:           sql`CASE WHEN excluded.name != '' THEN excluded.name ELSE pokemon_cards.name END`,
          localId:        sql`COALESCE(excluded.local_id, pokemon_cards.local_id)`,
          setId:          sql`COALESCE(excluded.set_id, pokemon_cards.set_id)`,
          setName:        sql`COALESCE(excluded.set_name, pokemon_cards.set_name)`,
          serieName:      sql`COALESCE(excluded.serie_name, pokemon_cards.serie_name)`,
          releaseDate:    sql`COALESCE(excluded.release_date, pokemon_cards.release_date)`,
          rarity:         sql`COALESCE(excluded.rarity, pokemon_cards.rarity)`,
          hp:             sql`COALESCE(excluded.hp, pokemon_cards.hp)`,
          types:          sql`CASE WHEN excluded.types IS NOT NULL AND excluded.types != '[]'::jsonb THEN excluded.types ELSE pokemon_cards.types END`,
          imageSmallUrl:  sql`COALESCE(excluded.image_small_url, pokemon_cards.image_small_url)`,
          imageLargeUrl:  sql`COALESCE(excluded.image_large_url, pokemon_cards.image_large_url)`,
          priceEurCents:  sql`COALESCE(excluded.price_eur_cents, pokemon_cards.price_eur_cents)`,
          priceUsdCents:  sql`COALESCE(excluded.price_usd_cents, pokemon_cards.price_usd_cents)`,
          priceUpdatedAt: sql`COALESCE(excluded.price_updated_at, pokemon_cards.price_updated_at)`,
          lang:           sql`excluded.lang`,
          lastSyncedAt:   sql`excluded.last_synced_at`,
        },
      });
  }
}

export async function searchCards(
  q: string,
  lang?: "en" | "ja",
  limit = 10,
): Promise<PokemonCardRecord[]> {
  const term = `%${q}%`;
  const where = lang
    ? and(ilike(pokemonCards.name, term), eq(pokemonCards.lang, lang))
    : ilike(pokemonCards.name, term);

  const rows = await db.select().from(pokemonCards)
    .where(where)
    .limit(limit);
  return rows.map(rowToRecord);
}

export async function getById(id: string): Promise<PokemonCardRecord | null> {
  const rows = await db.select().from(pokemonCards).where(eq(pokemonCards.id, id)).limit(1);
  return rows[0] ? rowToRecord(rows[0]) : null;
}

export async function getStats(): Promise<{
  total: number;
  withPrices: number;
  syncedAt: string | null;
}> {
  const [[total], [withPrices], [last]] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(pokemonCards),
    db.select({ c: sql<number>`count(*)::int` }).from(pokemonCards)
      .where(sql`price_eur_cents IS NOT NULL OR price_usd_cents IS NOT NULL`),
    db.select({ t: sql<string | null>`max(last_synced_at)` }).from(pokemonCards),
  ]);
  return {
    total:      total?.c      ?? 0,
    withPrices: withPrices?.c ?? 0,
    syncedAt:   last?.t       ?? null,
  };
}

export async function isEmpty(): Promise<boolean> {
  const [row] = await db.select({ c: sql<number>`count(*)::int` }).from(pokemonCards);
  return (row?.c ?? 0) === 0;
}
