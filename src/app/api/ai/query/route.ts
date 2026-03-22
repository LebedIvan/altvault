export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Asset } from "@/types/asset";
import { computePortfolioSummary } from "@/lib/calculations/portfolio";
import { computeHealthScore } from "@/lib/calculations/healthScore";
import { computeAssetMetrics } from "@/lib/calculations/pnl";
import { getUserFromRequest } from "@/lib/authServer";

// ─── Request schema ───────────────────────────────────────────────────────────

const RequestSchema = z.object({
  query: z.string().min(1).max(2000),
  assets: z.array(z.unknown()),            // serialized Asset[]
  history: z.array(z.object({             // prior turns
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).max(20).default([]),
});

// ─── Portfolio context builder ────────────────────────────────────────────────

function fmtEur(cents: number): string {
  const v = cents / 100;
  if (Math.abs(v) >= 10000) return `€${(v / 1000).toFixed(1)}K`;
  return `€${v.toFixed(2)}`;
}

function buildPortfolioContext(assets: Asset[]): string {
  const now = new Date();
  const summary = computePortfolioSummary(assets, now);
  const health  = computeHealthScore(assets, now);
  const metrics = assets.map(a => ({ asset: a, m: computeAssetMetrics(a, now) }))
    .filter(x => x.m.unitsHeld > 0)
    .sort((a, b) => b.m.currentValueCents - a.m.currentValueCents);

  const totalValue  = summary.totalCurrentValueCents;
  const totalCost   = summary.totalCostCents;
  const totalPnL    = summary.totalUnrealizedPnLCents;
  const roi         = totalCost > 0 ? (totalPnL / totalCost * 100).toFixed(1) : "0";

  const lines: string[] = [
    `=== PORTFOLIO OVERVIEW ===`,
    `Total Value: ${fmtEur(totalValue)}`,
    `Total Cost:  ${fmtEur(totalCost)}`,
    `Unrealized PnL: ${totalPnL >= 0 ? "+" : ""}${fmtEur(totalPnL)} (${roi}% ROI)`,
    `Realized PnL: ${fmtEur(summary.totalRealizedPnLCents)}`,
    `Health Score: ${health.overall}/100 (${health.grade}) — ${health.gradeColor.toUpperCase()}`,
    ``,
    `=== PORTFOLIO ISSUES ===`,
    ...health.issues.map(i => `[${i.severity.toUpperCase()}] ${i.message}`),
    ...(health.issues.length === 0 ? ["None detected."] : []),
    ``,
    `=== STRENGTHS ===`,
    ...health.strengths.map(s => `✓ ${s}`),
    ...(health.strengths.length === 0 ? ["None yet."] : []),
    ``,
    `=== HEALTH SCORE BREAKDOWN ===`,
    `Diversification (20%): ${(health.components.diversification.score * 100).toFixed(0)}/100 — ${health.components.diversification.detail}`,
    `Liquidity (15%):       ${(health.components.liquidity.score * 100).toFixed(0)}/100 — ${health.components.liquidity.detail}`,
    `Performance (20%):     ${(health.components.performance.score * 100).toFixed(0)}/100 — ${health.components.performance.detail}`,
    `Risk-Adjusted (15%):   ${(health.components.riskAdjusted.score * 100).toFixed(0)}/100 — ${health.components.riskAdjusted.detail}`,
    `Trend (10%):           ${(health.components.trend.score * 100).toFixed(0)}/100 — ${health.components.trend.detail}`,
    `Position Sizing (10%): ${(health.components.sizing.score * 100).toFixed(0)}/100 — ${health.components.sizing.detail}`,
    `Cost Basis (10%):      ${(health.components.costBasis.score * 100).toFixed(0)}/100 — ${health.components.costBasis.detail}`,
    ``,
    `=== POSITIONS (${metrics.length} active, sorted by value) ===`,
  ];

  for (const { asset: a, m } of metrics) {
    const weight = totalValue > 0 ? (m.currentValueCents / totalValue * 100).toFixed(1) : "0";
    const pnlSign = m.unrealizedPnLCents >= 0 ? "+" : "";
    const roi_ = m.totalCostCents > 0 ? (m.unrealizedPnLCents / m.totalCostCents * 100).toFixed(1) : "0";
    lines.push(
      `• ${a.name} [${a.assetClass}] ${weight}% of portfolio`,
      `  Value: ${fmtEur(m.currentValueCents)} | Cost: ${fmtEur(m.totalCostCents)} | PnL: ${pnlSign}${fmtEur(m.unrealizedPnLCents)} (${pnlSign}${roi_}%)`,
      `  Qty: ${m.unitsHeld} | Ann. ROI: ${(m.annualizedROI * 100).toFixed(1)}% | Liquidity: ${a.liquidityDays}d | Risk: ${a.riskScore}/100`,
    );
  }

  // Class breakdown
  lines.push(``, `=== BY ASSET CLASS ===`);
  for (const [cls, s] of Object.entries(summary.byClass).sort((a, b) => b[1].totalCurrentValueCents - a[1].totalCurrentValueCents)) {
    const alloc = (s.allocation * 100).toFixed(1);
    const clsRoi = s.totalCostCents > 0 ? (s.unrealizedPnLCents / s.totalCostCents * 100).toFixed(1) : "0";
    lines.push(`${cls}: ${alloc}% of portfolio | ${fmtEur(s.totalCurrentValueCents)} | ROI: ${clsRoi}%`);
  }

  return lines.join("\n");
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert AI financial analyst specializing in alternative investments: TCG cards (Pokémon, MTG), CS2 skins, LEGO sets, collectibles, and other alt assets.

Your personality:
- Direct, confident, professional — like a Goldman Sachs private wealth advisor
- Give SPECIFIC numbers, not vague guidance
- Call out risks clearly — don't sugarcoat
- Always end with 2-3 concrete next steps
- Short answers for simple questions, detailed breakdowns for complex ones

Rules:
- Use the portfolio data provided to give personalized answers
- Refer to specific positions by name with actual values
- Never guarantee returns; always include realistic risks
- No legal/tax advice — but do mention tax implications (e.g., "consult your tax advisor about...")
- Format clearly: use headers, bullet points, and bold where helpful
- Be conversational but efficient — don't pad responses

When discussing selling/buying:
- Give specific $ amounts and % of portfolio
- Explain WHY with data
- Offer alternative scenarios
- Consider tax implications

For health score questions:
- Explain each component's contribution
- Prioritize the 1-2 biggest improvements available
- Give a specific action plan to improve the score`;

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check (allow demo users too)
  const user = getUserFromRequest(req);
  const isDemo = req.cookies.get("vaulty_demo")?.value === "1";
  if (!user && !isDemo) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI analyst is not configured. Add ANTHROPIC_API_KEY to .env.local." },
      { status: 503 },
    );
  }

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const assets = body.assets as Asset[];
  const context = buildPortfolioContext(assets);

  const client = new Anthropic({ apiKey });

  // Build messages: inject context as first exchange, then history, then new query
  const systemWithContext = `${SYSTEM_PROMPT}\n\n${context}`;

  const messages: Anthropic.MessageParam[] = [
    ...body.history.map(h => ({ role: h.role, content: h.content }) as Anthropic.MessageParam),
    { role: "user", content: body.query },
  ];

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemWithContext,
      messages,
    });

    const text = response.content.find(b => b.type === "text")?.text ?? "No response generated.";

    return NextResponse.json({ response: text });
  } catch (err) {
    console.error("AI query error:", err);
    const msg = err instanceof Error ? err.message : "AI service error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
