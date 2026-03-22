export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { recordSnapshots } from "@/lib/snapshotDb";

// ─── Yahoo Finance helpers ─────────────────────────────────────────────────────

const YAHOO_METALS: Record<string, string> = {
  XAU: "GC=F",
  XAG: "SI=F",
  XPT: "PL=F",
  XPD: "PA=F",
};

const METAL_KEYWORDS: [string, string][] = [
  ["GOLD",      "XAU"],
  ["SILVER",    "XAG"],
  ["PLATINUM",  "XPT"],
  ["PALLADIUM", "XPD"],
];

function detectMetalSymbol(name: string): string | null {
  const upper = name.toUpperCase();
  for (const [kw, sym] of METAL_KEYWORDS) {
    if (upper.includes(kw)) return sym;
  }
  return null;
}

function extractTroyOzMultiplier(name: string): number {
  const frac = name.match(/\((\d+)\/(\d+)\s+troy\s+oz\)/i);
  if (frac) {
    const fraction = parseInt(frac[1]!) / parseInt(frac[2]!);
    const mult = name.match(/\(×(\d+)\)/);
    return fraction * (mult ? parseInt(mult[1]!) : 1);
  }
  const int = name.match(/\((\d+)\s+troy\s+oz\)/i);
  if (int) return parseInt(int[1]!);
  return 1;
}

interface YahooResult {
  points: { date: string; priceCents: number }[];
}

async function fetchYahooHistory(ticker: string, ozMultiplier: number): Promise<YahooResult> {
  // Fetch 10Y of weekly data
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?interval=1wk&range=10y&includePrePost=false`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return { points: [] };

  const json = (await res.json()) as {
    chart: {
      result: Array<{
        timestamp: number[];
        indicators: { quote: [{ close: (number | null)[] }] };
        meta: { currency: string };
      }> | null;
    };
  };

  const result = json.chart?.result?.[0];
  if (!result) return { points: [] };

  // USD → EUR conversion (approximate; use current rate)
  let eurRate = 0.917;
  try {
    const fx = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    });
    if (fx.ok) {
      const fxData = (await fx.json()) as { rates?: Record<string, number> };
      eurRate = fxData.rates?.["EUR"] ?? eurRate;
    }
  } catch {
    // use fallback
  }

  const timestamps = result.timestamp ?? [];
  const closes     = result.indicators.quote[0]?.close ?? [];

  let lastClose: number | null = null;
  const points: { date: string; priceCents: number }[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const ts    = timestamps[i];
    const close: number | null = (closes[i] as number | null | undefined) ?? lastClose;
    if (ts == null || close == null) continue;
    lastClose = close;

    const priceEur    = close * eurRate * ozMultiplier;
    const priceCents  = Math.round(priceEur * 100);
    const date        = new Date(ts * 1000).toISOString().slice(0, 10);
    points.push({ date, priceCents });
  }

  return { points };
}

// ─── Route handler ─────────────────────────────────────────────────────────────

interface BackfillRequest {
  assets: Array<{
    assetId: string;
    name: string;
    assetClass: string;
  }>;
}

/**
 * POST /api/snapshots/backfill
 * For each asset in the request that has a historical data source,
 * fetch and store all available history in the snapshot DB.
 * Currently supports: commodities (via Yahoo Finance, up to 10 years weekly).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BackfillRequest;
    const assets = body.assets ?? [];

    let totalPoints = 0;
    const report: Record<string, number> = {};

    await Promise.all(
      assets.map(async (asset) => {
        if (asset.assetClass !== "commodities") return;

        const metalSym = detectMetalSymbol(asset.name);
        if (!metalSym) return; // Rhodium or unknown
        const ticker = YAHOO_METALS[metalSym];
        if (!ticker) return;

        const ozMultiplier = extractTroyOzMultiplier(asset.name);
        const { points } = await fetchYahooHistory(ticker, ozMultiplier);
        if (points.length === 0) return;

        recordSnapshots(
          points.map((p) => ({
            assetId:    asset.assetId,
            name:       asset.name,
            assetClass: asset.assetClass,
            priceCents: p.priceCents,
            date:       p.date,
          })),
        );

        totalPoints += points.length;
        report[asset.name] = points.length;
      }),
    );

    return NextResponse.json({ ok: true, totalPoints, report });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
