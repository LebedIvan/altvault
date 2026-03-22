export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAll, isEmpty } from "@/lib/legoDb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 1) {
    return NextResponse.json({ error: "Missing q" }, { status: 400 });
  }

  if (await isEmpty()) {
    return NextResponse.json({ suggestions: [], total: 0 });
  }

  const lower = q.toLowerCase();
  const all = await getAll();

  // Score each set: higher = better match
  const scored = all
    .map((s) => {
      const nameL  = s.name.toLowerCase();
      const numL   = s.setNumber.toLowerCase();
      const themeL = s.theme.toLowerCase();

      let score = 0;
      if (numL === lower)                     score += 100;
      else if (numL.startsWith(lower))        score += 60;
      else if (nameL === lower)               score += 90;
      else if (nameL.startsWith(lower))       score += 50;
      else if (nameL.includes(lower))         score += 30;
      else if (themeL.includes(lower))        score += 10;
      else if (numL.includes(lower))          score += 20;

      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Secondary: prefer newer sets
      return (b.s.year ?? 0) - (a.s.year ?? 0);
    })
    .slice(0, 20);

  const suggestions = scored.map(({ s }) => {
    const yearStr  = s.year ? ` (${s.year})` : "";
    const fullName = `${s.setNumber} — ${s.name}${yearStr}`;

    return {
      id:         s.setNumber,
      name:       s.name,
      fullName,
      theme:      s.theme,
      year:       s.year,
      pieces:     s.pieces,
      imageSmall: s.imageUrl,
      imageLarge: s.imageUrl,
      priceCents: s.marketPriceGbp != null ? Math.round(s.marketPriceGbp * 100)
                : s.msrpGbp != null         ? Math.round(s.msrpGbp * 100)
                : s.msrpEur != null         ? Math.round(s.msrpEur * 100)
                : s.msrpUsd != null         ? Math.round(s.msrpUsd * 100)
                : null,
      currency:   s.marketPriceGbp != null  ? "GBP"
                : s.msrpGbp != null          ? "GBP"
                : s.msrpEur != null          ? "EUR"
                : s.msrpUsd != null          ? "USD"
                : "GBP",
    };
  });

  return NextResponse.json({ suggestions, total: suggestions.length });
}
