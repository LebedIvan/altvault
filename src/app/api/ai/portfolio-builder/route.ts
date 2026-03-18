import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AllocationSlice {
  class:             string;   // "lego" | "pokemon" | "cs2_skins" | "gold" | "silver" | "mtg" | ...
  label:             string;   // "LEGO Sets"
  pct:               number;   // 25.0
  amountUsd:         number;   // 1250
  rationale:         string;   // why this class
  expectedReturn1Y:  number;   // % e.g. 18
  expectedReturn3Y:  number;   // % total over 3Y e.g. 65
  expectedReturn5Y:  number;
  topPicks:          string[]; // 3 specific recs
  riskLevel:         "low" | "medium" | "high";
}

export interface ForecastPoint {
  year:         number;
  conservative: number;   // USD portfolio value
  base:         number;
  optimistic:   number;
}

export interface StressTest {
  scenario:    string;   // "Stock Market Crash -40%"
  icon:        string;   // "🔴" | "🟡" | "🟢"
  impact:      number;   // % portfolio change e.g. -12.3
  explanation: string;
}

export interface MerlinPortfolio {
  summary:               string;
  keyThesis:             string;   // 2-3 sentence investment thesis
  allocations:           AllocationSlice[];
  forecast:              ForecastPoint[];
  stressTests:           StressTest[];
  projectedAnnualReturn: number;   // % annualized
  riskScore:             number;   // 0-100
  diversificationScore:  number;   // 0-100
  liquidityScore:        number;   // 0-100
  warnings:              string[];
}

// ─── Request schema ────────────────────────────────────────────────────────────

const RequestSchema = z.object({
  amountUsd:   z.number().positive().max(10_000_000),
  horizonYears: z.number().int().min(1).max(10),
  riskProfile: z.enum(["conservative", "moderate", "aggressive"]),
  excludeClasses: z.array(z.string()).default([]),
});

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM = `You are Merlin, an elite alternative investment portfolio optimizer with deep expertise across:
- LEGO sets: retired sets +20-60% in 12-18 months post-retirement. Star Wars, Icons, Technic themes outperform. Large sets (2000+ pieces) have premium appreciation.
- Pokemon TCG: sealed booster boxes +15-25%/yr. Graded PSA 10 cards (Charizard, Pikachu alt art) highest ROI. Vintage Base Set dominates.
- MTG (Magic: The Gathering): Reserved List cards (Black Lotus, Moxen) never reprint = store of value. Modern staples volatile. Foils premium.
- CS2 Skins: knife skins (Karambit, Butterfly) most stable. Cases +30-80% short-term after discontinuation. High liquidity (1-3 day sell time).
- Precious metals (gold/silver): inflation hedge. Gold -10% to +15%/yr typical. Portfolio stabilizer, low correlation with collectibles.
- Sports cards: PSA-graded rookie cards. Topps Chrome, Prizm most liquid. Star athletes (Mahomes, LeBron) hold value.
- Comics: CGC 9.8 first appearances (Spawn #1, X-Men #1). Low liquidity but massive upside on key issues.

Market correlations:
- LEGO, Pokemon, MTG: low correlation with crypto/stocks (0.2-0.3)
- CS2 skins: moderate correlation with crypto markets (0.5)
- Metals: negative correlation with USD (-0.4)
- Sports cards: moderate correlation with sports seasons

Risk profiles:
- Conservative: >40% metals/LEGO, avoid CS2, focus on proven assets
- Moderate: balanced across classes, some CS2, mainstream collectibles
- Aggressive: heavy CS2/Pokemon, high expected return, high volatility

CRITICAL: Respond ONLY with valid JSON matching the exact structure. No markdown, no explanation, only JSON.

JSON structure:
{
  "summary": "One sentence overview",
  "keyThesis": "2-3 sentences on the investment strategy",
  "allocations": [
    {
      "class": "lego",
      "label": "LEGO Sets",
      "pct": 35,
      "amountUsd": 1750,
      "rationale": "...",
      "expectedReturn1Y": 18,
      "expectedReturn3Y": 65,
      "expectedReturn5Y": 140,
      "topPicks": ["LEGO 10317 Land Rover Defender (retiring soon)", "LEGO 75313 AT-AT (retired, -12% vs MSRP)", "LEGO 42154 Ford GT (retiring Q4)"],
      "riskLevel": "medium"
    }
  ],
  "forecast": [
    {"year": 0, "conservative": 5000, "base": 5000, "optimistic": 5000},
    {"year": 1, "conservative": 5400, "base": 5900, "optimistic": 6800}
  ],
  "stressTests": [
    {"scenario": "Global stock market -40%", "icon": "🟡", "impact": -8.2, "explanation": "Collectibles decorrelated from equities; metals provide hedge"},
    {"scenario": "Crypto crash -80%", "icon": "🔴", "impact": -14.5, "explanation": "CS2 skin demand partially correlates with crypto sentiment"},
    {"scenario": "Inflation spike +10%", "icon": "🟢", "impact": +18.3, "explanation": "Metals surge; tangible collectibles become inflation hedge"},
    {"scenario": "LEGO mass retirement wave", "icon": "🟢", "impact": +24.0, "explanation": "Multiple simultaneous retirements trigger rapid price appreciation"},
    {"scenario": "Pokemon ban/controversy", "icon": "🔴", "impact": -9.1, "explanation": "TCG demand drops but limited portfolio exposure minimizes damage"}
  ],
  "projectedAnnualReturn": 24.5,
  "riskScore": 55,
  "diversificationScore": 78,
  "liquidityScore": 62,
  "warnings": ["CS2 market sensitive to Valve policy changes", "LEGO retirement dates subject to change without notice"]
}`;

// ─── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const prompt = `Build an optimized alternative investment portfolio:
- Total capital: $${body.amountUsd.toLocaleString()} USD
- Time horizon: ${body.horizonYears} year${body.horizonYears > 1 ? "s" : ""}
- Risk profile: ${body.riskProfile}
- Excluded asset classes: ${body.excludeClasses.length > 0 ? body.excludeClasses.join(", ") : "none"}
- Today's date: ${new Date().toISOString().slice(0, 10)}

Requirements:
1. Include 4-7 asset classes (allocations must sum to 100%)
2. amountUsd must equal pct/100 * total capital for each allocation
3. Forecast must include year 0 through year ${body.horizonYears} (${body.horizonYears + 1} points)
4. All forecasts start at $${body.amountUsd} at year 0
5. topPicks must be SPECIFIC named assets (with set numbers, card names, skin names)
6. Stress tests: exactly 5 scenarios
7. Align allocations with the ${body.riskProfile} risk profile`;

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 3000,
      system:     SYSTEM,
      messages:   [{ role: "user", content: prompt }],
    });

    const raw = response.content.find((b) => b.type === "text")?.text ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Invalid AI response" }, { status: 502 });
    }

    const portfolio = JSON.parse(jsonMatch[0]) as MerlinPortfolio;
    return NextResponse.json({ portfolio });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    console.error("Portfolio builder error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
