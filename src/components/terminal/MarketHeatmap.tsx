"use client";

import { useMemo } from "react";
import { clsx } from "clsx";
import { usePortfolio } from "@/store/portfolioStore";
import { useCurrency } from "@/store/currencyStore";
import { computeAssetMetrics } from "@/lib/calculations/pnl";
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from "@/lib/formatters";

interface ClassBlock {
  cls: string;
  label: string;
  color: string;
  valueCents: number;
  costCents: number;
  pnlCents: number;
  roi: number;
  count: number;
  allocation: number;
}

export function MarketHeatmap() {
  const { assets } = usePortfolio();
  const { fmtCents } = useCurrency();

  const blocks = useMemo((): ClassBlock[] => {
    const now = new Date();
    const byClass: Record<string, ClassBlock> = {};

    let totalValue = 0;
    for (const asset of assets) {
      const m = computeAssetMetrics(asset, now);
      if (m.unitsHeld <= 0) continue;

      const cls = asset.assetClass;
      totalValue += m.currentValueCents;

      if (!byClass[cls]) {
        byClass[cls] = {
          cls,
          label: ASSET_CLASS_LABELS[cls] ?? cls,
          color: ASSET_CLASS_COLORS[cls] ?? "#64748b",
          valueCents: 0,
          costCents: 0,
          pnlCents: 0,
          roi: 0,
          count: 0,
          allocation: 0,
        };
      }
      byClass[cls]!.valueCents += m.currentValueCents;
      byClass[cls]!.costCents  += m.totalCostCents;
      byClass[cls]!.pnlCents  += m.unrealizedPnLCents;
      byClass[cls]!.count     += 1;
    }

    const arr = Object.values(byClass).map((b) => ({
      ...b,
      roi: b.costCents > 0 ? b.pnlCents / b.costCents : 0,
      allocation: totalValue > 0 ? b.valueCents / totalValue : 0,
    }));

    return arr.sort((a, b) => b.valueCents - a.valueCents);
  }, [assets]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#4E6080]">
          Portfolio Heatmap
        </h2>
        <span className="text-xs text-[#2A3A50]">by allocation</span>
      </div>

      {/* Heatmap grid — sized by allocation */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {blocks.map((b) => {
          const size = Math.max(b.allocation * 100, 8); // min 8% width for visibility
          const roiColor =
            b.roi > 0.2  ? "bg-emerald-500/25 border-emerald-600/40 text-emerald-300" :
            b.roi > 0.05 ? "bg-emerald-800/20 border-emerald-800/30 text-emerald-400" :
            b.roi > -0.05? "bg-slate-800/40 border-slate-700/40 text-slate-400" :
            b.roi > -0.15? "bg-red-900/20 border-red-800/30 text-red-400" :
                           "bg-red-800/30 border-red-700/40 text-red-300";

          return (
            <div
              key={b.cls}
              className={clsx(
                "rounded-lg border p-2.5 flex flex-col gap-1 transition-all hover:scale-[1.02]",
                roiColor,
              )}
              style={{ flexBasis: `calc(${size}% - 6px)`, minWidth: "90px" }}
            >
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                <span className="text-xs font-semibold leading-tight">{b.label}</span>
              </div>
              <div className="text-xs tabular-nums font-bold">
                {fmtCents(b.valueCents, "EUR")}
              </div>
              <div className={clsx("text-xs font-medium tabular-nums", b.roi >= 0 ? "opacity-90" : "opacity-90")}>
                {b.roi >= 0 ? "+" : ""}{(b.roi * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] opacity-60">
                {(b.allocation * 100).toFixed(1)}% · {b.count} item{b.count !== 1 ? "s" : ""}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[#1C2640]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1C2640] bg-[#080F1C]">
              <th className="px-3 py-2 text-left text-[#4E6080] font-medium">Category</th>
              <th className="px-3 py-2 text-right text-[#4E6080] font-medium">Value</th>
              <th className="px-3 py-2 text-right text-[#4E6080] font-medium">P&L</th>
              <th className="px-3 py-2 text-right text-[#4E6080] font-medium">ROI</th>
              <th className="px-3 py-2 text-right text-[#4E6080] font-medium">Alloc.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#162035]">
            {blocks.map((b) => (
              <tr key={b.cls} className="hover:bg-[#162035] transition-colors">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="text-[#B0C4DE]">{b.label}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-[#E8F0FF] font-medium">
                  {fmtCents(b.valueCents, "EUR")}
                </td>
                <td className={clsx("px-3 py-2 text-right tabular-nums font-medium", b.pnlCents >= 0 ? "text-emerald-400" : "text-[#F87171]")}>
                  {b.pnlCents >= 0 ? "+" : ""}{fmtCents(b.pnlCents, "EUR")}
                </td>
                <td className={clsx("px-3 py-2 text-right tabular-nums font-bold", b.roi >= 0 ? "text-emerald-400" : "text-[#F87171]")}>
                  {b.roi >= 0 ? "+" : ""}{(b.roi * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-[#4E6080]">
                  {(b.allocation * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
