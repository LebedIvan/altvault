export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({ name: z.string().min(1).max(120) });

interface ScryfallCard {
  name: string;
  prices: {
    eur?: string | null;
    eur_foil?: string | null;
    usd?: string | null;
    usd_foil?: string | null;
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({ name: searchParams.get("name") });
  if (!parsed.success)
    return NextResponse.json({ error: "Missing name" }, { status: 400 });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let res: Response;
    try {
      res = await fetch(
        `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(parsed.data.name)}`,
        { headers: { "User-Agent": "Vaulty/1.0" }, signal: controller.signal },
      );
    } finally {
      clearTimeout(timeout);
    }

    if (res.status === 404)
      return NextResponse.json({ error: "Card not found on Scryfall" }, { status: 404 });
    if (!res.ok)
      return NextResponse.json({ error: `Scryfall ${res.status}` }, { status: 502 });

    const card = (await res.json()) as ScryfallCard;
    const p = card.prices;

    // Prefer EUR (regular, then foil), fallback to USD
    const eur = p.eur ? parseFloat(p.eur) : p.eur_foil ? parseFloat(p.eur_foil) : null;
    const usd = p.usd ? parseFloat(p.usd) : p.usd_foil ? parseFloat(p.usd_foil) : null;

    if (eur && eur > 0)
      return NextResponse.json({ priceCents: Math.round(eur * 100), currency: "EUR", source: "scryfall" });
    if (usd && usd > 0)
      return NextResponse.json({ priceCents: Math.round(usd * 100), currency: "USD", source: "scryfall" });

    return NextResponse.json({ error: "No price available" }, { status: 404 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    if (msg.includes("abort")) return NextResponse.json({ error: "Timeout" }, { status: 504 });
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }
}
