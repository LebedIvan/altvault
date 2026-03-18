import { NextResponse } from "next/server";
import { recordSnapshots } from "@/lib/snapshotDb";

// ─── TCGdex Pokemon history ────────────────────────────────────────────────────

interface TCGdexPricing {
  cardmarket?: {
    avg1?:  number | null; // yesterday's average
    avg7?:  number | null; // 7-day average
    avg30?: number | null; // 30-day average
    trend?: number | null; // current trend
    avg?:   number | null;
    low?:   number | null;
  };
}

function daysAgoDate(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function fetchPokemonHistory(
  externalId: string,
): Promise<{ date: string; priceCents: number }[]> {
  try {
    const res = await fetch(
      `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(externalId)}`,
      { headers: { "User-Agent": "Vaulty/1.0" }, next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];

    const card = (await res.json()) as { pricing?: TCGdexPricing };
    const cm = card.pricing?.cardmarket;
    if (!cm) return [];

    const points: { date: string; priceCents: number }[] = [];

    // Each avg represents a rolling average for that window.
    // We treat them as approximate prices at those past dates.
    if (cm.avg1  && cm.avg1  > 0) points.push({ date: daysAgoDate(1),  priceCents: Math.round(cm.avg1  * 100) });
    if (cm.avg7  && cm.avg7  > 0) points.push({ date: daysAgoDate(7),  priceCents: Math.round(cm.avg7  * 100) });
    if (cm.avg30 && cm.avg30 > 0) points.push({ date: daysAgoDate(30), priceCents: Math.round(cm.avg30 * 100) });

    return points;
  } catch {
    return [];
  }
}

// ─── MTG / MTGJSON history ────────────────────────────────────────────────────

import fs from "fs";
import path from "path";

const MTGJSON_CACHE_PATH = path.join(process.cwd(), "data", "mtgjson-cache.json");
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // refresh weekly

interface MtgjsonCache {
  fetchedAt: string;
  // cardUUID → [ [dateStr, price] ]
  prices: Record<string, Array<[string, number]>>;
}

function readMtgjsonCache(): MtgjsonCache | null {
  try {
    if (!fs.existsSync(MTGJSON_CACHE_PATH)) return null;
    const raw = JSON.parse(fs.readFileSync(MTGJSON_CACHE_PATH, "utf-8")) as MtgjsonCache;
    if (Date.now() - new Date(raw.fetchedAt).getTime() > CACHE_TTL_MS) return null;
    return raw;
  } catch {
    return null;
  }
}

function writeMtgjsonCache(cache: MtgjsonCache): void {
  const dir = path.dirname(MTGJSON_CACHE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MTGJSON_CACHE_PATH, JSON.stringify(cache), "utf-8");
}

/**
 * Fetch MTGJSON AllPrices.json (1.1 GB) and extract only the UUIDs we need.
 * The response is streamed and parsed in chunks to avoid loading everything into memory.
 */
async function fetchMtgjsonPricesForUUIDs(
  uuids: string[],
): Promise<Record<string, Array<[string, number]>>> {
  const result: Record<string, Array<[string, number]>> = {};
  const target = new Set(uuids);

  try {
    const res = await fetch("https://mtgjson.com/api/v5/AllPrices.json", {
      headers: { "User-Agent": "Vaulty/1.0", "Accept-Encoding": "gzip, deflate" },
    });
    if (!res.ok || !res.body) return result;

    // Stream and search for UUID blocks using a sliding buffer
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // We look for patterns like:   "UUID": { "paper": { "cardmarket": { "retail": { "normal": { "2024-01-01": 5.0, ... } } } } }
    // Extract per-UUID on the fly
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Search for any of our UUIDs in the buffer
      for (const uuid of Array.from(target)) {
        const marker = `"${uuid}"`;
        const idx = buffer.indexOf(marker);
        if (idx === -1) continue;

        // Try to extract the price block for this UUID
        const blockStart = buffer.indexOf("{", idx + marker.length);
        if (blockStart === -1) continue;

        // Find matching closing brace (simple depth counter)
        let depth = 0;
        let blockEnd = -1;
        for (let i = blockStart; i < buffer.length; i++) {
          if (buffer[i] === "{") depth++;
          else if (buffer[i] === "}") {
            depth--;
            if (depth === 0) { blockEnd = i; break; }
          }
        }
        if (blockEnd === -1) continue; // block not yet fully buffered

        try {
          const block = JSON.parse(buffer.slice(blockStart, blockEnd + 1)) as {
            paper?: {
              cardmarket?: { retail?: { normal?: Record<string, number> } };
            };
          };

          // Prefer Cardmarket retail normal prices (EUR)
          const normal = block.paper?.cardmarket?.retail?.normal;
          if (normal) {
            result[uuid] = Object.entries(normal)
              .filter(([, v]) => v > 0)
              .map(([date, v]) => [date, Math.round(v * 100)] as [string, number])
              .sort(([a], [b]) => a.localeCompare(b));
          }
        } catch {
          // Parsing failed — skip this UUID in this chunk
        }

        target.delete(uuid); // no need to search for it again
      }

      if (target.size === 0) {
        reader.cancel();
        break;
      }

      // Keep only the last 2 MB of buffer (enough for any single card block)
      if (buffer.length > 2_000_000) buffer = buffer.slice(-2_000_000);
    }
  } catch {
    // Network error — return whatever we found
  }

  return result;
}

/** Use Scryfall to resolve card name → MTGJSON UUID */
async function resolveMtgjsonUUID(cardName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`,
      { headers: { "User-Agent": "Vaulty/1.0" }, next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const card = (await res.json()) as { mtgjson_v4_id?: string };
    return card.mtgjson_v4_id ?? null;
  } catch {
    return null;
  }
}

async function fetchMtgHistory(
  cardName: string,
): Promise<{ date: string; priceCents: number }[]> {
  const uuid = await resolveMtgjsonUUID(cardName);
  if (!uuid) return [];

  // Check cache first
  const cached = readMtgjsonCache();
  let pricesForUUID: Array<[string, number]> | undefined = cached?.prices[uuid];

  if (!pricesForUUID) {
    // Fetch from MTGJSON (streaming)
    const fetched = await fetchMtgjsonPricesForUUIDs([uuid]);
    pricesForUUID = fetched[uuid] ?? [];

    // Update cache
    const newCache: MtgjsonCache = {
      fetchedAt: new Date().toISOString(),
      prices: { ...(cached?.prices ?? {}), [uuid]: pricesForUUID },
    };
    writeMtgjsonCache(newCache);
  }

  return pricesForUUID.map(([date, priceCents]) => ({ date, priceCents }));
}

// ─── Route handler ─────────────────────────────────────────────────────────────

function extractMtgCardName(assetName: string): string {
  return assetName.replace(/\s*\([^)]*\)\s*—\s*MTG.*/i, "").replace(/\s*—\s*MTG.*/i, "").trim();
}

interface CardAsset {
  assetId: string;
  name: string;
  assetClass: string;
  externalId?: string;
}

/**
 * POST /api/snapshots/backfill/trading-cards
 * Fetches historical price data for trading cards and stores in snapshot DB.
 *
 * Pokemon: TCGdex avg1/avg7/avg30 → ~30 days of history
 * MTG:     MTGJSON AllPrices.json → up to 90 days of daily history (streamed, cached weekly)
 */
export async function POST(request: Request) {
  const body = (await request.json()) as { assets: CardAsset[] };
  const assets = body.assets ?? [];

  let totalPoints = 0;
  const report: Record<string, { points: number; source: string }> = {};

  await Promise.all(
    assets
      .filter((a) => a.assetClass === "trading_cards")
      .map(async (asset) => {
        const isMTG = /—\s*MTG\b/i.test(asset.name);
        let points: { date: string; priceCents: number }[] = [];
        let source = "";

        if (isMTG) {
          const cardName = extractMtgCardName(asset.name);
          points = await fetchMtgHistory(cardName);
          source = "mtgjson";
        } else if (asset.externalId) {
          points = await fetchPokemonHistory(asset.externalId);
          source = "tcgdex_avg";
        }

        if (points.length === 0) return;

        recordSnapshots(
          points.map((p) => ({
            assetId:    asset.assetId,
            name:       asset.name,
            assetClass: asset.assetClass,
            priceCents: p.priceCents,
            date:       p.date,
          })),
        );

        totalPoints += points.length;
        report[asset.name] = { points: points.length, source };
      }),
  );

  return NextResponse.json({ ok: true, totalPoints, report });
}
