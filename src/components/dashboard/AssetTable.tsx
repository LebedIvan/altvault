"use client";

import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { formatCents, formatPct, formatROI, ASSET_CLASS_LABELS } from "@/lib/formatters";
import type { Asset } from "@/types/asset";
import type { AssetMetrics } from "@/types/portfolio";

interface Props {
  assets: Asset[];
  metrics: AssetMetrics[];
}

type SortKey = "name" | "value" | "pnl" | "roi" | "liquidity" | "risk";

import { useState } from "react";

export function AssetTable({ assets, metrics }: Props) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortAsc, setSortAsc] = useState(false);

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
          active ? "text-sky-400" : "text-slate-500 hover:text-slate-300",
        )}
      >
        {label} {active ? (sortAsc ? "↑" : "↓") : ""}
      </th>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800 bg-slate-900 text-sm">
        <thead>
          <tr className="bg-slate-950">
            <SortTh label="Asset" colKey="name" />
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Class
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Units
            </th>
            <SortTh label="Market Value" colKey="value" />
            <SortTh label="Unreal. P&L" colKey="pnl" />
            <SortTh label="Ann. ROI" colKey="roi" />
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Net After Fee
            </th>
            <SortTh label="Liquidity" colKey="liquidity" />
            <SortTh label="Risk" colKey="risk" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map(({ asset, metrics: m }) => {
            const pnlColor =
              m.unrealizedPnLCents > 0
                ? "text-emerald-400"
                : m.unrealizedPnLCents < 0
                  ? "text-red-400"
                  : "text-slate-400";
            const roiColor =
              m.annualizedROI > 0
                ? "text-emerald-400"
                : m.annualizedROI < 0
                  ? "text-red-400"
                  : "text-slate-400";

            return (
              <tr
                key={asset.id}
                onClick={() => router.push(`/asset/${asset.id}`)}
                className="cursor-pointer transition-colors hover:bg-slate-800/50"
              >
                <td className="px-4 py-3 font-medium text-white">
                  <div>{asset.name}</div>
                  {asset.grade !== undefined && (
                    <span className="text-xs text-amber-400">
                      PSA {asset.grade}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {ASSET_CLASS_LABELS[asset.assetClass] ?? asset.assetClass}
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-300">
                  {m.unitsHeld}
                </td>
                <td className="px-4 py-3 tabular-nums text-white">
                  {formatCents(m.currentValueCents, asset.currency)}
                </td>
                <td className={clsx("px-4 py-3 tabular-nums font-medium", pnlColor)}>
                  {formatCents(m.unrealizedPnLCents, asset.currency)}
                  <div className="text-xs opacity-75">
                    {formatPct(m.simpleROI)}
                  </div>
                </td>
                <td className={clsx("px-4 py-3 tabular-nums font-medium", roiColor)}>
                  {formatROI(m.annualizedROI)}
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-300">
                  {formatCents(m.netValueAfterFeeCents, asset.currency)}
                </td>
                <td className="px-4 py-3">
                  <LiquidityBadge days={asset.liquidityDays} />
                </td>
                <td className="px-4 py-3">
                  <RiskBar score={asset.riskScore} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LiquidityBadge({ days }: { days: number }) {
  const color =
    days <= 3
      ? "bg-emerald-500/20 text-emerald-300"
      : days <= 14
        ? "bg-sky-500/20 text-sky-300"
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
      ? "bg-emerald-500"
      : score < 60
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-700">
        <div
          className={clsx("h-full rounded-full", color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-slate-500">{score}</span>
    </div>
  );
}
