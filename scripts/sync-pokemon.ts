/**
 * Sync Pokémon cards from TCGdex API into the pokemon_cards table.
 *
 * Strategy:
 *   - Fetch all EN card summaries (paginated, 1000/page)
 *   - Fetch full details for each card (batched, 50 concurrent)
 *   - Repeat for JA cards
 *   - Upsert all into DB
 *
 * Usage:
 *   npx tsx scripts/sync-pokemon.ts [--lang en|ja|all]
 *
 * No API key required (TCGdex is free).
 */

import path from "path";
import fs from "fs";
import type { PokemonCardRecord } from "../src/lib/pokemonCardRecord";

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

import { upsertCards, getStats } from "../src/lib/pokemonDb";

const TCGDEX_BASE = "https://api.tcgdex.net/v2";
const CONCURRENCY = 20; // parallel card detail fetches
const DELAY_MS = 100;   // between batches

function log(msg: string) {
  process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] ${msg}\n`);
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Vaulty/1.0" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface TcgdexCardSummary {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

interface TcgdexCardDetail {
  id: string;
  localId: string;
  name: string;
  rarity?: string;
  hp?: number;
  types?: string[];
  image?: string;
  set?: {
    id: string;
    name: string;
    serie?: { name: string };
    releaseDate?: string;
  };
  variants?: {
    firstEdition?: boolean;
    holo?: boolean;
    reverse?: boolean;
    wPromo?: boolean;
  };
  // Prices from cardmarket / tcgplayer embedded in full detail
}


async function fetchAllCardsForLang(lang: "en" | "ja"): Promise<TcgdexCardSummary[]> {
  const all: TcgdexCardSummary[] = [];
  let page = 1;
  const pageSize = 1000;

  while (true) {
    const url = `${TCGDEX_BASE}/${lang}/cards?pagination:itemsPerPage=${pageSize}&pagination:page=${page}`;
    const data = await fetchJson<TcgdexCardSummary[]>(url);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    page++;
    await sleep(DELAY_MS);
  }

  return all;
}

async function fetchCardDetails(
  lang: "en" | "ja",
  summaries: TcgdexCardSummary[],
): Promise<PokemonCardRecord[]> {
  const records: PokemonCardRecord[] = [];
  const total = summaries.length;

  for (let i = 0; i < total; i += CONCURRENCY) {
    const batch = summaries.slice(i, i + CONCURRENCY);
    const details = await Promise.all(
      batch.map((s) =>
        fetchJson<TcgdexCardDetail>(`${TCGDEX_BASE}/${lang}/cards/${s.id}`)
      ),
    );

    for (let j = 0; j < batch.length; j++) {
      const summary = batch[j]!;
      const detail = details[j];
      // Build image URLs from the base image path
      const imgBase = (detail?.image ?? summary.image) ?? null;
      const imageSmallUrl = imgBase ? `${imgBase}/low.webp` : null;
      const imageLargeUrl = imgBase ? `${imgBase}/high.webp` : null;

      records.push({
        id:             summary.id,
        name:           summary.name,
        localId:        summary.localId,
        setId:          detail?.set?.id          ?? null,
        setName:        detail?.set?.name         ?? null,
        serieName:      detail?.set?.serie?.name  ?? null,
        releaseDate:    detail?.set?.releaseDate  ?? null,
        rarity:         detail?.rarity            ?? null,
        hp:             detail?.hp                ?? null,
        types:          detail?.types             ?? [],
        imageSmallUrl,
        imageLargeUrl,
        priceEurCents:  null, // TCGdex doesn't embed prices in detail endpoint
        priceUsdCents:  null,
        priceUpdatedAt: null,
        lang,
        lastSyncedAt:   new Date().toISOString(),
      });
    }

    if ((i + CONCURRENCY) % 500 === 0) {
      log(`  ${lang.toUpperCase()}: processed ${Math.min(i + CONCURRENCY, total)}/${total}`);
    }

    await sleep(DELAY_MS);
  }

  return records;
}

async function syncLang(lang: "en" | "ja") {
  log(`Fetching ${lang.toUpperCase()} card list...`);
  const summaries = await fetchAllCardsForLang(lang);
  log(`Found ${summaries.length} ${lang.toUpperCase()} cards. Fetching details...`);

  const records = await fetchCardDetails(lang, summaries);
  log(`Upserting ${records.length} ${lang.toUpperCase()} cards...`);
  await upsertCards(records);
  log(`${lang.toUpperCase()} done.`);
}

async function main() {
  const langArg = process.argv.find((a) => a.startsWith("--lang="))?.split("=")[1] ?? "all";
  const langs: Array<"en" | "ja"> =
    langArg === "en" ? ["en"]
    : langArg === "ja" ? ["ja"]
    : ["en", "ja"];

  log("═══ Pokémon Card Sync ═══════════════════════════════════");

  for (const lang of langs) {
    await syncLang(lang);
  }

  const stats = await getStats();
  log("═══ Done ════════════════════════════════════════════════");
  log(`Total cards: ${stats.total} | With prices: ${stats.withPrices}`);
  log(`Synced at:   ${stats.syncedAt}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
