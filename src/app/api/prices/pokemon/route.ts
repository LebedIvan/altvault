export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({ id: z.string().min(1) });

interface TCGdexCardFull {
  id: string;
  name: string;
  pricing?: {
    cardmarket?: {
      trend?: number | null;
      avg?: number | null;
      avg30?: number | null;
      low?: number | null;
    };
    tcgplayer?: {
      normal?: { marketPrice?: number | null };
      holofoil?: { marketPrice?: number | null };
      reverseHolofoil?: { marketPrice?: number | null };
    };
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = QuerySchema.safeParse({ id: searchParams.get("id") });
  if (!query.success)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let res: Response;
    try {
      res = await fetch(
        `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(query.data.id)}`,
        { headers: { "User-Agent": "Vaulty/1.0" }, signal: controller.signal },
      );
    } finally {
      clearTimeout(timeout);
    }

    if (res.status === 404)
      return NextResponse.json({ error: "Card not found in TCGdex" }, { status: 404 });
    if (!res.ok)
      return NextResponse.json({ error: `TCGdex ${res.status}` }, { status: 502 });

    const card = (await res.json()) as TCGdexCardFull;
    const cm = card.pricing?.cardmarket;
    const cmPrice = cm?.trend ?? cm?.avg ?? cm?.avg30 ?? cm?.low ?? null;

    if (cmPrice && cmPrice > 0)
      return NextResponse.json({ priceCents: Math.round(cmPrice * 100), currency: "EUR", source: "cardmarket" });

    const tcp = card.pricing?.tcgplayer;
    const usd =
      tcp?.holofoil?.marketPrice ??
      tcp?.normal?.marketPrice ??
      tcp?.reverseHolofoil?.marketPrice ??
      null;
    if (usd && usd > 0)
      return NextResponse.json({ priceCents: Math.round(usd * 100), currency: "USD", source: "tcgplayer" });

    return NextResponse.json({ error: "No price available" }, { status: 404 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("TCGdex price error:", msg);
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }
}
