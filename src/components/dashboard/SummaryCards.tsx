"use client";

import { StatCard } from "@/components/ui/Card";
import { formatCents, formatPct, formatROI } from "@/lib/formatters";
import type { PortfolioSummary } from "@/types/portfolio";

interface Props {
  summary: PortfolioSummary;
}

export function SummaryCards({ summary }: Props) {
  const {
    totalCurrentValueCents,
    totalCostCents,
    totalUnrealizedPnLCents,
    totalRealizedPnLCents,
    overallSimpleROI,
    overallAnnualizedROI,
    irpfTaxCents,
    effectiveTaxRate,
    totalNetValueCents,
  } = summary;

  const unrealizedTrend =
    totalUnrealizedPnLCents > 0
      ? "up"
      : totalUnrealizedPnLCents < 0
        ? "down"
        : "neutral";

  const realizedTrend =
    totalRealizedPnLCents > 0
      ? "up"
      : totalRealizedPnLCents < 0
        ? "down"
        : "neutral";

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard
        label="Portfolio Value"
        value={formatCents(totalCurrentValueCents)}
        sub={`Cost: ${formatCents(totalCostCents)}`}
        trend="neutral"
      />
      <StatCard
        label="Unrealized P&L"
        value={formatCents(totalUnrealizedPnLCents)}
        sub={formatPct(overallSimpleROI)}
        trend={unrealizedTrend}
        accent={
          totalUnrealizedPnLCents >= 0 ? "text-emerald-400" : "text-red-400"
        }
      />
      <StatCard
        label="Realized P&L"
        value={formatCents(totalRealizedPnLCents)}
        sub={totalRealizedPnLCents >= 0 ? "Profit banked" : "Losses incurred"}
        trend={realizedTrend}
        accent={
          totalRealizedPnLCents >= 0 ? "text-emerald-400" : "text-red-400"
        }
      />
      <StatCard
        label="Annualized ROI"
        value={formatROI(overallAnnualizedROI)}
        sub="CAGR (weighted)"
        trend={overallAnnualizedROI >= 0 ? "up" : "down"}
        accent={
          overallAnnualizedROI >= 0 ? "text-emerald-400" : "text-red-400"
        }
      />
      <StatCard
        label="Net After Fees"
        value={formatCents(totalNetValueCents)}
        sub="After platform sell fee"
        trend="neutral"
      />
      <StatCard
        label="IRPF Tax Owed"
        value={formatCents(irpfTaxCents)}
        sub={`Effective ${formatPct(effectiveTaxRate, 1)}`}
        trend="neutral"
        accent="text-amber-400"
      />
    </div>
  );
}
