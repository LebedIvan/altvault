/**
 * Seeds data/snapshots.json with ALL assets from the seed portfolio.
 * Run with:  node --experimental-vm-modules scripts/seed-snapshots.mjs
 * OR open the app — AutoPriceRefresh will call /api/snapshots/seed automatically.
 *
 * This script uses the Next.js dev server API instead of directly importing TS.
 * Make sure `npm run dev` is running, then execute this script.
 */
import { readFileSync } from "fs";

const BASE = "http://localhost:3000";

async function main() {
  // 1. Check current stats
  const statsRes = await fetch(`${BASE}/api/snapshots`);
  const stats = await statsRes.json();

  if (stats.totalAssets > 0) {
    console.log(`✓ DB already has ${stats.totalAssets} assets (${stats.totalSnapshots} snapshots).`);
    console.log(`  By class:`, stats.assetsByClass);
    return;
  }

  // 2. Seed
  console.log("Seeding snapshot DB with all portfolio assets...");
  const seedRes = await fetch(`${BASE}/api/snapshots/seed`, { method: "POST" });
  const result  = await seedRes.json();

  if (result.seeded) {
    console.log(`✓ Seeded ${result.stats.totalAssets} assets:`);
    for (const [cls, count] of Object.entries(result.stats.assetsByClass)) {
      console.log(`  ${cls.padEnd(20)} ${count}`);
    }
    console.log(`  Total snapshots: ${result.stats.totalSnapshots}`);
    console.log(`  Date: ${new Date().toISOString().slice(0, 10)}`);
  } else {
    console.log("Already seeded:", result.message);
  }
}

main().catch(console.error);
