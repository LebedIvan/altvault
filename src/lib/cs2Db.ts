/**
 * Server-side only — uses Neon DB via Drizzle ORM.
 */
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, cs2Items } from "./db";
import type { Cs2ItemRecord } from "./cs2ItemRecord";

// ─── Converters ───────────────────────────────────────────────────────────────

function recordToRow(r: Cs2ItemRecord) {
  return {
    marketHashName:      r.marketHashName,
    weaponType:          r.weaponType          ?? null,
    skinName:            r.skinName            ?? null,
    exterior:            r.exterior            ?? null,
    rarity:              r.rarity              ?? null,
    isStatTrak:          r.isStatTrak,
    isSouvenir:          r.isSouvenir,
    iconUrl:             r.iconUrl             ?? null,
    suggestedPriceCents: r.suggestedPriceCents ?? null,
    minPriceCents:       r.minPriceCents       ?? null,
    priceUpdatedAt:      r.priceUpdatedAt      ?? null,
    lastSyncedAt:        new Date().toISOString(),
  };
}

function rowToRecord(row: typeof cs2Items.$inferSelect): Cs2ItemRecord {
  return {
    marketHashName:      row.marketHashName,
    weaponType:          row.weaponType          ?? null,
    skinName:            row.skinName            ?? null,
    exterior:            row.exterior            ?? null,
    rarity:              row.rarity              ?? null,
    isStatTrak:          row.isStatTrak,
    isSouvenir:          row.isSouvenir,
    iconUrl:             row.iconUrl             ?? null,
    suggestedPriceCents: row.suggestedPriceCents ?? null,
    minPriceCents:       row.minPriceCents       ?? null,
    priceUpdatedAt:      row.priceUpdatedAt      ?? null,
    lastSyncedAt:        row.lastSyncedAt ?? new Date().toISOString(),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a Steam market_hash_name into components.
 * e.g. "StatTrak™ AK-47 | Redline (Field-Tested)"
 */
export function parseMarketHashName(marketHashName: string): {
  weaponType: string | null;
  skinName: string | null;
  exterior: string | null;
  isStatTrak: boolean;
  isSouvenir: boolean;
} {
  let name = marketHashName;
  let isStatTrak = false;
  let isSouvenir = false;

  if (name.startsWith("StatTrak\u2122 ")) {
    isStatTrak = true;
    name = name.slice("StatTrak\u2122 ".length);
  } else if (name.startsWith("Souvenir ")) {
    isSouvenir = true;
    name = name.slice("Souvenir ".length);
  }

  const pipeIdx = name.indexOf(" | ");
  if (pipeIdx === -1) {
    return { weaponType: name || null, skinName: null, exterior: null, isStatTrak, isSouvenir };
  }

  const weaponType = name.slice(0, pipeIdx);
  const rest = name.slice(pipeIdx + 3);

  // Extract exterior from trailing parentheses
  const parenMatch = rest.match(/^(.*)\(([^)]+)\)$/);
  if (!parenMatch) {
    return { weaponType, skinName: rest.trim() || null, exterior: null, isStatTrak, isSouvenir };
  }

  const skinName = parenMatch[1].trim();
  const exterior = parenMatch[2].trim();

  return { weaponType, skinName: skinName || null, exterior, isStatTrak, isSouvenir };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function upsertItems(incoming: Cs2ItemRecord[]): Promise<void> {
  if (incoming.length === 0) return;

  const CHUNK = 100;
  for (let i = 0; i < incoming.length; i += CHUNK) {
    const chunk = incoming.slice(i, i + CHUNK);
    await db.insert(cs2Items)
      .values(chunk.map(recordToRow))
      .onConflictDoUpdate({
        target: cs2Items.marketHashName,
        set: {
          // Prices always overwrite — Skinport is the live source
          suggestedPriceCents: sql`excluded.suggested_price_cents`,
          minPriceCents:       sql`excluded.min_price_cents`,
          priceUpdatedAt:      sql`excluded.price_updated_at`,
          // Catalog fields: preserve existing if incoming null
          weaponType:          sql`COALESCE(excluded.weapon_type, cs2_items.weapon_type)`,
          skinName:            sql`COALESCE(excluded.skin_name, cs2_items.skin_name)`,
          exterior:            sql`COALESCE(excluded.exterior, cs2_items.exterior)`,
          rarity:              sql`COALESCE(excluded.rarity, cs2_items.rarity)`,
          isStatTrak:          sql`excluded.is_stat_trak`,
          isSouvenir:          sql`excluded.is_souvenir`,
          iconUrl:             sql`COALESCE(excluded.icon_url, cs2_items.icon_url)`,
          lastSyncedAt:        sql`excluded.last_synced_at`,
        },
      });
  }
}

export async function searchItems(q: string, limit = 10): Promise<Cs2ItemRecord[]> {
  const term = `%${q}%`;
  const rows = await db.select().from(cs2Items)
    .where(or(
      ilike(cs2Items.marketHashName, term),
      ilike(cs2Items.skinName, term),
      ilike(cs2Items.weaponType, term),
    ))
    .limit(limit);
  return rows.map(rowToRecord);
}

export async function getByMarketHashName(name: string): Promise<Cs2ItemRecord | null> {
  const rows = await db.select().from(cs2Items)
    .where(eq(cs2Items.marketHashName, name))
    .limit(1);
  return rows[0] ? rowToRecord(rows[0]) : null;
}

export async function getStats(): Promise<{
  total: number;
  withPrices: number;
  weapons: number;
  syncedAt: string | null;
}> {
  const [[total], [withPrices], [weapons], [last]] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(cs2Items),
    db.select({ c: sql<number>`count(*)::int` }).from(cs2Items)
      .where(sql`suggested_price_cents IS NOT NULL`),
    db.select({ c: sql<number>`count(distinct weapon_type)::int` }).from(cs2Items),
    db.select({ t: sql<string | null>`max(last_synced_at)` }).from(cs2Items),
  ]);
  return {
    total:      total?.c      ?? 0,
    withPrices: withPrices?.c ?? 0,
    weapons:    weapons?.c    ?? 0,
    syncedAt:   last?.t       ?? null,
  };
}

export async function isEmpty(): Promise<boolean> {
  const [row] = await db.select({ c: sql<number>`count(*)::int` }).from(cs2Items);
  return (row?.c ?? 0) === 0;
}
