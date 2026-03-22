export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({ q: z.string().min(1).max(100) });

interface ScryfallCard {
  id: string;
  name: string;
  set_name: string;
  set: string;
  collector_number: string;
  rarity: string;
  released_at: string;
  image_uris?: { small: string; normal: string; large: string; png: string };
  card_faces?: Array<{ image_uris?: { small: string; normal: string; large: string; png?: string } }>;
  prices: {
    usd?: string | null;
    usd_foil?: string | null;
    eur?: string | null;
    eur_foil?: string | null;
  };
  tcgplayer_id?: number;
  purchase_uris?: { tcgplayer?: string; cardmarket?: string };
}

interface ScryfallResponse {
  object: string;
  total_cards: number;
  data: ScryfallCard[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = QuerySchema.safeParse({ q: searchParams.get("q") });

  if (!query.success) {
    return NextResponse.json({ error: "Missing q" }, { status: 400 });
  }

  const q = query.data.q;

  try {
    // Scryfall full-text search, sorted by EUR price desc
    const url =
      `https://api.scryfall.com/cards/search` +
      `?q=${encodeURIComponent(q)}` +
      `&order=eur&dir=desc` +
      `&unique=prints`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let res: Response;
    try {
      res = await fetch(url, { headers: { "User-Agent": "Vaulty/1.0" }, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    // 404 = no results (not an error)
    if (res.status === 404) {
      return NextResponse.json({ suggestions: [], total: 0 });
    }

    if (!res.ok) {
      return NextResponse.json({ error: `Scryfall ${res.status}` }, { status: 502 });
    }

    const data = (await res.json()) as ScryfallResponse;

    const suggestions = (data.data ?? []).slice(0, 15).map((card) => {
      // Image: prefer front face
      const imgUris =
        card.image_uris ?? card.card_faces?.[0]?.image_uris ?? null;

      const eurPrice  = card.prices.eur      ? parseFloat(card.prices.eur)      : null;
      const eurFoil   = card.prices.eur_foil ? parseFloat(card.prices.eur_foil) : null;
      const usdPrice  = card.prices.usd      ? parseFloat(card.prices.usd)      : null;

      // Best EUR price
      const priceEur  = eurFoil ?? eurPrice ?? null;
      const priceUsd  = usdPrice ?? null;
      const priceCents = priceEur
        ? Math.round(priceEur * 100)
        : priceUsd
          ? Math.round(priceUsd * 100)
          : null;
      const currency = priceEur ? "EUR" : "USD";

      return {
        id:           card.id,
        name:         card.name,
        fullName:     `${card.name} — ${card.set_name} #${card.collector_number}`,
        setName:      card.set_name,
        setCode:      card.set.toUpperCase(),
        number:       card.collector_number,
        rarity:       card.rarity,
        releasedAt:   card.released_at,
        imageSmall:   imgUris?.small  ?? null,
        imageLarge:   imgUris?.large  ?? imgUris?.normal ?? null,
        imagePng:     imgUris?.png    ?? null,
        priceCents,
        currency,
        tcgplayerUrl: card.purchase_uris?.tcgplayer  ?? null,
        cardmarketUrl:card.purchase_uris?.cardmarket  ?? null,
      };
    });

    return NextResponse.json({ suggestions, total: data.total_cards });
  } catch (err) {
    console.error("Scryfall search error:", err);
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }
}
