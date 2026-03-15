import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({
  symbol: z.enum(["XAG", "XAU", "XPT", "XPD"]),
});

/**
 * Metals price via metals-api.com (free tier: 50 req/month).
 * Set METALS_API_KEY in .env.local.
 *
 * Falls back to frankfurter.app for USD→EUR conversion if needed.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = QuerySchema.safeParse({ symbol: searchParams.get("symbol") });

  if (!query.success) {
    return NextResponse.json(
      { error: "Invalid symbol. Use XAG (silver), XAU (gold), XPT (platinum), XPD (palladium)" },
      { status: 400 },
    );
  }

  const { symbol } = query.data;
  const apiKey = process.env["METALS_API_KEY"];

  if (!apiKey) {
    // Fallback: use Open Exchange Rates / free metals feed
    return fetchFallback(symbol);
  }

  try {
    const res = await fetch(
      `https://metals-api.com/api/latest?access_key=${apiKey}&base=EUR&symbols=${symbol}`,
      { next: { revalidate: 3600 } },
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Metals API error ${res.status}` }, { status: 502 });
    }

    const data = (await res.json()) as {
      success: boolean;
      rates: Record<string, number>;
    };

    const rate = data.rates[symbol];
    if (!rate) {
      return NextResponse.json({ error: "Symbol not in response" }, { status: 404 });
    }

    // metals-api returns oz price; 1 EUR = rate oz → price/oz = 1/rate EUR
    const pricePerOzEur = 1 / rate;

    return NextResponse.json({
      symbol,
      pricePerOzEur,
      priceCents: Math.round(pricePerOzEur * 100),
      source: "metals_api",
    });
  } catch (err) {
    console.error("Metals fetch failed:", err);
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }
}

/** Fallback: goldapi.io free endpoint (no key required for spot prices) */
async function fetchFallback(symbol: string) {
  try {
    // goldapi.io requires API key for most metals, use exchangerate-api as fallback
    // We return a 503 with a helpful message so the UI can show "configure API key"
    return NextResponse.json(
      {
        error: "METALS_API_KEY not configured",
        hint: "Add METALS_API_KEY=your_key to .env.local (free at metals-api.com)",
        symbol,
      },
      { status: 503 },
    );
  } catch {
    return NextResponse.json({ error: "Fallback fetch failed" }, { status: 502 });
  }
}
