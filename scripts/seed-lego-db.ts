/**
 * One-time seed: push data/lego-db.json → Neon PostgreSQL
 * Usage: npx tsx scripts/seed-lego-db.ts
 */

import path from "path";
import fs from "fs";
import type { LegoSetRecord } from "../src/lib/legoSetRecord";

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

import { upsertSets } from "../src/lib/legoDb";

function log(msg: string) {
  process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] ${msg}\n`);
}

async function main() {
  const DB_PATH = path.join(process.cwd(), "data", "lego-db.json");

  if (!fs.existsSync(DB_PATH)) {
    log("ERROR: data/lego-db.json not found. Run npx tsx scripts/sync-lego.ts first.");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    log("ERROR: DATABASE_URL not set.");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as {
    sets: Record<string, LegoSetRecord>;
  };
  const records = Object.values(raw.sets);
  log(`Loaded ${records.length} sets from data/lego-db.json`);

  const CHUNK = 200;
  let done = 0;
  for (let i = 0; i < records.length; i += CHUNK) {
    await upsertSets(records.slice(i, i + CHUNK));
    done += Math.min(CHUNK, records.length - i);
    log(`  ${done}/${records.length} (${Math.round(done / records.length * 100)}%)`);
  }

  log(`✓ Seeded ${records.length} LEGO sets into Neon DB`);
}

main().catch((e) => { console.error(e); process.exit(1); });
