import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({
  symbol: z.enum(["XAG", "XAU", "XPT", "XPD", "XRH"]),
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
      { error: "Invalid symbol. Use XAG, XAU, XPT, XPD, or XRH" },
      { status: 400 },
    );
  }

  const { symbol } = query.data;

  // Rhodium has no free API — return not-available silently
  if (symbol === "XRH") {
    return NextResponse.json({ error: "Rhodium price unavailable (no free API)" }, { status: 404 });
  }

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

/** Fallback: Yahoo Finance spot prices (no API key required) */
const YAHOO_TICKER: Record<string, string> = {
  XAU: "GC=F",
  XAG: "SI=F",
  XPT: "PL=F",
  XPD: "PA=F",
};

async function fetchFallback(symbol: string) {
  try {
    const ticker = YAHOO_TICKER[symbol];
    if (!ticker) {
      return NextResponse.json({ error: `No fallback for symbol ${symbol}` }, { status: 404 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let priceUsd: number | null = null;
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
        {
          headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
          signal: controller.signal,
        },
      );
      if (res.ok) {
        const json = (await res.json()) as {
          chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> };
        };
        priceUsd = json?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
      }
    } finally {
      clearTimeout(timeout);
    }

    if (!priceUsd) {
      return NextResponse.json({ error: "Yahoo Finance: no price data" }, { status: 502 });
    }

    // Convert USD → EUR via open.er-api.com (free, no key)
    let eurRate = 0.917; // approximate fallback
    try {
      const fxRes = await fetch("https://open.er-api.com/v6/latest/USD", {
        next: { revalidate: 3600 },
      });
      if (fxRes.ok) {
        const fxData = (await fxRes.json()) as { rates?: Record<string, number> };
        eurRate = fxData?.rates?.["EUR"] ?? eurRate;
      }
    } catch {
      // use approximate fallback rate
    }

    const priceEur = priceUsd * eurRate;
    return NextResponse.json({
      symbol,
      pricePerOzEur: priceEur,
      priceCents: Math.round(priceEur * 100),
      source: "yahoo_finance",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    if (msg.includes("abort")) return NextResponse.json({ error: "Timeout" }, { status: 504 });
    return NextResponse.json({ error: "Fallback fetch failed" }, { status: 502 });
  }
}
