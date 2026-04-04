export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily cron — fetches eBay Browse API market prices for up to 20 comics
 * with the oldest priceUpdatedAt (never-priced items first).
 *
 * Schedule: 0 5 * * * (5am UTC) — see vercel.json
 * Protected by CRON_SECRET env var (set in Vercel, passed as Authorization: Bearer).
 *
 * Requires: EBAY_APP_ID + EBAY_CERT_ID env vars (same as other price fetches).
 * Stores the median active-listing price as priceRawCents in USD cents.
 */
import { NextResponse } from "next/server";
import { getComicsForPriceSync, updateComicPrices } from "@/lib/comicsDb";
import { fetchEbaySold } from "@/lib/ebaySold";

const BATCH_LIMIT = 20;
const DELAY_MS    = 300;

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

export async function GET(req: Request) {
  const auth   = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const toPrice = await getComicsForPriceSync(BATCH_LIMIT);
  let updated = 0;
  let noData  = 0;
  let failed  = 0;

  for (let i = 0; i < toPrice.length; i++) {
    const comic = toPrice[i]!;
    // Quoted title + "comic book" to keep eBay results focused
    const query = `"${comic.volumeName} #${comic.issueNumber}" comic book`;

    try {
      const result = await fetchEbaySold(query);

      if (!result || result.trendingPrice === null) {
        noData++;
        // Still bump priceUpdatedAt so this comic isn't re-queried every single run
        await updateComicPrices(comic.cvId, {
          priceRawCents:   null,
          priceSource:     result?.source ?? "ebay_browse",
          priceSampleSize: result?.totalSales ?? null,
        });
      } else {
        await updateComicPrices(comic.cvId, {
          priceRawCents:   Math.round(result.trendingPrice * 100),
          priceSource:     result.source,
          priceSampleSize: result.totalSales,
          priceCurrency:   result.currency,
        });
        updated++;
      }
    } catch {
      failed++;
    }

    if (i < toPrice.length - 1) await sleep(DELAY_MS);
  }

  return NextResponse.json({
    processed: toPrice.length,
    updated,
    noData,
    failed,
    runAt: new Date().toISOString(),
  });
}
