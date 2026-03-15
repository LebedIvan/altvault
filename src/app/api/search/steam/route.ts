import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({
  q: z.string().min(2).max(100),
});

interface SteamSearchItem {
  name: string;
  sell_listings: number;
  sell_price: number;
  sell_price_text: string;
  asset_description: {
    type: string;
    background_color?: string;
    icon_url?: string;
  };
}

interface SteamSearchResponse {
  success: boolean;
  total_count: number;
  results: SteamSearchItem[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = QuerySchema.safeParse({ q: searchParams.get("q") });

  if (!query.success) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  try {
    const url =
      `https://steamcommunity.com/market/search/render/` +
      `?query=${encodeURIComponent(query.data.q)}` +
      `&appid=730&norender=1&count=10&currency=3`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 }, // cache 5 min
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Steam ${res.status}` }, { status: 502 });
    }

    const data = (await res.json()) as SteamSearchResponse;

    if (!data.success) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = (data.results ?? []).map((item) => ({
      name: item.name,
      price: item.sell_price_text ?? null,
      priceCents: item.sell_price ?? null,
      listings: item.sell_listings ?? 0,
      type: item.asset_description?.type ?? "",
      iconUrl: item.asset_description?.icon_url
        ? `https://steamcommunity-a.akamaihd.net/economy/image/${item.asset_description.icon_url}/96fx96f`
        : null,
    }));

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("Steam search error:", err);
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }
}
