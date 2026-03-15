import { NextResponse } from "next/server";

const VALID_SYMBOLS: Record<string, string> = {
  "SP500":    "^GSPC",
  "NASDAQ":   "^IXIC",
  "BTC":      "BTC-USD",
  "ETH":      "ETH-USD",
  "GOLD":     "GC=F",
  "SILVER":   "SI=F",
};

const RANGE_TO_YAHOO: Record<string, { range: string; interval: string }> = {
  "1M":  { range: "1mo",  interval: "1d"  },
  "3M":  { range: "3mo",  interval: "1d"  },
  "6M":  { range: "6mo",  interval: "1d"  },
  "1Y":  { range: "1y",   interval: "1d"  },
  "5Y":  { range: "5y",   interval: "1wk" },
  "ALL": { range: "10y",  interval: "1mo" },
};

interface YahooTimestamps {
  timestamp: number[];
  indicators: {
    quote: [{ close: (number | null)[] }];
  };
  meta: { regularMarketPrice: number; currency: string };
}

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } },
) {
  const { symbol } = params;
  const { searchParams } = new URL(request.url);
  const rangeKey = searchParams.get("range") ?? "1Y";

  const yahooSymbol = VALID_SYMBOLS[symbol];
  if (!yahooSymbol) {
    return NextResponse.json({ error: "Unknown symbol" }, { status: 400 });
  }

  const { range, interval } = RANGE_TO_YAHOO[rangeKey] ?? RANGE_TO_YAHOO["1Y"]!;

  try {
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}` +
      `?interval=${interval}&range=${range}&includePrePost=false`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Yahoo Finance ${res.status}` }, { status: 502 });
    }

    const json = (await res.json()) as {
      chart: { result: YahooTimestamps[] | null; error: unknown };
    };

    const result = json.chart?.result?.[0];
    if (!result) {
      return NextResponse.json({ error: "No data" }, { status: 404 });
    }

    const timestamps = result.timestamp ?? [];
    const closes = result.indicators.quote[0]?.close ?? [];
    const currentPrice = result.meta.regularMarketPrice;
    const currency = result.meta.currency;

    // Build clean series, forward-fill nulls
    const points: { date: string; close: number }[] = [];
    let lastClose: number | null = null;

    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];
      const close = closes[i] ?? lastClose;
      if (ts == null || close == null) continue;
      lastClose = close;
      points.push({
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        close,
      });
    }

    return NextResponse.json({
      symbol,
      yahooSymbol,
      currentPrice,
      currency,
      points,
    });
  } catch (err) {
    console.error("Benchmark fetch error:", err);
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }
}
