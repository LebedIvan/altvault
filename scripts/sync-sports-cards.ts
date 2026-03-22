/**
 * Sync sports cards from PriceCharting API into the sports_cards table.
 *
 * Fetches cards for each sport category (basketball, football, hockey,
 * american football) using PriceCharting's product search endpoint.
 *
 * Usage:
 *   npx tsx scripts/sync-sports-cards.ts
 *
 * Environment variables:
 *   PRICECHARTING_API_KEY  — required (get one at pricecharting.com)
 */

import path from "path";
import fs from "fs";
import type { SportsCardRecord, SportType } from "../src/lib/sportsCardRecord";

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

import { upsertCards, getStats } from "../src/lib/sportsCardsDb";

const API_KEY = process.env.PRICECHARTING_API_KEY ?? "";
const BASE_URL = "https://www.pricecharting.com/api";
const DELAY_MS = 500;

function log(msg: string) {
  process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] ${msg}\n`);
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

interface PriceChartingProduct {
  id: string;
  "product-name": string;
  "console-name": string;
  "loose-price"?: number; // in cents (USD)
  "graded-price"?: number;
  status?: string;
}

interface PriceChartingResponse {
  products?: PriceChartingProduct[];
}

const SPORT_QUERIES: Array<{ sport: SportType; query: string }> = [
  { sport: "basketball",        query: "basketball card" },
  { sport: "football",          query: "football card" },
  { sport: "hockey",            query: "hockey card" },
  { sport: "american_football", query: "nfl card" },
];

async function fetchProducts(query: string): Promise<PriceChartingProduct[]> {
  const url =
    `${BASE_URL}/products?q=${encodeURIComponent(query)}&status=price&api-token=${API_KEY}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Vaulty/1.0" } });
    if (!res.ok) return [];
    const data = (await res.json()) as PriceChartingResponse;
    return data.products ?? [];
  } catch {
    return [];
  }
}

function productToRecord(product: PriceChartingProduct, sport: SportType): SportsCardRecord {
  const name = product["product-name"] ?? "";
  const consoleName = product["console-name"] ?? "";

  // Try to extract year from consoleName (e.g. "2003-04 Topps")
  const yearMatch = consoleName.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? parseInt(yearMatch[0]!, 10) : null;

  return {
    id:               product.id,
    sport,
    name,
    fullName:         `${name} — ${consoleName}`.trim(),
    setName:          consoleName || null,
    year,
    playerName:       name || null,
    cardNumber:       null,
    loosePriceCents:  product["loose-price"] ?? null,
    gradedPriceCents: product["graded-price"] ?? null,
    imageUrl:         null,
    priceChartingUrl: `https://www.pricecharting.com/game/${encodeURIComponent(consoleName)}/${encodeURIComponent(name)}`,
    priceUpdatedAt:   new Date().toISOString(),
    lastSyncedAt:     new Date().toISOString(),
  };
}

async function main() {
  log("═══ Sports Cards Sync (PriceCharting) ══════════════════");

  if (!API_KEY) {
    log("ERROR: PRICECHARTING_API_KEY is required.");
    log("Get an API key at: https://www.pricecharting.com/api");
    process.exit(1);
  }

  for (const { sport, query } of SPORT_QUERIES) {
    log(`Fetching ${sport} cards (query: "${query}")...`);
    const products = await fetchProducts(query);
    log(`  Found ${products.length} products`);

    const records = products.map((p) => productToRecord(p, sport));
    await upsertCards(records);
    log(`  Upserted ${records.length} ${sport} cards`);

    await sleep(DELAY_MS);
  }

  const stats = await getStats();
  log("═══ Done ════════════════════════════════════════════════");
  log(`Total: ${stats.total}`);
  for (const [sport, count] of Object.entries(stats.bySport)) {
    log(`  ${sport}: ${count}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
