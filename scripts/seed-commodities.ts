/**
 * Seed the commodities table with 5 precious metal rows.
 * Idempotent — safe to run multiple times.
 *
 * Usage:
 *   npx tsx scripts/seed-commodities.ts
 */

import path from "path";
import fs from "fs";

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

import { seedCommodities, getStats } from "../src/lib/commoditiesDb";

async function main() {
  console.log("Seeding commodities table...");
  await seedCommodities();
  const stats = await getStats();
  console.log(`Done. Rows with prices: ${stats.withPrices}/5`);
  console.log("Run /api/prices/metals to populate live prices.");
}

main().catch((e) => { console.error(e); process.exit(1); });
