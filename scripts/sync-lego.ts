/**
 * LEGO set database sync script.
 *
 * Fetches all sets from Rebrickable + BrickOwl, merges/deduplicates by LEGO set
 * number, and writes the result to data/lego-db.json.
 *
 * Usage:
 *   npx tsx scripts/sync-lego.ts
 *
 * Environment variables (from .env.local or system env):
 *   REBRICKABLE_API_KEY   — required
 *   BRICKOWL_API_KEY      — required for market prices
 *   BRICKSET_API_KEY      — optional, enriches with launch/exit dates + MSRP
 */

import path from "path";
import fs from "fs";
import type { LegoSetRecord } from "../src/lib/legoSetRecord";
import { upsertSets } from "../src/lib/legoDb";

// ─── Load .env.local ──────────────────────────────────────────────────────────

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

const RB_KEY = process.env.REBRICKABLE_API_KEY ?? "";
const BO_KEY = process.env.BRICKOWL_API_KEY    ?? "";
const BS_KEY = process.env.BRICKSET_API_KEY    ?? "";

const DB_PATH = path.join(process.cwd(), "data", "lego-db.json");

// ─── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function log(msg: string) {
  process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] ${msg}\n`);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ─── Load existing DB ────────────────────────────────────────────────────────

interface LegoDbFile {
  version: number;
  syncedAt: string | null;
  totalSets: number;
  sets: Record<string, LegoSetRecord>;
}

function loadDb(): LegoDbFile {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as LegoDbFile;
  } catch {
    return { version: 1, syncedAt: null, totalSets: 0, sets: {} };
  }
}

function saveDb(db: LegoDbFile) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  log(`Saved ${db.totalSets} sets to data/lego-db.json`);
}

function upsert(db: LegoDbFile, records: Partial<LegoSetRecord>[]) {
  for (const s of records) {
    if (!s.setNumber) continue;
    const existing = db.sets[s.setNumber];
    if (!existing) {
      db.sets[s.setNumber] = s as LegoSetRecord;
    } else {
      const merged: LegoSetRecord = { ...existing };
      for (const key of Object.keys(s) as (keyof LegoSetRecord)[]) {
        const val = s[key];
        if (val !== null && val !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (merged as any)[key] = val;
        }
      }
      if (s.sources) merged.sources = Array.from(new Set([...existing.sources, ...s.sources]));
      db.sets[s.setNumber] = merged;
    }
  }
  db.totalSets = Object.keys(db.sets).length;
}

// ─── Phase 1: Rebrickable ─────────────────────────────────────────────────────

interface RbSet {
  set_num: string; name: string; theme_id: number; year: number;
  num_parts: number; set_img_url: string | null; set_url: string;
}

async function fetchRbThemes(): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (!RB_KEY) return map;
  const res = await fetch(`https://rebrickable.com/api/v3/lego/themes/?page_size=1000&key=${RB_KEY}`);
  if (!res.ok) return map;
  const data = await res.json() as { results: { id: number; name: string }[] };
  for (const t of data.results ?? []) map.set(t.id, t.name);
  return map;
}

async function fetchRbPage(page: number): Promise<{ results: RbSet[]; count: number }> {
  const url = `https://rebrickable.com/api/v3/lego/sets/?min_year=2015&ordering=-year,-set_num&page_size=1000&page=${page}&key=${RB_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Rebrickable page ${page}: HTTP ${res.status}`);
  return res.json();
}

async function phaseRebrickable(db: LegoDbFile) {
  if (!RB_KEY) { log("⚠ REBRICKABLE_API_KEY not set — skipping"); return; }
  log("Phase 1: Rebrickable...");

  const [themes, first] = await Promise.all([fetchRbThemes(), fetchRbPage(1)]);
  const totalPages = Math.ceil(first.count / 1000);
  log(`  ${first.count} sets across ${totalPages} pages`);

  const restPages = totalPages > 1
    ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, i) => fetchRbPage(i + 2)))
    : [];

  const allRaw = [first, ...restPages].flatMap((p) => p.results);
  const now = new Date().toISOString();

  const records: LegoSetRecord[] = allRaw.map((s) => {
    const num = s.set_num.replace(/-1$/, "");
    return {
      setNumber: num,
      name: s.name,
      theme: themes.get(s.theme_id) ?? `Theme ${s.theme_id}`,
      themeId: s.theme_id,
      year: s.year ?? null,
      pieces: s.num_parts ?? null,
      imageUrl: s.set_img_url ?? null,
      brickowlId: null,
      brickowlUrl: null,
      marketPriceGbp: null,
      marketPriceUpdatedAt: null,
      launchDate: null,
      exitDate: null,
      msrpUsd: null,
      msrpGbp: null,
      msrpEur: null,
      rebrickableUrl: s.set_url ?? null,
      bricksetUrl: `https://brickset.com/sets/${num}-1`,
      sources: ["rebrickable"],
      lastSyncedAt: now,
    };
  });

  upsert(db, records);
  log(`  ✓ Upserted ${records.length} sets from Rebrickable`);
}

// ─── Phase 2: BrickOwl ID lookup ─────────────────────────────────────────────


async function brickowlIdLookup(
  setNumbers: string[],
  db: LegoDbFile,
  saveDb: (db: LegoDbFile) => void,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!BO_KEY) return result;

  // Sequential with 110ms gap = ~540 req/min (safely under 600/min limit)
  const estMin = Math.ceil(setNumbers.length * 110 / 1000 / 60);
  log(`  BrickOwl ID lookup: ${setNumbers.length} sets, sequential (~${estMin}min)`);

  let rateLimitWaits = 0;

  for (let i = 0; i < setNumbers.length; i++) {
    const num = setNumbers[i];
    if (!num) continue;

    let boid: string | null = null;
    let attempts = 0;

    while (attempts < 3) {
      try {
        const url = `https://api.brickowl.com/v1/catalog/id_lookup?key=${BO_KEY}&id=${encodeURIComponent(num + "-1")}&type=Set`;
        const res = await fetchWithTimeout(url);
        const contentType = res.headers.get("content-type") ?? "";

        if (!contentType.includes("json")) {
          // Rate limited — HTML response
          rateLimitWaits++;
          log(`  ⏳ Rate limited at set ${i + 1}, waiting 60s... (${rateLimitWaits} times so far)`);
          await sleep(60000);
          attempts++;
          continue;
        }

        const data = await res.json() as { boids?: string[] };
        boid = data?.boids?.[0] ?? null;
        break;
      } catch {
        attempts++;
        await sleep(2000);
      }
    }

    if (boid) result.set(num, boid);

    // Log every 200 sets
    if ((i + 1) % 200 === 0 || i === setNumbers.length - 1) {
      const pct = Math.round((i + 1) / setNumbers.length * 100);
      log(`  ${i + 1}/${setNumbers.length} (${pct}%) — ${result.size} BOIDs found`);
    }

    // Save progress every 1000 sets
    if ((i + 1) % 1000 === 0) {
      const now = new Date().toISOString();
      for (const [setNumber, boid2] of Array.from(result)) {
        if (db.sets[setNumber]) {
          db.sets[setNumber].brickowlId  = boid2;
          db.sets[setNumber].brickowlUrl = `https://www.brickowl.com/catalog/${boid2}`;
          if (!db.sets[setNumber].sources.includes("brickowl")) db.sets[setNumber].sources.push("brickowl");
          db.sets[setNumber].lastSyncedAt = now;
        }
      }
      db.totalSets = Object.keys(db.sets).length;
      db.syncedAt  = now;
      saveDb(db);
      log(`  💾 Progress saved`);
    }

    await sleep(110);
  }

  return result;
}

async function phaseBrickowlIds(db: LegoDbFile) {
  if (!BO_KEY) { log("⚠ BRICKOWL_API_KEY not set — skipping BrickOwl"); return; }
  log("Phase 2: BrickOwl ID lookup...");

  const needsId = Object.values(db.sets)
    .filter((s) => !s.brickowlId)
    .map((s) => s.setNumber);

  log(`  ${needsId.length} sets need BrickOwl ID`);
  if (needsId.length === 0) { log("  ✓ All sets already have BrickOwl IDs"); return; }

  const idMap = await brickowlIdLookup(needsId, db, saveDb);
  const now = new Date().toISOString();

  let matched = 0;
  for (const [setNumber, boid] of Array.from(idMap)) {
    if (db.sets[setNumber]) {
      db.sets[setNumber].brickowlId = boid;
      db.sets[setNumber].brickowlUrl = `https://www.brickowl.com/catalog/${boid}`;
      if (!db.sets[setNumber].sources.includes("brickowl")) {
        db.sets[setNumber].sources.push("brickowl");
      }
      db.sets[setNumber].lastSyncedAt = now;
      matched++;
    }
  }
  log(`  ✓ Matched ${matched} sets with BrickOwl IDs (${needsId.length - matched} not found)`);
}

// ─── Phase 3: BrickOwl availability (market prices) ──────────────────────────

interface BoAvailabilityBasic {
  min_price?: string | number;
  avg_price?: string | number;
  total_lots?: number;
}

async function phaseBrickowlPrices(db: LegoDbFile) {
  if (!BO_KEY) return;
  log("Phase 3: BrickOwl market prices...");

  // Quick check if pricing is accessible
  const testBoid = Object.values(db.sets).find((s) => s.brickowlId)?.brickowlId;
  if (testBoid) {
    const testRes = await fetchWithTimeout(
      `https://api.brickowl.com/v1/catalog/availability_basic?key=${BO_KEY}&boid=${testBoid}`
    );
    const testData = await testRes.json() as { error?: string };
    if (testData?.error === "Access Denied") {
      log("  ⚠ availability_basic: Access Denied — pricing requires BrickOwl catalog approval");
      log("  ⚠ Skipping phase 3. Apply at: https://www.brickowl.com/contact");
      return;
    }
  }

  const setsWithBoid = Object.values(db.sets).filter((s) => s.brickowlId);
  const needsPrice   = setsWithBoid.filter(
    (s) => s.marketPriceGbp === null ||
           !s.marketPriceUpdatedAt ||
           Date.now() - new Date(s.marketPriceUpdatedAt).getTime() > 7 * 24 * 60 * 60 * 1000
  );

  log(`  ${setsWithBoid.length} sets have BOIDs; ${needsPrice.length} need fresh prices`);
  if (needsPrice.length === 0) { log("  ✓ All prices up to date"); return; }

  const CONCURRENCY = 10;
  const groups = chunk(needsPrice, CONCURRENCY);
  let updated = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (!group) continue;

    await Promise.all(group.map(async (s) => {
      try {
        const url = `https://api.brickowl.com/v1/catalog/availability_basic?key=${BO_KEY}&boid=${s.brickowlId}`;
        const res = await fetchWithTimeout(url);
        if (!res.ok) return;
        const data = await res.json() as BoAvailabilityBasic;
        const price = data?.min_price;
        const rec   = db.sets[s.setNumber];
        if (price != null && rec) {
          rec.marketPriceGbp        = parseFloat(String(price));
          rec.marketPriceUpdatedAt  = now;
          updated++;
        }
      } catch { /* timeout or network error — skip */ }
    }));

    if ((i + 1) % 50 === 0 || i === groups.length - 1) {
      const pct = Math.round((i + 1) / groups.length * 100);
      log(`  Prices ${i + 1}/${groups.length} (${pct}%) — ${updated} updated`);
    }

    await sleep(100);
  }
  log(`  ✓ Updated ${updated} market prices`);
}

// ─── Phase 4: BrickSet enrichment (dates + MSRP) ─────────────────────────────

interface BsSet {
  number: string;
  launchDate?: string | null;
  exitDate?: string | null;
  LEGOCom?: {
    US?: { retailPrice?: number | null };
    UK?: { retailPrice?: number | null };
    DE?: { retailPrice?: number | null };
  };
}

async function fetchBsYear(year: number, page: number): Promise<{ status: string; matches: number; sets?: BsSet[] }> {
  const params = JSON.stringify({ pageSize: 500, pageNumber: page, year: String(year) });
  const url = `https://brickset.com/api/v3.asmx/getSets?apiKey=${encodeURIComponent(BS_KEY)}&userHash=&params=${encodeURIComponent(params)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`BrickSet year ${year} page ${page}: HTTP ${res.status}`);
  return res.json();
}

async function phaseBrickset(db: LegoDbFile) {
  if (!BS_KEY) { log("⚠ BRICKSET_API_KEY not set — skipping BrickSet enrichment"); return; }
  log("Phase 4: BrickSet dates + MSRP...");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2000 + 1 }, (_, i) => 2000 + i);
  let enriched = 0;
  const now = new Date().toISOString();

  for (const year of years) {
    try {
      const first = await fetchBsYear(year, 1);
      if (first.status !== "success") continue;
      const allSets = first.sets ?? [];
      const totalPages = Math.ceil(first.matches / 500);
      if (totalPages > 1) {
        const rest = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) => fetchBsYear(year, i + 2))
        );
        allSets.push(...rest.flatMap((r) => r.sets ?? []));
      }
      for (const s of allSets) {
        if (!s.number) continue;
        const num = s.number.replace(/-1$/, "");
        if (!db.sets[num]) continue;
        const isoDate = (raw: string | null | undefined) => {
          if (!raw) return null;
          const d = raw.split("T")[0];
          return d?.length === 10 ? d : null;
        };
        db.sets[num].launchDate = isoDate(s.launchDate) ?? db.sets[num].launchDate;
        db.sets[num].exitDate   = isoDate(s.exitDate)   ?? db.sets[num].exitDate;
        db.sets[num].msrpUsd    = s.LEGOCom?.US?.retailPrice ?? db.sets[num].msrpUsd;
        db.sets[num].msrpGbp    = s.LEGOCom?.UK?.retailPrice ?? db.sets[num].msrpGbp;
        db.sets[num].msrpEur    = s.LEGOCom?.DE?.retailPrice ?? db.sets[num].msrpEur;
        if (!db.sets[num].sources.includes("brickset")) db.sets[num].sources.push("brickset");
        db.sets[num].lastSyncedAt = now;
        enriched++;
      }
    } catch (e) {
      log(`  ⚠ BrickSet year ${year} error: ${e}`);
    }
    await sleep(200); // gentle on BrickSet
  }
  log(`  ✓ Enriched ${enriched} sets with BrickSet data`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const start = Date.now();
  log("═══ LEGO DB Sync ═══════════════════════════════════════");
  log(`Rebrickable: ${RB_KEY ? "✓" : "✗ missing"}`);
  log(`BrickOwl:    ${BO_KEY ? "✓" : "✗ missing"}`);
  log(`BrickSet:    ${BS_KEY ? "✓" : "✗ missing (optional)"}`);

  if (!RB_KEY && !BO_KEY) {
    log("ERROR: At least REBRICKABLE_API_KEY is required.");
    process.exit(1);
  }

  const db = loadDb();
  const existingCount = db.totalSets;
  log(`Existing DB: ${existingCount} sets`);

  await phaseRebrickable(db);
  await phaseBrickowlIds(db);
  await phaseBrickowlPrices(db);
  await phaseBrickset(db);

  db.syncedAt  = new Date().toISOString();
  db.totalSets = Object.keys(db.sets).length;
  saveDb(db);

  // Also push to Neon DB
  if (process.env.DATABASE_URL) {
    log("Upserting to Neon DB...");
    try {
      await upsertSets(Object.values(db.sets));
      log("✓ Neon DB sync complete");
    } catch (e) {
      log(`⚠ Neon DB sync failed: ${e}`);
    }
  } else {
    log("⚠ DATABASE_URL not set — skipping Neon DB sync");
  }

  const stats = {
    total:      db.totalSets,
    withBoid:   Object.values(db.sets).filter((s) => s.brickowlId).length,
    withPrices: Object.values(db.sets).filter((s) => s.marketPriceGbp != null).length,
    withDates:  Object.values(db.sets).filter((s) => s.launchDate).length,
  };

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  log("═══ Done ═══════════════════════════════════════════════");
  log(`Total sets:    ${stats.total}`);
  log(`With BrickOwl: ${stats.withBoid} (${Math.round(stats.withBoid / stats.total * 100)}%)`);
  log(`With prices:   ${stats.withPrices} (${Math.round(stats.withPrices / stats.total * 100)}%)`);
  log(`With dates:    ${stats.withDates} (${Math.round(stats.withDates / stats.total * 100)}%)`);
  log(`Time:          ${elapsed}s`);
}

main().catch((e) => { console.error(e); process.exit(1); });
