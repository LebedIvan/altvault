/**
 * Portfolio Health Score — 0-100 composite metric.
 *
 * Components (weights):
 *   Diversification    20%  — Herfindahl-Hirschman Index
 *   Liquidity          15%  — weighted by asset liquidityDays
 *   Performance        20%  — portfolio ROI vs cost basis
 *   Risk-Adjusted      15%  — Sharpe-proxy from price snapshots
 *   Trend              10%  — recent momentum of top positions
 *   Position Sizing    10%  — max single-position weight
 *   Cost Basis         10%  — entry timing quality
 */

import type { Asset } from "@/types/asset";
import { computeAssetMetrics } from "./pnl";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComponentScore {
  score: number;   // 0–1
  label: string;   // human label
  detail: string;  // one-line explanation
  weight: number;  // 0–1 contribution weight
}

export interface HealthIssue {
  severity: "critical" | "warning";
  message: string;
}

export interface HealthScoreResult {
  overall: number;       // 0–100
  grade: string;         // A+, A, B+, B, C+, C, D, F
  gradeColor: "emerald" | "yellow" | "orange" | "red";
  components: {
    diversification: ComponentScore;
    liquidity:       ComponentScore;
    performance:     ComponentScore;
    riskAdjusted:    ComponentScore;
    trend:           ComponentScore;
    sizing:          ComponentScore;
    costBasis:       ComponentScore;
  };
  issues:    HealthIssue[];
  strengths: string[];
}

// ─── Component calculators ────────────────────────────────────────────────────

function calcDiversification(assets: Asset[], metrics: ReturnType<typeof computeAssetMetrics>[]): ComponentScore {
  const total = metrics.reduce((s, m) => s + m.currentValueCents, 0);
  if (total === 0) return { score: 0.5, label: "N/A", detail: "No positions to evaluate", weight: 0.20 };

  // HHI by position
  const hhi = metrics.reduce((s, m) => {
    const w = m.currentValueCents / total;
    return s + w * w;
  }, 0);

  // Also look at class-level concentration
  const byClass: Record<string, number> = {};
  for (let i = 0; i < assets.length; i++) {
    const cls = assets[i]!.assetClass;
    byClass[cls] = (byClass[cls] ?? 0) + (metrics[i]?.currentValueCents ?? 0);
  }
  const classHhi = Object.values(byClass).reduce((s, v) => {
    const w = v / total;
    return s + w * w;
  }, 0);

  // Score uses the worse of position vs class HHI
  const worstHhi = Math.max(hhi, classHhi);
  let score: number;
  if (worstHhi <= 0.12) score = 1.0;
  else if (worstHhi >= 0.50) score = 0.15;
  else score = 1.0 - ((worstHhi - 0.12) / 0.38) * 0.85;

  const numClasses = Object.keys(byClass).length;
  return {
    score,
    label: score > 0.7 ? "Good" : score > 0.45 ? "Moderate" : "Poor",
    detail: `${numClasses} asset class${numClasses !== 1 ? "es" : ""}, HHI ${worstHhi.toFixed(2)}`,
    weight: 0.20,
  };
}

function calcLiquidity(assets: Asset[], metrics: ReturnType<typeof computeAssetMetrics>[]): ComponentScore {
  const total = metrics.reduce((s, m) => s + m.currentValueCents, 0);
  if (total === 0) return { score: 0.5, label: "N/A", detail: "No positions", weight: 0.15 };

  // Liquidity score per position based on liquidityDays field
  let weightedScore = 0;
  for (let i = 0; i < assets.length; i++) {
    const a = assets[i]!;
    const m = metrics[i]!;
    const w = m.currentValueCents / total;
    // liquidityDays: 1–7 = 1.0, 7–30 = 0.75, 30–90 = 0.5, 90+ = 0.25
    const days = a.liquidityDays;
    const liq = days <= 7 ? 1.0 : days <= 30 ? 0.75 : days <= 90 ? 0.50 : 0.25;
    weightedScore += liq * w;
  }

  const pctLiquidIn7d = metrics
    .filter((_, i) => (assets[i]?.liquidityDays ?? 999) <= 7)
    .reduce((s, m) => s + m.currentValueCents, 0) / total;

  return {
    score: weightedScore,
    label: weightedScore > 0.7 ? "High" : weightedScore > 0.4 ? "Medium" : "Low",
    detail: `${(pctLiquidIn7d * 100).toFixed(0)}% liquid within 7 days`,
    weight: 0.15,
  };
}

function calcPerformance(assets: Asset[], metrics: ReturnType<typeof computeAssetMetrics>[]): ComponentScore {
  const totalCost    = metrics.reduce((s, m) => s + m.totalCostCents, 0);
  const totalCurrent = metrics.reduce((s, m) => s + m.currentValueCents, 0);
  if (totalCost === 0) return { score: 0.5, label: "N/A", detail: "No cost basis", weight: 0.20 };

  const portfolioReturn = (totalCurrent - totalCost) / totalCost;

  // Compute days since earliest purchase
  let earliestMs = Date.now();
  for (const a of assets) {
    for (const tx of a.transactions) {
      const d = new Date(tx.date).getTime();
      if (d < earliestMs) earliestMs = d;
    }
  }
  let score: number;
  if (portfolioReturn >= 0.50)      score = 1.0;
  else if (portfolioReturn >= 0.25) score = 0.85;
  else if (portfolioReturn >= 0.10) score = 0.70;
  else if (portfolioReturn >= 0)    score = 0.55;
  else if (portfolioReturn >= -0.10) score = 0.40;
  else score = 0.20;

  return {
    score,
    label: portfolioReturn >= 0.25 ? "Strong Returns" : portfolioReturn >= 0 ? "Positive" : "In Loss",
    detail: `${(portfolioReturn * 100).toFixed(1)}% total ROI on cost basis`,
    weight: 0.20,
  };
}

function calcRiskAdjusted(assets: Asset[], _metrics: ReturnType<typeof computeAssetMetrics>[]): ComponentScore {
  // Collect price snapshot returns from all assets
  const allMonthlyReturns: number[] = [];
  for (let i = 0; i < assets.length; i++) {
    const a = assets[i]!;
    const snaps = [...(a.priceSnapshots ?? [])].sort((x, y) => x.date.localeCompare(y.date));
    if (snaps.length < 4) continue;
    // Compute monthly returns from snapshots (approximate: every 30 entries or interpolate)
    const step = Math.max(1, Math.floor(snaps.length / 6));
    for (let j = step; j < snaps.length; j += step) {
      const prev = snaps[j - step]?.priceCents ?? 1;
      const curr = snaps[j]?.priceCents ?? 1;
      if (prev > 0) allMonthlyReturns.push((curr - prev) / prev);
    }
  }

  if (allMonthlyReturns.length < 3) {
    // Fallback: use riskScore fields
    const avgRisk = assets.length > 0
      ? assets.reduce((s, a) => s + a.riskScore, 0) / assets.length
      : 50;
    const score = 1.0 - (avgRisk / 100) * 0.7;
    return {
      score,
      label: score > 0.7 ? "Good" : "Limited Data",
      detail: `Avg risk score ${avgRisk.toFixed(0)}/100 (insufficient price history)`,
      weight: 0.15,
    };
  }

  const mean = allMonthlyReturns.reduce((s, r) => s + r, 0) / allMonthlyReturns.length;
  const variance = allMonthlyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / allMonthlyReturns.length;
  const stdDev = Math.sqrt(variance);
  const rf = 0.0525 / 12; // 5.25% annual / 12
  const sharpe = stdDev > 0 ? ((mean - rf) / stdDev) * Math.sqrt(12) : 0;

  let score: number;
  if (sharpe >= 2.0) score = 1.0;
  else if (sharpe >= 1.0) score = 0.7 + (sharpe - 1.0) * 0.3;
  else if (sharpe >= 0) score = 0.4 + sharpe * 0.3;
  else score = Math.max(0.1, 0.4 + sharpe * 0.2);

  return {
    score,
    label: sharpe >= 1.5 ? "Excellent" : sharpe >= 1.0 ? "Good" : sharpe >= 0.5 ? "Fair" : "Poor",
    detail: `Sharpe ratio ${sharpe.toFixed(2)} (${allMonthlyReturns.length} data points)`,
    weight: 0.15,
  };
}

function calcTrend(assets: Asset[], metrics: ReturnType<typeof computeAssetMetrics>[]): ComponentScore {
  const total = metrics.reduce((s, m) => s + m.currentValueCents, 0);
  if (total === 0) return { score: 0.5, label: "Neutral", detail: "No positions", weight: 0.10 };

  let weightedMomentum = 0;
  let coveredWeight = 0;

  for (let i = 0; i < assets.length; i++) {
    const a = assets[i]!;
    const m = metrics[i]!;
    const w = m.currentValueCents / total;
    const snaps = [...(a.priceSnapshots ?? [])].sort((x, y) => x.date.localeCompare(y.date));
    if (snaps.length < 2) continue;

    const latest = snaps[snaps.length - 1]!.priceCents;
    // 30d momentum: find snap closest to 30 days ago
    const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const baseline = snaps.find(s => s.date >= cutoff)?.priceCents ?? snaps[0]!.priceCents;
    const momentum = baseline > 0 ? (latest - baseline) / baseline : 0;

    weightedMomentum += momentum * w;
    coveredWeight += w;
  }

  if (coveredWeight < 0.1) {
    // No snapshot data — use PnL trend as proxy
    const totalPnL = metrics.reduce((s, m) => s + m.unrealizedPnLCents, 0);
    const roi = total > 0 ? totalPnL / (total - totalPnL) : 0;
    const score = roi > 0.3 ? 0.8 : roi > 0.1 ? 0.65 : roi > 0 ? 0.55 : 0.35;
    return {
      score,
      label: roi > 0.1 ? "Positive" : roi > 0 ? "Neutral" : "Negative",
      detail: `Based on overall ROI (no recent price data)`,
      weight: 0.10,
    };
  }

  const avgMomentum = weightedMomentum / coveredWeight;
  let score: number;
  if (avgMomentum >= 0.15) score = 1.0;
  else if (avgMomentum >= 0.05) score = 0.8;
  else if (avgMomentum >= 0) score = 0.6;
  else if (avgMomentum >= -0.10) score = 0.4;
  else score = 0.2;

  return {
    score,
    label: avgMomentum >= 0.05 ? "Bullish" : avgMomentum >= 0 ? "Neutral" : "Bearish",
    detail: `30d weighted momentum ${avgMomentum >= 0 ? "+" : ""}${(avgMomentum * 100).toFixed(1)}%`,
    weight: 0.10,
  };
}

function calcSizing(assets: Asset[], metrics: ReturnType<typeof computeAssetMetrics>[]): ComponentScore {
  const total = metrics.reduce((s, m) => s + m.currentValueCents, 0);
  if (total === 0 || assets.length === 0) return { score: 0.5, label: "N/A", detail: "No positions", weight: 0.10 };

  const maxWeight = Math.max(...metrics.map(m => m.currentValueCents / total));

  let score: number;
  if (maxWeight <= 0.15) score = 1.0;
  else if (maxWeight <= 0.20) score = 0.85;
  else if (maxWeight <= 0.30) score = 0.70;
  else if (maxWeight <= 0.40) score = 0.50;
  else if (maxWeight <= 0.50) score = 0.30;
  else score = 0.15;

  const topAsset = assets[metrics.findIndex(m => m.currentValueCents / total === maxWeight)];
  return {
    score,
    label: maxWeight <= 0.20 ? "Balanced" : maxWeight <= 0.35 ? "Watch" : "Concentrated",
    detail: `Max position: ${(maxWeight * 100).toFixed(1)}%${topAsset ? ` (${topAsset.name.slice(0, 30)})` : ""}`,
    weight: 0.10,
  };
}

function calcCostBasis(_assets: Asset[], metrics: ReturnType<typeof computeAssetMetrics>[]): ComponentScore {
  if (metrics.length === 0) return { score: 0.5, label: "N/A", detail: "No positions", weight: 0.10 };

  const relevant = metrics.filter(m => m.totalCostCents > 0);
  if (relevant.length === 0) return { score: 0.5, label: "N/A", detail: "No cost data", weight: 0.10 };

  // Score based on average ROI across positions (weighted by cost basis)
  const totalCost = relevant.reduce((s, m) => s + m.totalCostCents, 0);
  const weightedRoi = relevant.reduce((s, m) => {
    const roi = m.totalCostCents > 0 ? m.unrealizedPnLCents / m.totalCostCents : 0;
    return s + roi * (m.totalCostCents / totalCost);
  }, 0);

  // Positions in profit vs loss
  const profitable = relevant.filter(m => m.unrealizedPnLCents > 0).length;
  const profitRate = profitable / relevant.length;

  let score: number;
  if (weightedRoi >= 0.50 && profitRate >= 0.8) score = 1.0;
  else if (weightedRoi >= 0.25 && profitRate >= 0.7) score = 0.85;
  else if (weightedRoi >= 0.10 && profitRate >= 0.6) score = 0.70;
  else if (weightedRoi >= 0 && profitRate >= 0.5) score = 0.55;
  else if (weightedRoi >= -0.10) score = 0.40;
  else score = 0.25;

  return {
    score,
    label: profitRate >= 0.7 ? "Strong" : profitRate >= 0.5 ? "Mixed" : "Weak",
    detail: `${profitable}/${relevant.length} positions profitable, avg ROI ${weightedRoi >= 0 ? "+" : ""}${(weightedRoi * 100).toFixed(1)}%`,
    weight: 0.10,
  };
}

// ─── Grade helpers ────────────────────────────────────────────────────────────

function toGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 83) return "A";
  if (score >= 76) return "B+";
  if (score >= 70) return "B";
  if (score >= 63) return "C+";
  if (score >= 55) return "C";
  if (score >= 45) return "D";
  return "F";
}

function toGradeColor(score: number): HealthScoreResult["gradeColor"] {
  if (score >= 75) return "emerald";
  if (score >= 60) return "yellow";
  if (score >= 45) return "orange";
  return "red";
}

// ─── Issue detection ──────────────────────────────────────────────────────────

function detectIssues(
  comps: HealthScoreResult["components"],
  assets: Asset[],
  metrics: ReturnType<typeof computeAssetMetrics>[],
): HealthIssue[] {
  const issues: HealthIssue[] = [];
  const total = metrics.reduce((s, m) => s + m.currentValueCents, 0);

  // Concentration
  const maxWeight = total > 0 ? Math.max(...metrics.map(m => m.currentValueCents / total)) : 0;
  if (maxWeight > 0.40) {
    const idx = metrics.findIndex(m => m.currentValueCents / total === maxWeight);
    issues.push({
      severity: "critical",
      message: `Concentration risk: ${(maxWeight * 100).toFixed(0)}% in "${assets[idx]?.name ?? "one position"}"`,
    });
  } else if (maxWeight > 0.25) {
    const idx = metrics.findIndex(m => m.currentValueCents / total === maxWeight);
    issues.push({
      severity: "warning",
      message: `High concentration: ${(maxWeight * 100).toFixed(0)}% in "${assets[idx]?.name ?? "one position"}"`,
    });
  }

  // Liquidity
  if (comps.liquidity.score < 0.35) {
    issues.push({ severity: "critical", message: "Low liquidity: most positions take >30 days to sell" });
  } else if (comps.liquidity.score < 0.55) {
    issues.push({ severity: "warning", message: "Moderate liquidity — limited fast-exit options" });
  }

  // Underwater positions
  const underwater = metrics.filter(m => m.unrealizedPnLCents < -m.totalCostCents * 0.15);
  if (underwater.length > 0) {
    issues.push({
      severity: "warning",
      message: `${underwater.length} position${underwater.length > 1 ? "s" : ""} down >15% — consider tax-loss harvesting`,
    });
  }

  // Single asset class
  const classes = new Set(assets.map(a => a.assetClass));
  if (classes.size === 1) {
    issues.push({ severity: "warning", message: "Only one asset class — diversify into others" });
  }

  // Performance lagging
  if (comps.performance.score < 0.40) {
    issues.push({ severity: "warning", message: "Portfolio returns below target — review underperforming positions" });
  }

  return issues;
}

function detectStrengths(
  comps: HealthScoreResult["components"],
  _assets: Asset[],
  metrics: ReturnType<typeof computeAssetMetrics>[],
): string[] {
  const strengths: string[] = [];

  if (comps.performance.score >= 0.75) strengths.push("Strong portfolio returns on cost basis");
  if (comps.diversification.score >= 0.75) strengths.push("Well-diversified across classes");
  if (comps.liquidity.score >= 0.70) strengths.push("High liquidity — quick exit options available");
  if (comps.riskAdjusted.score >= 0.75) strengths.push("Strong risk-adjusted returns (Sharpe)");
  if (comps.trend.score >= 0.75) strengths.push("Positive price momentum across holdings");
  if (comps.sizing.score >= 0.80) strengths.push("Balanced position sizing");
  if (comps.costBasis.score >= 0.80) strengths.push("Excellent entry timing (most positions profitable)");

  const profitable = metrics.filter(m => m.unrealizedPnLCents > 0).length;
  if (profitable === metrics.length && metrics.length > 2) {
    strengths.push("All positions currently in profit");
  }

  return strengths;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeHealthScore(assets: Asset[], now = new Date()): HealthScoreResult {
  if (assets.length === 0) {
    return {
      overall: 0,
      grade: "—",
      gradeColor: "red",
      components: {
        diversification: { score: 0, label: "N/A", detail: "Empty portfolio", weight: 0.20 },
        liquidity:       { score: 0, label: "N/A", detail: "Empty portfolio", weight: 0.15 },
        performance:     { score: 0, label: "N/A", detail: "Empty portfolio", weight: 0.20 },
        riskAdjusted:    { score: 0, label: "N/A", detail: "Empty portfolio", weight: 0.15 },
        trend:           { score: 0, label: "N/A", detail: "Empty portfolio", weight: 0.10 },
        sizing:          { score: 0, label: "N/A", detail: "Empty portfolio", weight: 0.10 },
        costBasis:       { score: 0, label: "N/A", detail: "Empty portfolio", weight: 0.10 },
      },
      issues: [{ severity: "warning", message: "Add assets to get a health score" }],
      strengths: [],
    };
  }

  const metrics = assets.map(a => computeAssetMetrics(a, now));

  const comps = {
    diversification: calcDiversification(assets, metrics),
    liquidity:       calcLiquidity(assets, metrics),
    performance:     calcPerformance(assets, metrics),
    riskAdjusted:    calcRiskAdjusted(assets, metrics),
    trend:           calcTrend(assets, metrics),
    sizing:          calcSizing(assets, metrics),
    costBasis:       calcCostBasis(assets, metrics),
  };

  const overall = Math.round(
    comps.diversification.score * 100 * comps.diversification.weight +
    comps.liquidity.score       * 100 * comps.liquidity.weight +
    comps.performance.score     * 100 * comps.performance.weight +
    comps.riskAdjusted.score    * 100 * comps.riskAdjusted.weight +
    comps.trend.score           * 100 * comps.trend.weight +
    comps.sizing.score          * 100 * comps.sizing.weight +
    comps.costBasis.score       * 100 * comps.costBasis.weight,
  );

  return {
    overall,
    grade: toGrade(overall),
    gradeColor: toGradeColor(overall),
    components: comps,
    issues:    detectIssues(comps, assets, metrics),
    strengths: detectStrengths(comps, assets, metrics),
  };
}
