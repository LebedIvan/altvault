export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export interface TickerItem {
  symbol:   string;
  name:     string;
  price:    number;
  change24h: number; // fraction e.g. 0.024 = +2.4%
  currency: string;
  category: "crypto" | "equity" | "commodity" | "volatility" | "fx";
}

// ─── Yahoo Finance ────────────────────────────────────────────────────────────

async function yahooQuote(
  symbol: string,
): Promise<{ price: number; change24h: number } | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice as number;
    const prev  = (meta.chartPreviousClose ?? meta.previousClose) as number | undefined;
    if (!price) return null;
    const change24h = prev ? (price - prev) / prev : 0;
    return { price, change24h };
  } catch {
    return null;
  }
}

// ─── CoinGecko ────────────────────────────────────────────────────────────────

interface CoinGeckoPrice {
  usd: number;
  usd_24h_change: number;
}

async function fetchCrypto(): Promise<
  Record<string, { price: number; change24h: number }> | null
> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true",
      {
        headers: { "User-Agent": "Vaulty/1.0" },
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, CoinGeckoPrice>;
    const out: Record<string, { price: number; change24h: number }> = {};
    for (const [id, v] of Object.entries(data)) {
      if (v?.usd) out[id] = { price: v.usd, change24h: v.usd_24h_change / 100 };
    }
    return out;
  } catch {
    return null;
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET() {
  const YAHOO_SYMBOLS: Array<{
    ySymbol: string;
    symbol: string;
    name: string;
    currency: string;
    category: TickerItem["category"];
  }> = [
    { ySymbol: "SPY",   symbol: "SPY",  name: "S&P 500",      currency: "USD", category: "equity"    },
    { ySymbol: "QQQ",   symbol: "QQQ",  name: "NASDAQ 100",   currency: "USD", category: "equity"    },
    { ySymbol: "GLD",   symbol: "GLD",  name: "Gold ETF",     currency: "USD", category: "commodity" },
    { ySymbol: "SLV",   symbol: "SLV",  name: "Silver ETF",   currency: "USD", category: "commodity" },
    { ySymbol: "^VIX",  symbol: "VIX",  name: "VIX",          currency: "USD", category: "volatility"},
    { ySymbol: "DX=F",  symbol: "DXY",  name: "US Dollar Idx",currency: "USD", category: "fx"        },
  ];

  // Parallel fetches
  const [cryptoData, ...yahooResults] = await Promise.all([
    fetchCrypto(),
    ...YAHOO_SYMBOLS.map((s) => yahooQuote(s.ySymbol)),
  ]);

  const items: TickerItem[] = [];

  // Crypto
  const cryptoMap: Array<{ id: string; symbol: string; name: string }> = [
    { id: "bitcoin",  symbol: "BTC", name: "Bitcoin"  },
    { id: "ethereum", symbol: "ETH", name: "Ethereum" },
    { id: "solana",   symbol: "SOL", name: "Solana"   },
  ];
  for (const c of cryptoMap) {
    const q = cryptoData?.[c.id];
    if (q) {
      items.push({ symbol: c.symbol, name: c.name, price: q.price, change24h: q.change24h, currency: "USD", category: "crypto" });
    }
  }

  // Yahoo
  for (let i = 0; i < YAHOO_SYMBOLS.length; i++) {
    const meta = YAHOO_SYMBOLS[i]!;
    const q    = yahooResults[i];
    if (q) {
      items.push({
        symbol: meta.symbol,
        name: meta.name,
        price: q.price,
        change24h: q.change24h,
        currency: meta.currency,
        category: meta.category,
      });
    }
  }

  return NextResponse.json({ items, fetchedAt: new Date().toISOString() });
}
