"use client";

import { clsx } from "clsx";
import { formatPct } from "@/lib/formatters";
import { useCurrency } from "@/store/currencyStore";
import type { PortfolioSummary } from "@/types/portfolio";

interface Props {
  summary: PortfolioSummary;
  /** Latest value from history (may differ from computed if using live prices) */
  latestValueCents?: number;
}

export function HeroMetrics({ summary, latestValueCents }: Props) {
  const { fmtCents } = useCurrency();
  const {
    totalCurrentValueCents,
    totalCostCents,
    totalUnrealizedPnLCents,
    totalRealizedPnLCents,
    overallSimpleROI,
    overallAnnualizedROI,
    irpfTaxCents,
  } = summary;

  const displayValue = latestValueCents ?? totalCurrentValueCents;
  const totalPnL = totalUnrealizedPnLCents + totalRealizedPnLCents;
  const isUp = totalPnL >= 0;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      {/* Primary: total value */}
      <div>
        <p className="fm text-xs font-medium uppercase tracking-widest text-[#4E6080]">Стоимость портфеля</p>
        <p className="fb mt-1 text-3xl sm:text-4xl lg:text-5xl font-black tabular-nums tracking-tight text-[#E8F0FF]">
          {fmtCents(displayValue)}
        </p>
        <p className="fm mt-1 text-xs text-[#3E5070]">
          Вложено:{" "}
          <span className="text-[#B0C4DE]">{fmtCents(totalCostCents)}</span>
        </p>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:gap-6 lg:gap-10">
        {/* P&L */}
        <div className="flex flex-col">
          <p className="fm text-xs font-medium uppercase tracking-widest text-[#4E6080]">
            Прибыль
          </p>
          <p className={clsx("fb mt-0.5 text-xl sm:text-2xl lg:text-3xl font-bold tabular-nums", isUp ? "text-[#4ADE80]" : "text-[#F87171]")}>
            {isUp ? "+" : ""}{fmtCents(totalPnL)}
          </p>
          <p className={clsx("fm text-xs font-medium", isUp ? "text-[#4ADE80]" : "text-[#F87171]")}>
            {formatPct(overallSimpleROI)} от вложенного
          </p>
        </div>

        {/* Unrealized */}
        <div className="flex flex-col">
          <p className="fm text-xs font-medium uppercase tracking-widest text-[#4E6080]">
            Нереализованная
          </p>
          <p className={clsx("fb mt-0.5 text-xl sm:text-2xl lg:text-3xl font-bold tabular-nums", totalUnrealizedPnLCents >= 0 ? "text-[#4ADE80]" : "text-[#F87171]")}>
            {totalUnrealizedPnLCents >= 0 ? "+" : ""}{fmtCents(totalUnrealizedPnLCents)}
          </p>
          <p className="fm text-xs text-[#3E5070]">Открытые позиции</p>
        </div>

        {/* Annualized ROI */}
        <div className="flex flex-col">
          <p className="fm text-xs font-medium uppercase tracking-widest text-[#4E6080]">
            Доходность (год.)
          </p>
          <p className={clsx("fb mt-0.5 text-xl sm:text-2xl lg:text-3xl font-bold tabular-nums", overallAnnualizedROI >= 0 ? "text-[#4ADE80]" : "text-[#F87171]")}>
            {formatPct(overallAnnualizedROI)}
          </p>
          <p className="fm text-xs text-[#3E5070]">CAGR (взвешенный)</p>
        </div>

        {/* IRPF */}
        <div className="flex flex-col">
          <p className="fm text-xs font-medium uppercase tracking-widest text-[#4E6080]">
            Налог IRPF
          </p>
          <p className="fb mt-0.5 text-xl sm:text-2xl lg:text-3xl font-bold tabular-nums text-[#F59E0B]">
            {fmtCents(irpfTaxCents)}
          </p>
          <p className="fm text-xs text-[#3E5070]">С реализованной прибыли</p>
        </div>
      </div>
    </div>
  );
}
