import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { LegoSetRecord } from "@/lib/legoSetRecord";

// ─── Request schema ────────────────────────────────────────────────────────────

const RequestSchema = z.object({
  set: z.unknown(),       // LegoSetRecord
  gbpToUsd: z.number().positive(),
  ebay: z.object({
    trendingPrice:  z.number().nullable(),
    lowestPrice:    z.number().nullable(),
    highestPrice:   z.number().nullable(),
    averagePrice:   z.number().nullable(),
    totalSales:     z.number(),
    source:         z.string(),
  }).nullable().optional(),
});

// ─── Structured prediction ─────────────────────────────────────────────────────

export interface LegoPrediction {
  verdict:       "BUY" | "HOLD" | "SELL";
  confidence:    "LOW" | "MEDIUM" | "HIGH";
  priceTargetUsd: number | null;
  upsidePct:     number | null;
  timeHorizon:   string;
  summary:       string;
  keyFactors:    string[];
  risks:         string[];
}

// ─── Context builder ───────────────────────────────────────────────────────────

function buildSetContext(
  set: LegoSetRecord,
  gbpToUsd: number,
  ebay: z.infer<typeof RequestSchema>["ebay"],
): string {
  const today = new Date().toISOString().slice(0, 10);
  const marketUsd = set.marketPriceGbp != null
    ? set.marketPriceGbp * gbpToUsd
    : null;
  const premiumPct = set.msrpUsd && marketUsd
    ? ((marketUsd - set.msrpUsd) / set.msrpUsd * 100).toFixed(1)
    : null;

  let daysUntilRetirement: number | null = null;
  let retirementStatus = "Unknown";
  if (set.exitDate) {
    const exitMs = new Date(set.exitDate + "T00:00:00Z").getTime();
    const nowMs  = Date.now();
    const diff   = Math.round((exitMs - nowMs) / 86_400_000);
    if (diff < 0) {
      retirementStatus = `RETIRED ${Math.abs(diff)} days ago (${set.exitDate})`;
    } else {
      daysUntilRetirement = diff;
      retirementStatus = diff <= 90
        ? `RETIRING IN ${diff} DAYS (${set.exitDate}) — CRITICAL SIGNAL`
        : diff <= 180
          ? `Retiring in ${diff} days (${set.exitDate}) — approaching retirement`
          : `Active — retires ${set.exitDate} (~${Math.round(diff / 30)} months)`;
    }
  }

  const lines = [
    `=== LEGO SET DATA ===`,
    `Set #: ${set.setNumber}`,
    `Name: ${set.name}`,
    `Theme: ${set.theme}`,
    `Year: ${set.year ?? "unknown"}`,
    `Pieces: ${set.pieces?.toLocaleString() ?? "unknown"}`,
    ``,
    `=== PRICING ===`,
    `MSRP USD:   ${set.msrpUsd    != null ? `$${set.msrpUsd.toFixed(2)}`    : "N/A"}`,
    `MSRP GBP:   ${set.msrpGbp    != null ? `£${set.msrpGbp.toFixed(2)}`    : "N/A"}`,
    `MSRP EUR:   ${set.msrpEur    != null ? `€${set.msrpEur.toFixed(2)}`    : "N/A"}`,
    `Market GBP: ${set.marketPriceGbp != null ? `£${set.marketPriceGbp.toFixed(2)}` : "N/A"}`,
    `Market USD: ${marketUsd != null ? `$${marketUsd.toFixed(2)}` : "N/A"}`,
    `vs MSRP:    ${premiumPct != null ? `${Number(premiumPct) >= 0 ? "+" : ""}${premiumPct}%` : "N/A"}`,
    ``,
    `=== RETIREMENT STATUS ===`,
    `Launch date: ${set.launchDate ?? "unknown"}`,
    `Exit date:   ${retirementStatus}`,
    `Today:       ${today}`,
    ...(daysUntilRetirement != null ? [`Days until retirement: ${daysUntilRetirement}`] : []),
    ``,
    `=== EBAY SOLD DATA (last ~90 days, USD) ===`,
    ebay
      ? [
          `Trending (median): ${ebay.trendingPrice != null ? `$${ebay.trendingPrice.toFixed(2)}` : "N/A"}`,
          `Average:           ${ebay.averagePrice  != null ? `$${ebay.averagePrice.toFixed(2)}`  : "N/A"}`,
          `Lowest:            ${ebay.lowestPrice   != null ? `$${ebay.lowestPrice.toFixed(2)}`   : "N/A"}`,
          `Highest:           ${ebay.highestPrice  != null ? `$${ebay.highestPrice.toFixed(2)}`  : "N/A"}`,
          `Recent sales:      ${ebay.totalSales}`,
          ebay.source === "simulated" ? `(NOTE: eBay data is simulated — no real API key configured)` : `(Source: real eBay API)`,
        ].join("\n")
      : "eBay data not available",
  ];

  return lines.join("\n");
}

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert LEGO investment analyst with deep knowledge of the secondary market for retired and retiring LEGO sets.

You understand these market dynamics:
- LEGO sets typically appreciate 20-60% in the 6-18 months after retirement (end of production)
- Sets retiring within 90 days are strong buy candidates due to upcoming supply constraint
- Already-retired sets have a proven price floor and often trend up over years
- Large sets (2000+ pieces) appreciate more than small sets
- Iconic themes (Star Wars, Harry Potter, Icons, Ideas, Technic) hold value better
- Sets trading BELOW MSRP on secondary market = undervalued entry opportunity
- Sets trading 30%+ above MSRP = take profits territory unless retiring imminently
- Piece count correlates with collectibility: more pieces = harder to reassemble = holds value
- Limited IP licenses (Harry Potter, Marvel) can lose license = re-release unlikely = positive for value

Your task: analyze the provided LEGO set data and give an investment recommendation.

CRITICAL: Respond ONLY with a valid JSON object in exactly this format, no other text:
{
  "verdict": "BUY" | "HOLD" | "SELL",
  "confidence": "LOW" | "MEDIUM" | "HIGH",
  "priceTargetUsd": <number or null>,
  "upsidePct": <number or null — % upside from current market price to target>,
  "timeHorizon": "<e.g. '6-12 months' or '12-24 months'>",
  "summary": "<1-2 sentence plain-language summary of the recommendation>",
  "keyFactors": ["<factor 1>", "<factor 2>", "<factor 3>"],
  "risks": ["<risk 1>", "<risk 2>"]
}`;

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 },
    );
  }

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const set = body.set as LegoSetRecord;
  const context = buildSetContext(set, body.gbpToUsd, body.ebay ?? null);

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 512,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: context }],
    });

    const raw = response.content.find((b) => b.type === "text")?.text ?? "";

    // Extract JSON from response (Claude may wrap it)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 502 });
    }

    const prediction = JSON.parse(jsonMatch[0]) as LegoPrediction;
    return NextResponse.json({ prediction });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    console.error("LEGO predict error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
