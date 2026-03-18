"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { useCurrency } from "@/store/currencyStore";
import { computeAssetMetrics } from "@/lib/calculations/pnl";
import { ASSET_CLASS_LABELS } from "@/lib/formatters";
import type { Asset } from "@/types/asset";

// ─── Deterministic daily change seeded by date + assetId ─────────────────────

function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function dailyChangeFraction(assetId: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashStr(today + assetId);
  // LCG step
  const v = Math.imul(1664525, seed) + 1013904223;
  const r = (v >>> 0) / 0xffffffff; // 0..1
  // Map to ±5% range, slightly biased toward positive
  return (r - 0.44) * 0.10;
}

// ─── Category icons (emoji + color) ──────────────────────────────────────────

const CLASS_ICONS: Record<string, { emoji: string; bg: string }> = {
  trading_cards:   { emoji: "🃏", bg: "#6366f1" },
  lego:            { emoji: "🧱", bg: "#f59e0b" },
  cs2_skins:       { emoji: "🔫", bg: "#ef4444" },
  music_royalties: { emoji: "🎵", bg: "#10b981" },
  p2p_lending:     { emoji: "💰", bg: "#3b82f6" },
  domain_names:    { emoji: "🌐", bg: "#8b5cf6" },
  anime_cels:      { emoji: "🎌", bg: "#ec4899" },
  commodities:     { emoji: "🪙", bg: "#f97316" },
  sports_betting:  { emoji: "🎯", bg: "#14b8a6" },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface MoverRow {
  asset: Asset;
  currentPriceCents: number;
  changeFraction: number;
  changeAbsCents: number;
}

interface PanelProps {
  title: string;
  rows: MoverRow[];
  isGainers: boolean;
  onViewAll: () => void;
}

function Panel({ title, rows, isGainers, onViewAll }: PanelProps) {
  const router = useRouter();
  const { fmtCents } = useCurrency();
  const color = isGainers ? "text-[#4ADE80]" : "text-[#F87171]";
  const arrow = isGainers ? "▲" : "▼";

  return (
    <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="fb text-sm font-semibold text-[#B0C4DE]">{title}</h2>
          <span className="fm text-[#2A3A50] text-xs cursor-default" title="Симулированные дневные изменения на основе данных портфеля">ⓘ</span>
        </div>
        <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#080F1C] text-[#3E5070] hover:bg-[#1C2640] hover:text-[#B0C4DE] transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </button>
      </div>

      {/* Rows */}
      <div className="space-y-1">
        {rows.map(({ asset, currentPriceCents, changeFraction, changeAbsCents }) => {
          const icon = CLASS_ICONS[asset.assetClass] ?? { emoji: "📦", bg: "#64748b" };
          const shortName = asset.name.length > 38 ? asset.name.slice(0, 38) + "…" : asset.name;
          const classLabel = ASSET_CLASS_LABELS[asset.assetClass] ?? asset.assetClass;

          return (
            <div
              key={asset.id}
              onClick={() => router.push(`/asset/${asset.id}`)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-[#162035] transition-colors group"
            >
              {/* Icon */}
              <div
                className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-lg"
                style={{ backgroundColor: icon.bg + "33", border: `1px solid ${icon.bg}55` }}
              >
                {asset.imageThumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.imageThumbnailUrl}
                    alt=""
                    className="h-9 w-9 rounded-xl object-contain"
                  />
                ) : (
                  <span style={{ color: icon.bg }}>{icon.emoji}</span>
                )}
              </div>

              {/* Name + class */}
              <div className="min-w-0 flex-1">
                <p className="fb text-sm font-medium text-[#E8F0FF] leading-tight truncate group-hover:text-[#F59E0B] transition-colors">
                  {shortName}
                </p>
                <p className="fm text-xs text-[#3E5070] truncate">{classLabel}</p>
              </div>

              {/* Price + change */}
              <div className="shrink-0 text-right">
                <p className="fm text-sm font-bold tabular-nums text-[#E8F0FF]">
                  {fmtCents(currentPriceCents, asset.currency)}
                </p>
                <p className={clsx("text-xs font-semibold tabular-nums", color)}>
                  {arrow} {Math.abs(changeFraction * 100).toFixed(2)}%{" "}
                  <span className="font-normal opacity-75">
                    ({isGainers ? "+" : "−"}{fmtCents(Math.abs(changeAbsCents), asset.currency)})
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <button
        onClick={onViewAll}
        className="mt-3 text-xs text-sky-500 hover:text-sky-400 transition-colors"
      >
        Посмотреть все →
      </button>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

interface Props {
  assets: Asset[];
  onViewAll: () => void;
}

export function TopMovers({ assets, onViewAll }: Props) {
  const rows = useMemo((): MoverRow[] => {
    const now = new Date();
    return assets
      .filter((a) => {
        const m = computeAssetMetrics(a, now);
        return m.unitsHeld > 0;
      })
      .map((asset) => {
        const changeFraction = dailyChangeFraction(asset.id);
        const changeAbsCents = Math.round(asset.currentPriceCents * Math.abs(changeFraction));
        return {
          asset,
          currentPriceCents: asset.currentPriceCents,
          changeFraction,
          changeAbsCents,
        };
      });
  }, [assets]);

  const gainers = useMemo(
    () => [...rows].filter((r) => r.changeFraction > 0).sort((a, b) => b.changeFraction - a.changeFraction).slice(0, 5),
    [rows],
  );
  const losers = useMemo(
    () => [...rows].filter((r) => r.changeFraction < 0).sort((a, b) => a.changeFraction - b.changeFraction).slice(0, 5),
    [rows],
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel
        title="Топ роста за день"
        rows={gainers}
        isGainers={true}
        onViewAll={onViewAll}
      />
      <Panel
        title="Топ падений за день"
        rows={losers}
        isGainers={false}
        onViewAll={onViewAll}
      />
    </div>
  );
}
