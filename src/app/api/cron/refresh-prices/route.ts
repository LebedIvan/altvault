export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel max for hobby plan

/**
 * Daily cron job — refreshes all market price cache entries that are
 * older than 20 hours (i.e., within 4h of expiry or already expired).
 *
 * Schedule: 0 3 * * *  (3am UTC daily) — see vercel.json
 * Protected by CRON_SECRET env var (set in Vercel, passed as Authorization header by Vercel Cron).
 */
import { NextResponse } from "next/server";
import { getAllMarketCacheEntries, fetchAllSources } from "@/lib/marketSources";

const REFRESH_BEFORE_EXPIRY_MS = 4 * 60 * 60 * 1000; // refresh when < 4h left

export async function GET(req: Request) {
  // Vercel Cron sends the secret as Authorization: Bearer <CRON_SECRET>
  const auth   = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await getAllMarketCacheEntries();
  const stale   = entries.filter(
    (e) => e.params && e.expiresAt.getTime() - Date.now() < REFRESH_BEFORE_EXPIRY_MS,
  );

  let refreshed = 0;
  let skipped   = 0;
  let failed    = 0;

  for (const entry of stale) {
    if (!entry.params) { skipped++; continue; }
    const { assetClass, externalId, name } = entry.params;
    try {
      await fetchAllSources(assetClass, externalId, name, /* forceRefresh */ true);
      refreshed++;
      // Small delay between requests to avoid hammering external APIs
      await new Promise((r) => setTimeout(r, 300));
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    total:     entries.length,
    stale:     stale.length,
    refreshed,
    skipped,
    failed,
    runAt:     new Date().toISOString(),
  });
}
