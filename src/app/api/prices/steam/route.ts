import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({
  name: z.string().min(1),
});

/** Steam Market price response shape */
interface SteamPriceResponse {
  success: boolean;
  lowest_price?: string;
  median_price?: string;
  volume?: string;
}

/** Parse "€12,34" / "$12.34" / "12,34€" → float */
function parseSteamPrice(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.,]/g, "").replace(",", ".");
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = QuerySchema.safeParse({ name: searchParams.get("name") });

  if (!query.success) {
    return NextResponse.json({ error: "Missing 'name' param" }, { status: 400 });
  }

  const itemName = query.data.name;

  try {
    // currency=3 → EUR
    const url =
      `https://steamcommunity.com/market/priceoverview/` +
      `?currency=3&appid=730&market_hash_name=${encodeURIComponent(itemName)}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 }, // cache 1h
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Steam API returned ${res.status}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as SteamPriceResponse;

    if (!data.success) {
      return NextResponse.json({ error: "Steam API: success=false" }, { status: 404 });
    }

    const raw = data.median_price ?? data.lowest_price ?? null;
    const price = raw ? parseSteamPrice(raw) : null;

    if (price === null) {
      return NextResponse.json({ error: "Could not parse price" }, { status: 422 });
    }

    return NextResponse.json({
      name: itemName,
      priceEur: price,
      priceCents: Math.round(price * 100),
      source: "steam_market",
      volume: data.volume ?? null,
      raw: data,
    });
  } catch (err) {
    console.error("Steam price fetch failed:", err);
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }
}
