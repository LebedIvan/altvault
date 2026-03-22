/**
 * Sync CS2 items from Skinport API into the cs2_items table.
 *
 * Strategy:
 *   - GET https://api.skinport.com/v1/items?app_id=730&currency=EUR
 *   - Returns all ~100k CS2 items in one JSON response
 *   - Parse market_hash_name into weapon/skin/exterior components
 *   - Upsert in chunks of 100
 *
 * Usage:
 *   npx tsx scripts/sync-cs2.ts
 *
 * No API key required (Skinport items endpoint is public).
 */

import path from "path";
import fs from "fs";
import type { Cs2ItemRecord } from "../src/lib/cs2ItemRecord";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

import { upsertItems, parseMarketHashName, getStats } from "../src/lib/cs2Db";

function log(msg: string) {
  process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] ${msg}\n`);
}

interface SkinportItem {
  market_hash_name: string;
  currency: string;
  suggested_price: number | null; // EUR, in whole units (not cents)
  min_price: number | null;
  item_page?: string;
  icon_url?: string | null;
}

async function main() {
  log("═══ CS2 Items Sync (Skinport) ═══════════════════════════");
  log("Downloading Skinport item catalog...");

  const res = await fetch(
    "https://api.skinport.com/v1/items?app_id=730&currency=EUR",
    { headers: { "User-Agent": "Vaulty/1.0", "Accept-Encoding": "br" } },
  );

  if (!res.ok) {
    throw new Error(`Skinport API returned ${res.status}: ${res.statusText}`);
  }

  const items = (await res.json()) as SkinportItem[];
  log(`Received ${items.length} items. Parsing and upserting...`);

  const now = new Date().toISOString();
  // Deduplicate by market_hash_name (Skinport occasionally returns duplicates)
  const seen = new Set<string>();
  const uniqueItems = items.filter((item) => {
    if (seen.has(item.market_hash_name)) return false;
    seen.add(item.market_hash_name);
    return true;
  });
  log(`Unique items after dedup: ${uniqueItems.length}`);

  const records: Cs2ItemRecord[] = uniqueItems.map((item) => {
    const parsed = parseMarketHashName(item.market_hash_name);
    return {
      marketHashName:      item.market_hash_name,
      weaponType:          parsed.weaponType,
      skinName:            parsed.skinName,
      exterior:            parsed.exterior,
      rarity:              null, // Skinport doesn't expose rarity; enrichable via Steam API later
      isStatTrak:          parsed.isStatTrak,
      isSouvenir:          parsed.isSouvenir,
      iconUrl:             item.icon_url ?? null,
      suggestedPriceCents: item.suggested_price != null ? Math.round(item.suggested_price * 100) : null,
      minPriceCents:       item.min_price       != null ? Math.round(item.min_price       * 100) : null,
      priceUpdatedAt:      now,
      lastSyncedAt:        now,
    };
  });

  await upsertItems(records);

  const stats = await getStats();
  log("═══ Done ════════════════════════════════════════════════");
  log(`Total items:  ${stats.total} | With prices: ${stats.withPrices}`);
  log(`Weapon types: ${stats.weapons}`);
  log(`Synced at:    ${stats.syncedAt}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
