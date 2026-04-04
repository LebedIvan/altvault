/**
 * Sync MTG cards from Scryfall Bulk Data into the mtg_cards table.
 * Format: NDJSON array — one JSON object per line.
 *
 * Usage: npx tsx scripts/sync-mtg.ts
 */

import path from "path";
import fs from "fs";
import https from "node:https";
import zlib from "node:zlib";
import type { IncomingMessage } from "node:http";

// ─── Load .env.local ──────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
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
import type { MtgCardRecord } from "../src/lib/mtgCardRecord";

// ─── Logger ───────────────────────────────────────────────────────────────────

function log(msg: string) {
  process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] ${msg}\n`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toCents(price: string | null | undefined): number | null {
  if (!price) return null;
  const n = parseFloat(price);
  return isNaN(n) ? null : Math.round(n * 100);
}

const SKIP_LAYOUTS = new Set(["token", "double_faced_token", "art_series", "emblem"]);

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
  image_uris?: { small?: string; normal?: string; png?: string };
  card_faces?: Array<{ image_uris?: { small?: string; normal?: string; png?: string } }>;
  prices?: { eur?: string | null; eur_foil?: string | null; usd?: string | null; usd_foil?: string | null };
  purchase_uris?: { tcgplayer?: string; cardmarket?: string };
}

function toRecord(card: ScryfallCard): MtgCardRecord | null {
  if (card.layout && SKIP_LAYOUTS.has(card.layout)) return null;
  if (card.digital && !card.prices?.eur && !card.prices?.usd) return null;
  const imgs = card.image_uris ?? card.card_faces?.[0]?.image_uris;
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
    imageSmallUrl:     imgs?.small             ?? null,
    imageLargeUrl:     imgs?.normal            ?? null,
    imagePngUrl:       imgs?.png               ?? null,
    priceEurCents:     toCents(card.prices?.eur),
    priceEurFoilCents: toCents(card.prices?.eur_foil),
    priceUsdCents:     toCents(card.prices?.usd),
    priceUsdFoilCents: toCents(card.prices?.usd_foil),
    priceUpdatedAt:    new Date().toISOString(),
    tcgplayerUrl:      card.purchase_uris?.tcgplayer  ?? null,
    cardmarketUrl:     card.purchase_uris?.cardmarket ?? null,
    lastSyncedAt:      new Date().toISOString(),
  };
}

// ─── HTTP GET with redirect follow ────────────────────────────────────────────

function httpsGet(url: string): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Vaulty/1.0", "Accept-Encoding": "gzip" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        const location = res.headers.location;
        if (!location) { reject(new Error("Redirect with no Location header")); return; }
        log(`  Redirect → ${location.slice(0, 70)}...`);
        resolve(httpsGet(location));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} ${res.statusMessage}`));
        return;
      }
      resolve(res);
    }).on("error", reject);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log("══════════════════════════════════════════════════════════");
  log("  MTG Card Sync — Scryfall Bulk Data");
  log("══════════════════════════════════════════════════════════");

  // Step 1: get bulk data download URL (small JSON, use fetch)
  log("Step 1/3  Fetching bulk data index from Scryfall API...");
  const indexFetch = await fetch("https://api.scryfall.com/bulk-data", {
    headers: { "User-Agent": "Vaulty/1.0" },
  });
  if (!indexFetch.ok) throw new Error(`Scryfall API returned HTTP ${indexFetch.status} ${indexFetch.statusText}`);

  interface BulkEntry { type: string; download_uri: string; size?: number }
  const index = await indexFetch.json() as { data: BulkEntry[] };
  const entry = index.data.find((e) => e.type === "all_cards");
  if (!entry) throw new Error("Could not find 'all_cards' entry in Scryfall bulk-data index");

  const downloadUrl = entry.download_uri;
  log(`  URL: ${downloadUrl}`);

  // Step 2: stream download + parse
  log("Step 2/3  Downloading & parsing (streaming, one card per line)...");
  log("          [progress every 500 cards or 50 MB]");

  const dataRes = await httpsGet(downloadUrl);
  const contentEncoding = dataRes.headers["content-encoding"] ?? "";
  const contentLength = Number(dataRes.headers["content-length"] ?? 0);
  log(`  Content-Encoding: ${contentEncoding || "none"} | Content-Length: ${contentLength ? (contentLength / 1024 / 1024).toFixed(0) + " MB" : "unknown"}`);

  // Decompress if gzip
  const stream: NodeJS.ReadableStream = contentEncoding.includes("gzip")
    ? dataRes.pipe(zlib.createGunzip())
    : dataRes;

  let bytesReceived = 0;
  let lastLogMb = 0;
  let lineBuffer = "";
  let parsed = 0;
  let skipped = 0;
  let errors = 0;
  let upserted = 0;
  const batch: MtgCardRecord[] = [];
  const BATCH_SIZE = 500;

  async function flushBatch() {
    if (batch.length === 0) return;
    const count = batch.length;
    try {
      await upsertCards([...batch]);
      upserted += count;
    } catch (err) {
      log(`  [ERROR] DB upsert failed: ${String(err)}`);
      throw err;
    }
    batch.length = 0;
    log(`  Upserted ${upserted.toLocaleString()} | Parsed ${parsed.toLocaleString()} | Skipped ${skipped.toLocaleString()} | Received ${(bytesReceived / 1024 / 1024).toFixed(0)} MB`);
  }

  function processLine(raw: string) {
    // Strip leading comma or brackets (NDJSON inside array: "[", ",{...}", "]")
    const line = raw.trim().replace(/^,/, "").replace(/,$/, "").trim();
    if (!line || line === "[" || line === "]") return;

    parsed++;
    try {
      const card = JSON.parse(line) as ScryfallCard;
      const record = toRecord(card);
      if (record) batch.push(record);
      else skipped++;
    } catch (err) {
      errors++;
      if (errors <= 5) log(`  [WARN] JSON parse error on line ${parsed}: ${String(err).slice(0, 100)}`);
    }
  }

  await new Promise<void>((resolve, reject) => {
    stream.on("error", (err) => {
      log(`[ERROR] Stream error: ${String(err)}`);
      reject(err);
    });

    let pendingFlush = Promise.resolve();

    stream.on("data", (chunk: Buffer) => {
      bytesReceived += chunk.length;

      // Log download progress every 50 MB
      const mb = bytesReceived / 1024 / 1024;
      if (mb - lastLogMb >= 50) {
        log(`  Downloading... ${mb.toFixed(0)} MB received`);
        lastLogMb = mb;
      }

      // Split chunk by newline, process complete lines
      lineBuffer += chunk.toString("utf8");
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() ?? ""; // last element may be incomplete

      for (const line of lines) {
        processLine(line);
      }

      // Flush batch when full — pause stream to avoid backpressure issues
      if (batch.length >= BATCH_SIZE) {
        (stream as NodeJS.ReadableStream & { pause?: () => void }).pause?.();
        pendingFlush = pendingFlush
          .then(() => flushBatch())
          .then(() => { (stream as NodeJS.ReadableStream & { resume?: () => void }).resume?.(); })
          .catch((err) => { reject(err); });
      }
    });

    stream.on("end", () => {
      // Process any remaining partial line
      if (lineBuffer.trim()) processLine(lineBuffer);
      pendingFlush.then(() => flushBatch()).then(resolve).catch(reject);
    });
  });

  // Step 3: report
  log("Step 3/3  Done. Fetching DB stats...");
  const stats = await getStats();
  log("══════════════════════════════════════════════════════════");
  log(`  DB total:    ${stats.total.toLocaleString()} cards | ${stats.sets} sets | ${stats.withPrices.toLocaleString()} with prices`);
  log(`  This run:    parsed ${parsed.toLocaleString()} | upserted ${upserted.toLocaleString()} | skipped ${skipped.toLocaleString()} | parse errors ${errors}`);
  log("══════════════════════════════════════════════════════════");
}

main().catch((err) => {
  log(`[FATAL ERROR] ${err instanceof Error ? err.message : String(err)}`);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
