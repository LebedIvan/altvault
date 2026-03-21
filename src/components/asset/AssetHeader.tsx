"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import { formatCents, ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from "@/lib/formatters";
import type { Asset } from "@/types/asset";
import type { AssetMetrics } from "@/types/portfolio";

interface Props {
  asset: Asset;
  metrics: AssetMetrics;
  refreshing: boolean;
  priceSource: string | null;
  refreshError: string | null;
  onRefreshPrice: () => void;
  onManualPrice: (priceCents: number) => void;
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

/** Source → display label + color */
const SOURCE_STYLE: Record<string, { label: string; color: string }> = {
  "Skinport":      { label: "Skinport",      color: "text-emerald-400" },
  "Steam Market":  { label: "Steam Market",  color: "text-sky-400"     },
  "Yahoo Finance": { label: "Yahoo Finance", color: "text-amber-400"   },
  "Scryfall":      { label: "Scryfall"  ,    color: "text-violet-400"  },
  "TCGdex":        { label: "TCGdex",        color: "text-blue-400"    },
  "Ручной ввод":   { label: "Ручной ввод",   color: "text-slate-400"   },
};

function isCardAsset(asset: Asset) {
  return asset.assetClass === "trading_cards" || asset.assetClass === "anime_cels";
}

function SourceBadge({ source }: { source: string }) {
  const style = SOURCE_STYLE[source] ?? { label: source, color: "text-slate-400" };
  return (
    <span className={clsx("flex items-center gap-1 text-xs font-medium", style.color)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {style.label}
    </span>
  );
}

export function AssetHeader({ asset, metrics, refreshing, priceSource, refreshError, onRefreshPrice, onManualPrice }: Props) {
  const [editMode, setEditMode]   = useState(false);
  const [editValue, setEditValue] = useState("");

  const pnl    = metrics.unrealizedPnLCents;
  const pnlPct = metrics.simpleROI;
  const isUp   = pnl >= 0;
  const color  = ASSET_CLASS_COLORS[asset.assetClass] ?? "#64748b";
  const icon   = CLASS_ICONS[asset.assetClass] ?? "📦";
  const hasImg = !!asset.imageUrl;
  const isCard = isCardAsset(asset);

  function openEdit() {
    setEditValue((asset.currentPriceCents / 100).toFixed(2));
    setEditMode(true);
  }

  function saveEdit() {
    const val = parseFloat(editValue.replace(",", "."));
    if (!isNaN(val) && val > 0) {
      onManualPrice(Math.round(val * 100));
    }
    setEditMode(false);
  }

  return (
    <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] overflow-hidden">
      <div className="flex flex-col gap-0 md:flex-row">

        {/* ── Image panel ── */}
        <div
          className={clsx(
            "relative flex shrink-0 items-center justify-center",
            isCard
              ? "md:w-48 lg:w-56 min-h-[180px] md:min-h-0"
              : "md:w-40 lg:w-48 min-h-[150px] md:min-h-0",
          )}
          style={{ background: `radial-gradient(circle at 50% 50%, ${color}18 0%, #0B1120 70%)` }}
        >
          {hasImg ? (
            <Image
              src={asset.imageUrl!}
              alt={asset.name}
              fill
              className={clsx(
                "object-contain p-3 drop-shadow-2xl transition-transform duration-300 hover:scale-105",
                isCard && "p-4",
              )}
              sizes="(max-width: 1024px) 100vw, 224px"
              priority
            />
          ) : asset.imageThumbnailUrl ? (
            <Image
              src={asset.imageThumbnailUrl}
              alt={asset.name}
              fill
              className="object-contain p-4 drop-shadow-xl"
              sizes="(max-width: 1024px) 100vw, 192px"
            />
          ) : (
            <span className="text-6xl opacity-30">{icon}</span>
          )}
          {hasImg && (
            <div
              className="absolute bottom-0 left-1/2 h-16 w-3/4 -translate-x-1/2 blur-2xl opacity-20 rounded-full"
              style={{ background: color }}
            />
          )}
        </div>

        {/* ── Info panel ── */}
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-6">
          {/* Breadcrumb */}
          <div className="mb-3 flex items-center gap-2 text-xs text-[#4E6080]">
            <Link href="/app" className="hover:text-[#B0C4DE] transition-colors">
              Портфель
            </Link>
            <span>/</span>
            <span className="capitalize" style={{ color }}>
              {ASSET_CLASS_LABELS[asset.assetClass] ?? asset.assetClass}
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="fb text-lg sm:text-2xl font-bold text-[#E8F0FF]">{asset.name}</h1>
              {asset.grade !== undefined && (
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/30">
                  PSA {asset.grade}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#4E6080]">
              {asset.externalId && (
                <span className="fm text-[#B0C4DE]">{asset.externalId}</span>
              )}
              {asset.condition && (
                <><span>·</span><span className="capitalize">{asset.condition.replace("_", " ")}</span></>
              )}
              <span>·</span>
              <span>{asset.currency}</span>
            </div>
          </div>

          {/* Price row */}
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="fm text-xs text-[#4E6080] mb-1">Текущая цена</p>

              {/* Price + edit */}
              {editMode ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditMode(false); }}
                    className="w-40 rounded-lg border border-[#1C2640] bg-[#080F1C] px-3 py-1.5 text-2xl font-black text-[#E8F0FF] tabular-nums focus:border-[#F59E0B]/50 focus:outline-none"
                  />
                  <button
                    onClick={saveEdit}
                    className="rounded-lg bg-[#F59E0B] px-3 py-1.5 text-sm font-semibold text-[#0B1120] hover:bg-[#FCD34D]"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="text-[#4E6080] hover:text-[#B0C4DE] text-sm"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="fb text-2xl sm:text-4xl font-black tabular-nums text-[#E8F0FF] leading-none">
                    {formatCents(asset.currentPriceCents, asset.currency)}
                  </p>
                  {/* Refresh button */}
                  <button
                    onClick={onRefreshPrice}
                    disabled={refreshing}
                    title="Обновить цену из источника"
                    className={clsx(
                      "flex items-center justify-center rounded-lg border px-2.5 py-1.5 text-sm transition-colors",
                      refreshing
                        ? "border-[#1C2640] text-[#2A3A50] cursor-not-allowed"
                        : "border-[#1C2640] text-[#4E6080] hover:border-[#F59E0B]/40 hover:text-[#F59E0B]",
                    )}
                  >
                    <span className={clsx("inline-block", refreshing && "animate-spin")}>↻</span>
                  </button>
                  {/* Manual edit button */}
                  <button
                    onClick={openEdit}
                    title="Ввести цену вручную"
                    className="flex items-center justify-center rounded-lg border border-[#1C2640] px-2.5 py-1.5 text-sm text-[#4E6080] hover:border-[#F59E0B]/40 hover:text-[#F59E0B] transition-colors"
                  >
                    ✎
                  </button>
                </div>
              )}

              {/* Source / error row */}
              <div className="mt-1.5 flex items-center gap-2 min-h-[20px]">
                {refreshError ? (
                  <span className="fm text-xs text-[#F59E0B]">{refreshError}</span>
                ) : priceSource ? (
                  <SourceBadge source={priceSource} />
                ) : (
                  <span className="fm text-xs text-[#2A3A50]">
                    Обновлено: {new Date(asset.updatedAt).toLocaleDateString("ru-RU")}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-4 sm:gap-6">
              <div>
                <p className="fm text-xs text-[#4E6080] mb-1">P&L</p>
                <p className={clsx("fb text-xl sm:text-2xl font-bold tabular-nums", isUp ? "text-[#4ADE80]" : "text-[#F87171]")}>
                  {isUp ? "+" : ""}{formatCents(pnl, asset.currency)}
                </p>
                <p className={clsx("fm text-xs", isUp ? "text-[#4ADE80]" : "text-[#F87171]")}>
                  {isUp ? "+" : ""}{(pnlPct * 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="fm text-xs text-[#4E6080] mb-1">В портфеле</p>
                <p className="fb text-xl sm:text-2xl font-bold text-[#E8F0FF] tabular-nums">{metrics.unitsHeld} шт.</p>
                <p className="fm text-xs text-[#4E6080]">{formatCents(metrics.totalCostCents, asset.currency)} вложено</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
