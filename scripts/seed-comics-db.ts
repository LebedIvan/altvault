/**
 * One-time migration: load data/comics-db.json and upsert all records into
 * the PostgreSQL comics table.
 *
 * Usage:
 *   npx tsx scripts/seed-comics-db.ts
 */

import path from "path";
import fs from "fs";
import type { ComicRecord } from "../src/lib/comicRecord";

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

import { upsertIssues, getStats } from "../src/lib/comicsDb";

interface ComicsDbFile {
  issues: Record<string, ComicRecord>;
}

async function main() {
  const dbPath = path.join(process.cwd(), "data", "comics-db.json");

  if (!fs.existsSync(dbPath)) {
    console.error(`ERROR: ${dbPath} not found. Run sync-comics.ts first.`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(dbPath, "utf8")) as ComicsDbFile;
  const records = Object.values(raw.issues);

  console.log(`Loading ${records.length} comics from JSON...`);
  await upsertIssues(records);

  const stats = await getStats();
  console.log(`Done. DB now has ${stats.totalIssues} issues (${stats.keyIssues} key issues).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
