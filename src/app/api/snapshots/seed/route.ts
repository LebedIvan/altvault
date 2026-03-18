import { NextResponse } from "next/server";
import { recordSnapshots, getStats, isEmpty } from "@/lib/snapshotDb";
import { generateSeedAssets } from "@/data/seedPortfolio";

/**
 * POST /api/snapshots/seed
 * Seeds the snapshot DB with ALL assets from the seed portfolio.
 * Only runs if the DB is empty (idempotent — safe to call multiple times).
 */
export async function POST() {
  try {
    if (!isEmpty()) {
      const stats = getStats();
      return NextResponse.json({ seeded: false, message: "DB already has data", stats });
    }

    const assets = generateSeedAssets();
    const today  = new Date().toISOString().slice(0, 10);

    recordSnapshots(
      assets.map((a) => ({
        assetId:    a.id,
        name:       a.name,
        assetClass: a.assetClass,
        priceCents: a.currentPriceCents,
        date:       today,
      })),
    );

    const stats = getStats();
    return NextResponse.json({ seeded: true, stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
