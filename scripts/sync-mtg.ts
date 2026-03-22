/**
 * Sync MTG cards from Scryfall Bulk Data into the mtg_cards table.
 *
 * Strategy:
 *   1. GET https://api.scryfall.com/bulk-data → find "all_cards" download URL
 *   2. Stream-download the JSON array (~100MB) and parse in chunks
 *   3. Filter out tokens, art series, digital-only without prices
 *   4. Upsert to mtg_cards in chunks of 500
 *
 * Usage:
 *   npx tsx scripts/sync-mtg.ts
 *
 * No API key required (Scryfall is free).
 */

import path from "path";
import fs from "fs";
import type { MtgCardRecord } from "../src/lib/mtgCardRecord";

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

import { upsertCards, getStats } from "../src/lib/mtgDb";

function log(msg: string) {
  process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] ${msg}\n`);
}

function eurCents(price: string | null | undefined): number | null {
  if (!price) return null;
  const n = parseFloat(price);
  return isNaN(n) ? null : Math.round(n * 100);
}

interface ScryfallBulkDataEntry {
  type: string;
  download_uri: string;
}

interface ScryfallCard {
  id: string;
  oracle_id?: string;
  name: string;
  set: string;
  set_name?: string;
  collector_number?: string;
  rarity?: string;
  released_at?: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  edhrec_rank?: number;
  layout?: string;
  digital?: boolean;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
    png?: string;
  };
  card_faces?: Array<{ image_uris?: { small?: string; normal?: string; png?: string } }>;
  prices?: {
    eur?: string | null;
    eur_foil?: string | null;
    usd?: string | null;
    usd_foil?: string | null;
  };
  purchase_uris?: {
    tcgplayer?: string;
    cardmarket?: string;
  };
}

// Layouts to skip
const SKIP_LAYOUTS = new Set(["token", "double_faced_token", "art_series", "emblem"]);

async function getBulkDataUrl(): Promise<string> {
  const res = await fetch("https://api.scryfall.com/bulk-data", {
    headers: { "User-Agent": "Vaulty/1.0" },
  });
  if (!res.ok) throw new Error(`Scryfall bulk-data API returned ${res.status}`);
  const data = (await res.json()) as { data: ScryfallBulkDataEntry[] };
  const entry = data.data.find((e) => e.type === "all_cards");
  if (!entry) throw new Error("Could not find all_cards bulk data entry");
  return entry.download_uri;
}

function cardToRecord(card: ScryfallCard): MtgCardRecord | null {
  // Skip unwanted layouts
  if (card.layout && SKIP_LAYOUTS.has(card.layout)) return null;

  // Skip pure digital cards with no prices
  if (card.digital && !card.prices?.eur && !card.prices?.usd) return null;

  // Resolve front-face images (DFC cards store images in card_faces)
  const imageUris = card.image_uris ?? card.card_faces?.[0]?.image_uris;

  return {
    id:                card.id,
    oracleId:          card.oracle_id          ?? null,
    name:              card.name,
    setCode:           card.set,
    setName:           card.set_name           ?? null,
    collectorNumber:   card.collector_number   ?? null,
    rarity:            card.rarity             ?? null,
    releasedAt:        card.released_at        ?? null,
    manaCost:          card.mana_cost          ?? null,
    typeLine:          card.type_line          ?? null,
    oracleText:        card.oracle_text        ?? null,
    edhrecRank:        card.edhrec_rank        ?? null,
    imageSmallUrl:     imageUris?.small        ?? null,
    imageLargeUrl:     imageUris?.normal       ?? null,
    imagePngUrl:       imageUris?.png          ?? null,
    priceEurCents:     eurCents(card.prices?.eur),
    priceEurFoilCents: eurCents(card.prices?.eur_foil),
    priceUsdCents:     eurCents(card.prices?.usd),
    priceUsdFoilCents: eurCents(card.prices?.usd_foil),
    priceUpdatedAt:    new Date().toISOString(),
    tcgplayerUrl:      card.purchase_uris?.tcgplayer  ?? null,
    cardmarketUrl:     card.purchase_uris?.cardmarket ?? null,
    lastSyncedAt:      new Date().toISOString(),
  };
}

async function main() {
  log("═══ MTG Card Sync (Scryfall Bulk Data) ═════════════════");

  log("Fetching bulk data URL...");
  const url = await getBulkDataUrl();
  log(`URL: ${url.slice(0, 80)}...`);

  log("Starting download...");
  const res = await fetch(url, { headers: { "User-Agent": "Vaulty/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — failed to download bulk data`);
  if (!res.body) throw new Error("No response body from Scryfall");

  const totalBytes = Number(res.headers.get("content-length") ?? 0);
  log(`File size: ${totalBytes ? (totalBytes / 1024 / 1024).toFixed(0) + " MB" : "unknown"}`);

  let bytesReceived = 0;
  let lastProgressLog = 0;

  // Stream the JSON array manually — avoids loading 100MB into memory
  const chunks: Uint8Array[] = [];
  let processed = 0;
  let skipped = 0;
  const batch: MtgCardRecord[] = [];
  const BATCH_SIZE = 500;

  const reader = res.body.getReader();

  // Download phase — collect all chunks with progress logging
  log("Downloading...");
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    bytesReceived += value.length;
    const mb = bytesReceived / 1024 / 1024;
    if (mb - lastProgressLog >= 50) {
      const pct = totalBytes ? ` (${Math.round(bytesReceived / totalBytes * 100)}%)` : "";
      log(`  Downloaded ${mb.toFixed(0)} MB${pct}...`);
      lastProgressLog = mb;
    }
  }
  log(`Download complete: ${(bytesReceived / 1024 / 1024).toFixed(1)} MB`);

  // Parse phase — Scryfall bulk data has one JSON object per line
  log("Parsing cards...");

  // Merge all chunks into one Buffer, then split by newline
  const totalLen = chunks.reduce((s, c) => s + c.length, 0);
  const merged = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
  const text = new TextDecoder().decode(merged);

  async function flushBatch() {
    if (batch.length === 0) return;
    try {
      await upsertCards([...batch]);
    } catch (err) {
      throw new Error(`DB upsert failed at card ${processed}: ${err}`);
    }
    processed += batch.length;
    batch.length = 0;
    if (processed % 2000 === 0) {
      log(`  Upserted ${processed.toLocaleString()} cards (skipped ${skipped.toLocaleString()})...`);
    }
  }

  const lines = text.split("\n");
  log(`  Splitting into ${lines.length.toLocaleString()} lines...`);

  for (const raw of lines) {
    const line = raw.trim().replace(/^,/, "").replace(/^\[/, "").replace(/\]$/, "").trim();
    if (!line || line === "[" || line === "]") continue;
    try {
      const card = JSON.parse(line) as ScryfallCard;
      const record = cardToRecord(card);
      if (record) {
        batch.push(record);
        if (batch.length >= BATCH_SIZE) await flushBatch();
      } else {
        skipped++;
      }
    } catch (err) {
      log(`  WARN: Failed to parse line: ${String(err).slice(0, 80)}`);
    }
  }

  await flushBatch();

  const stats = await getStats();
  log("═══ Done ════════════════════════════════════════════════");
  log(`Total in DB: ${stats.total.toLocaleString()} cards | Sets: ${stats.sets} | With prices: ${stats.withPrices.toLocaleString()}`);
  log(`This run:    upserted ${processed.toLocaleString()}, skipped ${skipped.toLocaleString()}`);
}

main().catch((err) => {
  console.error("\n[ERROR]", err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
});
