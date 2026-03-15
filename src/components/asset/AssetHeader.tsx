"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { formatCents, ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from "@/lib/formatters";
import type { Asset } from "@/types/asset";
import type { AssetMetrics } from "@/types/portfolio";

interface Props {
  asset: Asset;
  metrics: AssetMetrics;
}

const CLASS_ICONS: Record<string, string> = {
  trading_cards:   "🃏",
  lego:            "🧱",
  cs2_skins:       "🎮",
  music_royalties: "🎵",
  p2p_lending:     "💳",
  domain_names:    "🌐",
  anime_cels:      "🎌",
  commodities:     "🥈",
  sports_betting:  "⚽",
};

export function AssetHeader({ asset, metrics }: Props) {
  const pnl = metrics.unrealizedPnLCents;
  const pnlPct = metrics.simpleROI;
  const isUp = pnl >= 0;
  const color = ASSET_CLASS_COLORS[asset.assetClass] ?? "#64748b";
  const icon = CLASS_ICONS[asset.assetClass] ?? "📦";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-300 transition-colors">
          Портфель
        </Link>
        <span>/</span>
        <span className="capitalize" style={{ color }}>
          {ASSET_CLASS_LABELS[asset.assetClass] ?? asset.assetClass}
        </span>
      </div>

      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-lg"
            style={{ backgroundColor: color + "22", border: `1px solid ${color}44` }}
          >
            {icon}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{asset.name}</h1>
              {asset.grade !== undefined && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
                  PSA {asset.grade}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              {asset.externalId && (
                <span className="font-mono text-slate-400">{asset.externalId}</span>
              )}
              {asset.condition && (
                <>
                  <span>·</span>
                  <span className="capitalize">{asset.condition.replace("_", " ")}</span>
                </>
              )}
              <span>·</span>
              <span>{asset.currency}</span>
            </div>
          </div>
        </div>

        {/* Price block */}
        <div className="text-right">
          <p className="text-3xl font-black tabular-nums text-white">
            {formatCents(asset.currentPriceCents, asset.currency)}
          </p>
          <p className={clsx(
            "mt-1 text-sm font-semibold tabular-nums",
            isUp ? "text-emerald-400" : "text-red-400",
          )}>
            {isUp ? "+" : ""}{formatCents(pnl, asset.currency)}{" "}
            <span className="text-xs opacity-75">
              ({isUp ? "+" : ""}{(pnlPct * 100).toFixed(2)}%)
            </span>
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            Обновлено: {new Date(asset.updatedAt).toLocaleDateString("ru-RU")}
          </p>
        </div>
      </div>
    </div>
  );
}
