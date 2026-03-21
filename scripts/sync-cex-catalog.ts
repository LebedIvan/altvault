/**
 * CeX catalog crawler — no API key needed.
 *
 * Calls our own deployed /api/cex endpoint (which acts as a Cloudflare-safe proxy)
 * with ~80 search terms + pagination, deduplicates by boxId, saves to
 * data/games-tech-db.json, and upserts into Neon PostgreSQL.
 *
 * Usage:
 *   npx tsx scripts/sync-cex-catalog.ts
 *
 * Environment variables (from .env.local):
 *   NEXT_PUBLIC_BASE_URL — deployed app URL (e.g. https://vaulty.fund)
 *   DATABASE_URL         — required
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

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
const DB_PATH  = path.join(process.cwd(), "data", "games-tech-db.json");
const COUNT    = 50; // items per page
const DELAY_MS = 600; // between requests (be polite to our own server)

function log(msg: string) {
  process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] ${msg}\n`);
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// ─── Search terms (~80 covering all CeX categories) ──────────────────────────

const SEARCH_TERMS = [
  // Sony gaming
  "playstation 1", "playstation 2", "playstation 3", "playstation 4", "playstation 5",
  "psp", "ps vita",
  // Microsoft gaming
  "xbox", "xbox 360", "xbox one", "xbox series x", "xbox series s",
  // Nintendo home
  "nintendo switch", "wii u", "wii", "gamecube", "nintendo 64", "super nintendo", "nes",
  // Nintendo handheld
  "game boy advance", "game boy color", "game boy", "nintendo ds", "nintendo 3ds",
  // Sega
  "sega mega drive", "sega dreamcast", "sega saturn", "sega game gear",
  // Other retro
  "atari", "neo geo",
  // Generic game terms
  "ps4 game", "ps5 game", "switch game", "xbox game",
  // Apple tech
  "iphone 15", "iphone 14", "iphone 13", "iphone 12", "iphone 11", "iphone se",
  "iphone x", "iphone 8", "iphone 7",
  "ipad pro", "ipad air", "ipad mini", "ipad",
  "macbook pro", "macbook air", "apple watch",
  // Samsung
  "samsung galaxy s24", "samsung galaxy s23", "samsung galaxy s22", "samsung galaxy s21",
  "samsung galaxy a", "samsung galaxy tab", "samsung galaxy watch",
  // Other phones
  "google pixel", "oneplus", "sony xperia", "motorola moto",
  // Laptops
  "dell laptop", "hp laptop", "lenovo laptop", "asus laptop", "acer laptop", "surface pro",
  // Cameras & audio
  "gopro", "sony camera", "canon camera", "nikon",
  "airpods", "sony headphones", "bose headphones",
  // Wearables
  "garmin watch", "fitbit",
];

// ─── CeX category → our category ─────────────────────────────────────────────

function mapCategory(superCat: string, subCat: string): string {
  const s = (superCat + " " + subCat).toLowerCase();
  if (s.includes("video game") || s.includes("ps1") || s.includes("ps2") ||
      s.includes("ps3") || s.includes("ps4") || s.includes("ps5") ||
      s.includes("xbox") || s.includes("nintendo") || s.includes("switch game") ||
      s.includes("wii") || s.includes("gamecube") || s.includes("sega") ||
      s.includes("atari") || s.includes("pc game")) return "game";
  if (s.includes("console") || s.includes("games console")) return "console";
  if (s.includes("phone"))          return "phone";
  if (s.includes("tablet"))         return "tablet";
  if (s.includes("laptop") || s.includes("notebook") || s.includes("macbook")) return "laptop";
  if (s.includes("camera") || s.includes("camcorder") || s.includes("gopro")) return "camera";
  if (s.includes("wearable") || s.includes("watch") || s.includes("fitness") || s.includes("garmin")) return "wearable";
  if (s.includes("headphone") || s.includes("earphone") || s.includes("audio") || s.includes("speaker")) return "accessory";
  if (s.includes("computer") || s.includes("computing") || s.includes("desktop")) return "laptop";
  return "accessory";
}

// ─── DB file helpers ──────────────────────────────────────────────────────────

interface DbFile {
  version:    number;
  syncedAt:   string | null;
  totalItems: number;
  igdbOffset: number;
  items:      Record<string, GamesTechRecord>;
}

function loadDb(): DbFile {
  try {
    if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as DbFile;
  } catch { /* start fresh */ }
  return { version: 1, syncedAt: null, totalItems: 0, igdbOffset: 0, items: {} };
}

function saveDb(db: DbFile) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ─── Fetch via our own /api/cex proxy ────────────────────────────────────────

interface CexItem {
  id: string; name: string; sellPrice: number; cashPrice: number;
  category: string; subCategory: string; imageUrl: string | null;
}

async function fetchPage(q: string, firstRecord: number): Promise<CexItem[]> {
  const url = `${BASE_URL}/api/cex?q=${encodeURIComponent(q)}&firstRecord=${firstRecord}&count=${COUNT}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json() as { items?: CexItem[]; source?: string };
    if (data.source === "unavailable") return [];
    return data.items ?? [];
  } catch {
    return [];
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) {
    log("ERROR: DATABASE_URL not set.");
    process.exit(1);
  }

  log(`Using proxy: ${BASE_URL}/api/cex`);

  const localDb = loadDb();
  log(`Starting CeX catalog sync. Existing items: ${Object.keys(localDb.items).length}`);

  let requests = 0;
  let added    = 0;

  for (const term of SEARCH_TERMS) {
    let firstRecord = 1;
    let termAdded   = 0;
    let emptyPages  = 0;

    while (emptyPages < 2) {
      const items = await fetchPage(term, firstRecord);
      requests++;

      if (items.length === 0) {
        emptyPages++;
      } else {
        emptyPages = 0;
        for (const item of items) {
          if (localDb.items[item.id]) continue;

          localDb.items[item.id] = {
            id:                item.id,
            name:              item.name,
            platform:          item.subCategory || item.category,
            category:          mapCategory(item.category, item.subCategory ?? ""),
            loosePriceCents:   null,
            cibPriceCents:     null,
            newPriceCents:     null,
            priceUpdatedAt:    null,
            cexBoxId:          item.id,
            cexSellPriceCents: Math.round(item.sellPrice * 100),
            cexCashPriceCents: Math.round(item.cashPrice * 100),
            igdbId:            null,
            description:       null,
            genres:            [],
            coverUrl:          null,
            releaseYear:       null,
            imageUrl:          item.imageUrl,
            priceChartingUrl:  null,
            sources:           ["cex"],
            lastSyncedAt:      new Date().toISOString(),
          };
          termAdded++;
          added++;
        }
        firstRecord += COUNT;
      }

      await sleep(DELAY_MS);
      if (firstRecord > 1000) break; // max 20 pages per term
    }

    if (termAdded > 0) {
      log(`  "${term}" → +${termAdded} (total: ${Object.keys(localDb.items).length})`);
    }

    // Checkpoint every 10 terms
    if (requests % 30 === 0) {
      localDb.totalItems = Object.keys(localDb.items).length;
      saveDb(localDb);
      log(`  [checkpoint] ${localDb.totalItems} items`);
    }
  }

  localDb.syncedAt   = new Date().toISOString();
  localDb.totalItems = Object.keys(localDb.items).length;
  saveDb(localDb);
  log(`Saved ${localDb.totalItems} items to ${DB_PATH} (+${added} new, ${requests} requests)`);

  // Upsert into Neon DB
  const records = Object.values(localDb.items);
  const CHUNK   = 200;
  let done      = 0;
  for (let i = 0; i < records.length; i += CHUNK) {
    await upsertGamesTech(records.slice(i, i + CHUNK));
    done += Math.min(CHUNK, records.length - i);
    if (done % 1000 === 0 || done === records.length) {
      log(`  DB: ${done}/${records.length} (${Math.round(done / records.length * 100)}%)`);
    }
  }

  log(`✓ Done. ${records.length} items in DB. Added ${added} new from CeX.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
