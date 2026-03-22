export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({
  name: z.string().min(1),
});

/** Skinport item shape (relevant fields only) */
interface SkinportItem {
  market_hash_name: string;
  suggested_price: number | null;
  min_price: number | null;
}

/** Steam Market price response shape */
interface SteamPriceResponse {
  success: boolean;
  lowest_price?: string;
  median_price?: string;
  volume?: string;
}

/**
 * Parse price strings like "€12,34" / "$12.34" / "1.234,56 €" / "1,234.56"
 * Disambiguates European vs US format by which separator appears last.
 */
function parseSteamPrice(raw: string): number | null {
  const s = raw.replace(/[^\d.,]/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastPeriod = s.lastIndexOf(".");
  let normalized: string;
  if (lastComma > lastPeriod) {
    // Comma is decimal separator: "1.234,56" (European)
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else {
    // Period is decimal separator: "1,234.56" (US) or "12.34"
    normalized = s.replace(/,/g, "");
  }
  const val = parseFloat(normalized);
  return isNaN(val) ? null : val;
}

/** Primary: Skinport free API (no auth, caches 1h, covers all CS2 items) */
async function fetchSkinport(itemName: string): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.skinport.com/v1/items?app_id=730&currency=EUR",
      {
        headers: { "User-Agent": "Vaulty/1.0", Accept: "application/json" },
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return null;
    const items = (await res.json()) as SkinportItem[];
    const item = items.find((i) => i.market_hash_name === itemName);
    const price = item?.suggested_price ?? item?.min_price ?? null;
    return price; // already in EUR
  } catch {
    return null;
  }
}

/** Fallback: Steam priceoverview (currency=3 = EUR) */
async function fetchSteam(itemName: string): Promise<number | null> {
  try {
    const url =
      `https://steamcommunity.com/market/priceoverview/` +
      `?currency=3&appid=730&market_hash_name=${encodeURIComponent(itemName)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as SteamPriceResponse;
    if (!data.success) return null;
    const raw = data.median_price ?? data.lowest_price ?? null;
    return raw ? parseSteamPrice(raw) : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = QuerySchema.safeParse({ name: searchParams.get("name") });

  if (!query.success) {
    return NextResponse.json({ error: "Missing 'name' param" }, { status: 400 });
  }

  const itemName = query.data.name;

  try {
    const price =
      (await fetchSkinport(itemName)) ??
      (await fetchSteam(itemName));

    if (price === null || price <= 0) {
      return NextResponse.json({ error: "No price available" }, { status: 404 });
    }

    return NextResponse.json({
      name: itemName,
      priceCents: Math.round(price * 100),
      currency: "EUR",
      source: "skinport",
    });
  } catch (err) {
    console.error("Steam/Skinport price fetch failed:", err);
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }
}
