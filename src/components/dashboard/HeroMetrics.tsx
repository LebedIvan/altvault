"use client";

import { clsx } from "clsx";
import { formatCents, formatPct } from "@/lib/formatters";
import type { PortfolioSummary } from "@/types/portfolio";

interface Props {
  summary: PortfolioSummary;
  /** Latest value from history (may differ from computed if using live prices) */
  latestValueCents?: number;
}

export function HeroMetrics({ summary, latestValueCents }: Props) {
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
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      {/* Primary: total value */}
      <div>
        <p className="text-sm font-medium text-slate-500">Стоимость портфеля</p>
        <p className="mt-1 text-5xl font-black tabular-nums tracking-tight text-white">
          {formatCents(displayValue)}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Вложено:{" "}
          <span className="text-slate-300">{formatCents(totalCostCents)}</span>
        </p>
      </div>

      {/* Secondary KPIs */}
      <div className="flex flex-wrap gap-6 lg:gap-10">
        {/* P&L */}
        <div className="flex flex-col">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Прибыль
          </p>
          <p
            className={clsx(
              "mt-0.5 text-3xl font-bold tabular-nums",
              isUp ? "text-emerald-400" : "text-red-400",
            )}
          >
            {isUp ? "+" : ""}
            {formatCents(totalPnL)}
          </p>
          <p className={clsx("text-sm font-medium", isUp ? "text-emerald-500" : "text-red-500")}>
            {formatPct(overallSimpleROI)} от вложенного
          </p>
        </div>

        {/* Unrealized */}
        <div className="flex flex-col">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Нереализованная
          </p>
          <p
            className={clsx(
              "mt-0.5 text-3xl font-bold tabular-nums",
              totalUnrealizedPnLCents >= 0 ? "text-emerald-400" : "text-red-400",
            )}
          >
            {totalUnrealizedPnLCents >= 0 ? "+" : ""}
            {formatCents(totalUnrealizedPnLCents)}
          </p>
          <p className="text-sm text-slate-500">Открытые позиции</p>
        </div>

        {/* Annualized ROI */}
        <div className="flex flex-col">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Доходность (год.)
          </p>
          <p
            className={clsx(
              "mt-0.5 text-3xl font-bold tabular-nums",
              overallAnnualizedROI >= 0 ? "text-emerald-400" : "text-red-400",
            )}
          >
            {formatPct(overallAnnualizedROI)}
          </p>
          <p className="text-sm text-slate-500">CAGR (взвешенный)</p>
        </div>

        {/* IRPF */}
        <div className="flex flex-col">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Налог IRPF
          </p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums text-amber-400">
            {formatCents(irpfTaxCents)}
          </p>
          <p className="text-sm text-slate-500">С реализованной прибыли</p>
        </div>
      </div>
    </div>
  );
}
