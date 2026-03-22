export const dynamic = "force-dynamic";
/**
 * eBay sold price data — fetches completed/sold listings.
 *
 * Uses eBay Finding API if EBAY_APP_ID is set,
 * otherwise generates realistic simulated price history.
 *
 * GET /api/ebay/sold?q=Pikachu+Zekrom+GX&currency=USD
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  fetchEbaySold,
  generateSimulated,
} from "@/lib/ebaySold";

// Re-export types so existing imports from this route continue to work
export type { SoldItem, EbaySoldData } from "@/lib/ebaySold";

const QuerySchema = z.object({
  q:        z.string().min(1).max(200),
  currency: z.enum(["EUR", "USD", "GBP"]).optional().default("USD"),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    q:        searchParams.get("q"),
    currency: searchParams.get("currency") ?? undefined,
  });

  if (!parsed.success)
    return NextResponse.json({ error: "Missing q" }, { status: 400 });

  const { q, currency } = parsed.data;

  const ebayData = await fetchEbaySold(q);
  if (ebayData) return NextResponse.json(ebayData);

  return NextResponse.json(generateSimulated(q, currency));
}
