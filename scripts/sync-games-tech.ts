/**
 * Games & Tech database sync script.
 *
 * Queries PriceCharting for every major gaming platform and stores results
 * in data/games-tech-db.json, then upserts into Neon PostgreSQL.
 *
 * Usage:
 *   npx tsx scripts/sync-games-tech.ts
 *
 * Environment variables (from .env.local):
 *   PRICECHARTING_API_KEY  — required
 *   DATABASE_URL           — required for DB upsert
 */

import path from "path";
import fs from "fs";
import type { GamesTechRecord } from "../src/lib/gamesTechRecord";

// ─── Load .env.local ──────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

import { upsertGamesTech } from "../src/lib/gamesTechDb";

const PC_KEY   = process.env.PRICECHARTING_API_KEY ?? "";
const DB_PATH  = path.join(process.cwd(), "data", "games-tech-db.json");

function log(msg: string) {
  process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] ${msg}\n`);
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// ─── Platforms to query ────────────────────────────────────────────────────────
// Each entry has a query string and the inferred category for items returned.

const PLATFORM_QUERIES: Array<{ query: string; platform: string; category: string }> = [
  // Sony
  { query: "playstation 5",   platform: "PlayStation 5",   category: "game" },
  { query: "playstation 4",   platform: "PlayStation 4",   category: "game" },
  { query: "playstation 3",   platform: "PlayStation 3",   category: "game" },
  { query: "playstation 2",   platform: "PlayStation 2",   category: "game" },
  { query: "playstation 1",   platform: "PlayStation",     category: "game" },
  { query: "psp",             platform: "PSP",             category: "game" },
  { query: "ps vita",         platform: "PlayStation Vita", category: "game" },

  // Microsoft
  { query: "xbox series",     platform: "Xbox Series",     category: "game" },
  { query: "xbox one",        platform: "Xbox One",        category: "game" },
  { query: "xbox 360",        platform: "Xbox 360",        category: "game" },
  { query: "xbox",            platform: "Xbox",            category: "game" },

  // Nintendo home consoles
  { query: "nintendo switch", platform: "Nintendo Switch", category: "game" },
  { query: "wii u",           platform: "Wii U",           category: "game" },
  { query: "wii",             platform: "Wii",             category: "game" },
  { query: "gamecube",        platform: "GameCube",        category: "game" },
  { query: "nintendo 64",     platform: "Nintendo 64",     category: "game" },
  { query: "super nintendo",  platform: "Super Nintendo",  category: "game" },
  { query: "nintendo nes",    platform: "NES",             category: "game" },

  // Nintendo handhelds
  { query: "game boy advance", platform: "Game Boy Advance", category: "game" },
  { query: "game boy color",   platform: "Game Boy Color",   category: "game" },
  { query: "game boy",         platform: "Game Boy",         category: "game" },
  { query: "nintendo ds",      platform: "Nintendo DS",      category: "game" },
  { query: "nintendo 3ds",     platform: "Nintendo 3DS",     category: "game" },

  // Sega
  { query: "sega genesis",    platform: "Sega Genesis",    category: "game" },
  { query: "sega dreamcast",  platform: "Sega Dreamcast",  category: "game" },
  { query: "sega saturn",     platform: "Sega Saturn",     category: "game" },

  // Consoles as products (hardware)
  { query: "ps4 console",     platform: "PlayStation 4",   category: "console" },
  { query: "ps5 console",     platform: "PlayStation 5",   category: "console" },
  { query: "switch console",  platform: "Nintendo Switch", category: "console" },
  { query: "xbox console",    platform: "Xbox",            category: "console" },
];

// ─── PriceCharting fetch ──────────────────────────────────────────────────────

interface PCProduct {
  id: string;
  "product-name": string;
  "console-name": string;
  "loose-price": number;
  "cib-price": number;
  "new-price": number;
}

async function fetchPCPage(query: string): Promise<PCProduct[]> {
  if (!PC_KEY) return [];
  const url = `https://www.pricecharting.com/api/products?q=${encodeURIComponent(query)}&id=${PC_KEY}&status=price`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const data = await res.json() as { products?: PCProduct[] };
    return data.products ?? [];
  } catch {
    return [];
  }
}

function inferCategory(consoleName: string, overrideCategory: string): string {
  const lower = consoleName.toLowerCase();
  if (lower.includes("console") || overrideCategory === "console") return "console";
  if (lower.includes("game boy") || lower.includes("gba") || lower.includes("gbc") ||
      lower.includes("psp") || lower.includes("vita") || lower.includes("3ds") ||
      lower.includes("nds") || lower.includes("ds")) return "handheld";
  return "game";
}

function makePCUrl(id: string): string {
  return `https://www.pricecharting.com/game/${id}`;
}

// ─── Local DB file ────────────────────────────────────────────────────────────

interface GamesTechDbFile {
  version:    number;
  syncedAt:   string | null;
  totalItems: number;
  items:      Record<string, GamesTechRecord>;
}

function loadDb(): GamesTechDbFile {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as GamesTechDbFile;
    }
  } catch { /* start fresh */ }
  return { version: 1, syncedAt: null, totalItems: 0, items: {} };
}

function saveDb(db: GamesTechDbFile) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!PC_KEY) {
    log("ERROR: PRICECHARTING_API_KEY not set.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    log("ERROR: DATABASE_URL not set.");
    process.exit(1);
  }

  const localDb = loadDb();
  log(`Starting sync. Existing items: ${Object.keys(localDb.items).length}`);

  let fetched = 0;
  let added   = 0;

  for (const { query, platform, category } of PLATFORM_QUERIES) {
    log(`  Querying: "${query}" (${platform})`);
    const products = await fetchPCPage(query);
    fetched += products.length;

    for (const p of products) {
      if (localDb.items[p.id]) continue; // already have it

      const loose = p["loose-price"] ? Math.round(p["loose-price"]) : null;
      const cib   = p["cib-price"]   ? Math.round(p["cib-price"])   : null;
      const newP  = p["new-price"]   ? Math.round(p["new-price"])   : null;

      localDb.items[p.id] = {
        id:               p.id,
        name:             p["product-name"],
        platform:         p["console-name"] || platform,
        category:         inferCategory(p["console-name"] || platform, category),
        loosePriceCents:  loose,
        cibPriceCents:    cib,
        newPriceCents:    newP,
        priceUpdatedAt:   new Date().toISOString(),
        cexBoxId:         null,
        cexSellPriceCents: null,
        cexCashPriceCents: null,
        igdbId:           null,
        description:      null,
        genres:           [],
        coverUrl:         null,
        releaseYear:      null,
        imageUrl:         null,
        priceChartingUrl: makePCUrl(p.id),
        sources:          ["pricecharting"],
        lastSyncedAt:     new Date().toISOString(),
      };
      added++;
    }

    log(`    Got ${products.length} results (${added} new total)`);
    await sleep(400); // be gentle to the API
  }

  localDb.syncedAt   = new Date().toISOString();
  localDb.totalItems = Object.keys(localDb.items).length;
  saveDb(localDb);
  log(`Saved ${localDb.totalItems} items to ${DB_PATH}`);

  // Upsert into Neon DB
  const records = Object.values(localDb.items);
  const CHUNK = 200;
  let done = 0;
  for (let i = 0; i < records.length; i += CHUNK) {
    await upsertGamesTech(records.slice(i, i + CHUNK));
    done += Math.min(CHUNK, records.length - i);
    log(`  DB: ${done}/${records.length} (${Math.round(done / records.length * 100)}%)`);
  }

  log(`✓ Done. ${records.length} items in DB. Fetched ${fetched} from PriceCharting, ${added} new.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
