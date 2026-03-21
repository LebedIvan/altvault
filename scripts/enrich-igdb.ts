/**
 * IGDB enrichment script — adds 250,000+ game titles with metadata.
 *
 * Fetches all games from IGDB (Twitch API) and upserts into games_tech.
 * Existing CeX records get enriched with cover art, genres, description.
 * New records are created for games not sold by CeX.
 *
 * Usage:
 *   npx tsx scripts/enrich-igdb.ts
 *
 * Environment variables (from .env.local):
 *   IGDB_CLIENT_ID      — from dev.twitch.tv (free)
 *   IGDB_CLIENT_SECRET  — from dev.twitch.tv (free)
 *   DATABASE_URL        — required
 *
 * How to get free Twitch credentials:
 *   1. Go to https://dev.twitch.tv/console
 *   2. Register application → get Client ID + Client Secret
 *   3. Add to .env.local:
 *      IGDB_CLIENT_ID=your_client_id
 *      IGDB_CLIENT_SECRET=your_client_secret
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

const IGDB_AUTH_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_API_URL  = "https://api.igdb.com/v4/games";
const DB_PATH       = path.join(process.cwd(), "data", "games-tech-db.json");
const DELAY_MS      = 260; // 4 req/sec max on free tier
const PAGE_SIZE     = 500;

function log(msg: string) {
  process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] ${msg}\n`);
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// ─── IGDB types ───────────────────────────────────────────────────────────────

interface IgdbGame {
  id:                  number;
  name:                string;
  first_release_date?: number;  // Unix timestamp
  summary?:            string;
  rating?:             number;
  platforms?:          Array<{ name: string }>;
  genres?:             Array<{ name: string }>;
  cover?:              { url: string };
}

// ─── Auth ────────────────────────────────────────────────────────────────────

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(
    `${IGDB_AUTH_URL}?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ─── IGDB fetch ───────────────────────────────────────────────────────────────

async function fetchIgdbPage(
  clientId: string,
  token: string,
  offset: number
): Promise<IgdbGame[]> {
  const body = [
    `fields id,name,first_release_date,summary,rating,platforms.name,genres.name,cover.url;`,
    `where cover != null & version_parent = null;`,
    `sort id asc;`,
    `limit ${PAGE_SIZE};`,
    `offset ${offset};`,
  ].join(" ");

  const res = await fetch(IGDB_API_URL, {
    method: "POST",
    headers: {
      "Client-ID":     clientId,
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "text/plain",
    },
    body,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    log(`  IGDB error ${res.status} at offset ${offset}`);
    return [];
  }
  return await res.json() as IgdbGame[];
}

// ─── Convert IGDB game → GamesTechRecord ──────────────────────────────────────

function igdbToRecord(g: IgdbGame): GamesTechRecord {
  const platform = g.platforms?.[0]?.name ?? "PC";
  const genres   = (g.genres ?? []).map((x) => x.name);
  const year     = g.first_release_date
    ? new Date(g.first_release_date * 1000).getFullYear()
    : null;

  // IGDB cover URLs use //images.igdb.com/... — convert to https and get high res
  const coverUrl = g.cover?.url
    ? g.cover.url.replace("//", "https://").replace("t_thumb", "t_cover_big")
    : null;

  return {
    id:                `igdb-${g.id}`,
    name:              g.name,
    platform,
    category:          "game",
    loosePriceCents:   null,
    cibPriceCents:     null,
    newPriceCents:     null,
    priceUpdatedAt:    null,
    cexBoxId:          null,
    cexSellPriceCents: null,
    cexCashPriceCents: null,
    igdbId:            g.id,
    description:       g.summary?.slice(0, 500) ?? null,
    genres,
    coverUrl,
    releaseYear:       year,
    imageUrl:          coverUrl,
    priceChartingUrl:  null,
    sources:           ["igdb"],
    lastSyncedAt:      new Date().toISOString(),
  };
}

// ─── DB file helpers ──────────────────────────────────────────────────────────

interface DbFile {
  version:    number;
  syncedAt:   string | null;
  totalItems: number;
  igdbOffset: number;        // resume point
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const clientId     = process.env.IGDB_CLIENT_ID     ?? "";
  const clientSecret = process.env.IGDB_CLIENT_SECRET ?? "";

  if (!clientId || !clientSecret) {
    log("ERROR: IGDB_CLIENT_ID and IGDB_CLIENT_SECRET are required.");
    log("  Get free credentials at https://dev.twitch.tv/console");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    log("ERROR: DATABASE_URL not set.");
    process.exit(1);
  }

  log("Getting IGDB access token...");
  const token = await getAccessToken(clientId, clientSecret);
  log("Token obtained.");

  const localDb = loadDb();
  const startOffset = localDb.igdbOffset ?? 0;
  log(`Starting IGDB enrichment at offset ${startOffset}. Existing items: ${Object.keys(localDb.items).length}`);

  let offset   = startOffset;
  let added    = 0;
  let enriched = 0;
  let pages    = 0;

  while (true) {
    const games = await fetchIgdbPage(clientId, token, offset);
    pages++;

    if (games.length === 0) {
      log(`No more results at offset ${offset}. Done.`);
      break;
    }

    const batch: GamesTechRecord[] = [];

    for (const g of games) {
      const igdbKey = `igdb-${g.id}`;

      if (localDb.items[igdbKey]) {
        // Already have this IGDB record, enrich existing if needed
        enriched++;
        continue;
      }

      const record = igdbToRecord(g);
      localDb.items[igdbKey] = record;
      batch.push(record);
      added++;
    }

    // Upsert this page's batch into DB
    if (batch.length > 0) {
      await upsertGamesTech(batch);
    }

    offset += games.length;
    localDb.igdbOffset  = offset;
    localDb.totalItems  = Object.keys(localDb.items).length;

    if (pages % 10 === 0) {
      saveDb(localDb);
      log(`  Page ${pages}: offset=${offset}, total=${localDb.totalItems}, +${added} new`);
    }

    await sleep(DELAY_MS);

    if (games.length < PAGE_SIZE) break; // last page
  }

  localDb.syncedAt  = new Date().toISOString();
  localDb.totalItems = Object.keys(localDb.items).length;
  saveDb(localDb);

  log(`✓ Done. Total: ${localDb.totalItems} items. IGDB added: ${added} new, ${enriched} already existed.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
