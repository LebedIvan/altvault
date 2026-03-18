"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { formatPct, formatROI, ASSET_CLASS_LABELS } from "@/lib/formatters";
import { useCurrency } from "@/store/currencyStore";
import type { Asset } from "@/types/asset";
import type { AssetMetrics } from "@/types/portfolio";
import { SellAssetModal } from "@/components/dashboard/SellAssetModal";

interface Props {
  assets: Asset[];
  metrics: AssetMetrics[];
}

type SortKey = "name" | "value" | "pnl" | "roi" | "liquidity" | "risk";

export function AssetTable({ assets, metrics }: Props) {
  const router = useRouter();
  const { fmtCents } = useCurrency();
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortAsc, setSortAsc] = useState(false);
  const [sellAsset, setSellAsset] = useState<Asset | null>(null);

  const rows = assets
    .map((asset, i) => ({ asset, metrics: metrics[i]! }))
    .filter((r) => r.metrics.unitsHeld > 0)
    .sort((a, b) => {
      let diff = 0;
      switch (sortKey) {
        case "name":
          diff = a.asset.name.localeCompare(b.asset.name);
          break;
        case "value":
          diff = a.metrics.currentValueCents - b.metrics.currentValueCents;
          break;
        case "pnl":
          diff = a.metrics.unrealizedPnLCents - b.metrics.unrealizedPnLCents;
          break;
        case "roi":
          diff = a.metrics.annualizedROI - b.metrics.annualizedROI;
          break;
        case "liquidity":
          diff = a.asset.liquidityDays - b.asset.liquidityDays;
          break;
        case "risk":
          diff = a.asset.riskScore - b.asset.riskScore;
          break;
      }
      return sortAsc ? diff : -diff;
    });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function SortTh({
    label,
    colKey,
  }: {
    label: string;
    colKey: SortKey;
  }) {
    const active = sortKey === colKey;
    return (
      <th
        onClick={() => toggleSort(colKey)}
        className={clsx(
          "cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider",
          active ? "text-[#F59E0B]" : "text-[#3E5070] hover:text-[#B0C4DE]",
        )}
      >
        {label} {active ? (sortAsc ? "↑" : "↓") : ""}
      </th>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#1C2640]">
      <table className="min-w-full divide-y divide-[#162035] bg-[#0E1830] text-sm">
        <thead>
          <tr className="bg-[#080F1C]">
            <SortTh label="Asset" colKey="name" />
            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#3E5070]">
              Class
            </th>
            <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#3E5070]">
              Units
            </th>
            <SortTh label="Value" colKey="value" />
            <SortTh label="P&L" colKey="pnl" />
            <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#3E5070] cursor-pointer select-none" onClick={() => toggleSort("roi")}>
              ROI {sortKey === "roi" ? (sortAsc ? "↑" : "↓") : ""}
            </th>
            <th className="hidden xl:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#3E5070]">
              Net After Fee
            </th>
            <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#3E5070] cursor-pointer select-none" onClick={() => toggleSort("liquidity")}>
              Liquidity {sortKey === "liquidity" ? (sortAsc ? "↑" : "↓") : ""}
            </th>
            <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#3E5070] cursor-pointer select-none" onClick={() => toggleSort("risk")}>
              Risk {sortKey === "risk" ? (sortAsc ? "↑" : "↓") : ""}
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[#162035]">
          {rows.map(({ asset, metrics: m }) => {
            const pnlColor =
              m.unrealizedPnLCents > 0
                ? "text-[#4ADE80]"
                : m.unrealizedPnLCents < 0
                  ? "text-[#F87171]"
                  : "text-[#4E6080]";
            const roiColor =
              m.annualizedROI > 0
                ? "text-[#4ADE80]"
                : m.annualizedROI < 0
                  ? "text-[#F87171]"
                  : "text-[#4E6080]";

            return (
              <tr
                key={asset.id}
                onClick={() => router.push(`/asset/${asset.id}`)}
                className="cursor-pointer transition-colors hover:bg-[#162035]"
              >
                <td className="px-4 py-3 font-medium text-[#E8F0FF]">
                  <div className="flex items-center gap-3">
                    {asset.imageThumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.imageThumbnailUrl}
                        alt=""
                        className="h-10 w-8 shrink-0 rounded object-contain bg-slate-800"
                      />
                    ) : asset.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.imageUrl}
                        alt=""
                        className="h-10 w-8 shrink-0 rounded object-contain bg-slate-800"
                      />
                    ) : null}
                    <div>
                      <div className="leading-tight">{asset.name}</div>
                      {asset.grade !== undefined && (
                        <span className="text-xs text-amber-400">PSA {asset.grade}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="hidden md:table-cell px-4 py-3 text-[#4E6080]">
                  {ASSET_CLASS_LABELS[asset.assetClass] ?? asset.assetClass}
                </td>
                <td className="hidden lg:table-cell px-4 py-3 tabular-nums text-[#B0C4DE]">
                  {m.unitsHeld}
                </td>
                <td className="px-4 py-3 tabular-nums text-[#E8F0FF]">
                  {fmtCents(m.currentValueCents, asset.currency)}
                </td>
                <td className={clsx("px-4 py-3 tabular-nums font-medium", pnlColor)}>
                  {fmtCents(m.unrealizedPnLCents, asset.currency)}
                  <div className="text-xs opacity-75">
                    {formatPct(m.simpleROI)}
                  </div>
                </td>
                <td className={clsx("hidden sm:table-cell px-4 py-3 tabular-nums font-medium", roiColor)}>
                  {formatROI(m.annualizedROI)}
                </td>
                <td className="hidden xl:table-cell px-4 py-3 tabular-nums text-[#B0C4DE]">
                  {fmtCents(m.netValueAfterFeeCents, asset.currency)}
                </td>
                <td className="hidden lg:table-cell px-4 py-3">
                  <LiquidityBadge days={asset.liquidityDays} />
                </td>
                <td className="hidden lg:table-cell px-4 py-3">
                  <RiskBar score={asset.riskScore} />
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  {m.unitsHeld > 0 && (
                    <button
                      onClick={() => setSellAsset(asset)}
                      className="rounded-md bg-red-600/20 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-600/40 hover:text-red-300 transition-colors whitespace-nowrap"
                    >
                      Продать
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sellAsset && (
        <SellAssetModal asset={sellAsset} onClose={() => setSellAsset(null)} />
      )}
    </div>
  );
}

function LiquidityBadge({ days }: { days: number }) {
  const color =
    days <= 3
      ? "bg-emerald-500/20 text-emerald-300"
      : days <= 14
        ? "bg-[#F59E0B]/20 text-[#FCD34D]"
        : days <= 60
          ? "bg-amber-500/20 text-amber-300"
          : "bg-red-500/20 text-red-300";

  const label =
    days <= 3
      ? "Instant"
      : days <= 14
        ? `${days}d`
        : days <= 60
          ? `${days}d`
          : `${days}d`;

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        color,
      )}
    >
      {label}
    </span>
  );
}

function RiskBar({ score }: { score: number }) {
  const color =
    score < 30
      ? "bg-[#4ADE80]"
      : score < 60
        ? "bg-[#F59E0B]"
        : "bg-[#F87171]";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#1C2640]">
        <div
          className={clsx("h-full rounded-full", color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="fm text-xs tabular-nums text-[#3E5070]">{score}</span>
    </div>
  );
}
