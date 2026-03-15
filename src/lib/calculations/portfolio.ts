import type { Asset } from "@/types/asset";
import type { PortfolioSummary, ClassSummary } from "@/types/portfolio";
import { computeAssetMetrics } from "./pnl";
import { computeIRPFTax } from "./tax";
import { DAYS_PER_YEAR } from "@/constants/fees";

/**
 * Aggregate per-asset metrics into a full PortfolioSummary.
 */
export function computePortfolioSummary(
  assets: Asset[],
  now: Date = new Date(),
): PortfolioSummary {
  const assetBreakdown = assets.map((a) => computeAssetMetrics(a, now));

  const totalCostCents = assetBreakdown.reduce(
    (s, m) => s + m.totalCostCents,
    0,
  );
  const totalCurrentValueCents = assetBreakdown.reduce(
    (s, m) => s + m.currentValueCents,
    0,
  );
  const totalUnrealizedPnLCents = assetBreakdown.reduce(
    (s, m) => s + m.unrealizedPnLCents,
    0,
  );
  const totalRealizedPnLCents = assetBreakdown.reduce(
    (s, m) => s + m.realizedPnLCents,
    0,
  );
  const totalNetValueCents = assetBreakdown.reduce(
    (s, m) => s + m.netValueAfterFeeCents,
    0,
  );

  const overallSimpleROI =
    totalCostCents === 0
      ? 0
      : totalUnrealizedPnLCents / totalCostCents;

  // Portfolio-level annualized ROI: weight each asset by cost basis
  const weightedAnnualizedROI =
    totalCostCents === 0
      ? 0
      : assetBreakdown.reduce(
          (sum, m) => sum + m.annualizedROI * (m.totalCostCents / totalCostCents),
          0,
        );

  // IRPF applies to realized gains only (taxable event = sell)
  const taxableGainCents = Math.max(0, totalRealizedPnLCents);
  const { taxCents: irpfTaxCents, effectiveRate: effectiveTaxRate } =
    computeIRPFTax(taxableGainCents);

  // Breakdown by asset class
  const byClass: Record<string, ClassSummary> = {};
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]!;
    const metrics = assetBreakdown[i]!;
    const cls = asset.assetClass;

    const existing = byClass[cls];
    if (existing !== undefined) {
      existing.totalCostCents += metrics.totalCostCents;
      existing.totalCurrentValueCents += metrics.currentValueCents;
      existing.unrealizedPnLCents += metrics.unrealizedPnLCents;
      existing.count += 1;
    } else {
      byClass[cls] = {
        totalCostCents: metrics.totalCostCents,
        totalCurrentValueCents: metrics.currentValueCents,
        unrealizedPnLCents: metrics.unrealizedPnLCents,
        allocation: 0, // filled below
        count: 1,
      };
    }
  }

  // Compute allocation fractions
  for (const cls of Object.keys(byClass)) {
    const summary = byClass[cls]!;
    summary.allocation =
      totalCurrentValueCents === 0
        ? 0
        : summary.totalCurrentValueCents / totalCurrentValueCents;
  }

  return {
    totalCostCents,
    totalCurrentValueCents,
    totalUnrealizedPnLCents,
    totalRealizedPnLCents,
    totalNetValueCents,
    overallSimpleROI,
    overallAnnualizedROI: weightedAnnualizedROI,
    taxableGainCents,
    irpfTaxCents,
    effectiveTaxRate,
    assetBreakdown,
    byClass,
  };
}

export { DAYS_PER_YEAR };
