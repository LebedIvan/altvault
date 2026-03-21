/**
 * One-time seed: push data/games-tech-db.json → Neon PostgreSQL
 * Usage: npx tsx scripts/seed-games-tech.ts
 *
 * If the JSON doesn't exist yet, run sync-games-tech.ts first.
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

function log(msg: string) {
  process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] ${msg}\n`);
}

async function main() {
  const DB_PATH = path.join(process.cwd(), "data", "games-tech-db.json");

  if (!fs.existsSync(DB_PATH)) {
    log("ERROR: data/games-tech-db.json not found. Run npx tsx scripts/sync-games-tech.ts first.");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    log("ERROR: DATABASE_URL not set.");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as {
    items: Record<string, GamesTechRecord>;
  };
  const records = Object.values(raw.items);
  log(`Loaded ${records.length} items from data/games-tech-db.json`);

  const CHUNK = 200;
  let done = 0;
  for (let i = 0; i < records.length; i += CHUNK) {
    await upsertGamesTech(records.slice(i, i + CHUNK));
    done += Math.min(CHUNK, records.length - i);
    log(`  ${done}/${records.length} (${Math.round(done / records.length * 100)}%)`);
  }

  log(`✓ Seeded ${records.length} games & tech items into Neon DB`);
}

main().catch((e) => { console.error(e); process.exit(1); });
