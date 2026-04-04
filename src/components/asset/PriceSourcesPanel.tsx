"use client";

import { useState, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import type { PriceSource, SoldItem } from "@/lib/marketSources";

interface PriceSourcesResponse {
  sources: PriceSource[];
  fetchedAt: string;
}

interface Props {
  assetClass: string;
  externalId?: string | null;
  name: string;
  currency?: string;
  onUsePrice?: (cents: number) => void;
  /** Called once eBay sold history loads — used to populate the price history chart */
  onHistoryData?: (points: { date: string; valueCents: number }[]) => void;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtCents(cents: number | null | undefined, currency: string): string {
  if (cents == null) return "—";
  const sym = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  return `${sym}${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return iso; }
}

function relativeTime(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30)  return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ─── Chart history builder ────────────────────────────────────────────────────
// Converts raw eBay sold items → smooth daily series for PriceHistoryChart.
// Steps: deduplicate by date (median per day) → filter outliers (IQR) → interpolate gaps.

function buildChartHistory(soldItems: SoldItem[]): { date: string; valueCents: number }[] {
  // 1. Group by date, take median per day
  const byDate = new Map<string, number[]>();
  for (const item of soldItems) {
    if (item.price <= 0) continue;
    const d = item.date.slice(0, 10);
    const arr = byDate.get(d) ?? [];
    arr.push(item.price);
    byDate.set(d, arr);
  }
  if (byDate.size === 0) return [];

  const dailyPts = Array.from(byDate.entries())
    .map(([date, prices]) => {
      const sorted = [...prices].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
      return { date, valueCents: Math.round(median * 100) };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // 2. Filter outliers via IQR (keep values within Q1 − 2×IQR … Q3 + 2×IQR)
  const vals = dailyPts.map((p) => p.valueCents).sort((a, b) => a - b);
  const q1   = vals[Math.floor(vals.length * 0.25)] ?? 0;
  const q3   = vals[Math.floor(vals.length * 0.75)] ?? 0;
  const iqr  = q3 - q1;
  const lo   = q1 - 2 * iqr;
  const hi   = q3 + 2 * iqr;
  const filtered = iqr > 0 ? dailyPts.filter((p) => p.valueCents >= lo && p.valueCents <= hi) : dailyPts;
  if (filtered.length === 0) return dailyPts;

  // 3. Linear interpolation to fill date gaps
  const result: { date: string; valueCents: number }[] = [];
  for (let i = 0; i < filtered.length - 1; i++) {
    const a = filtered[i]!;
    const b = filtered[i + 1]!;
    result.push(a);
    const aMs = new Date(a.date).getTime();
    const bMs = new Date(b.date).getTime();
    const days = Math.round((bMs - aMs) / 86_400_000);
    for (let d = 1; d < days; d++) {
      const t    = d / days;
      const date = new Date(aMs + d * 86_400_000).toISOString().slice(0, 10);
      result.push({ date, valueCents: Math.round(a.valueCents + t * (b.valueCents - a.valueCents)) });
    }
  }
  result.push(filtered[filtered.length - 1]!);
  return result;
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function PriceSparkline({ sales }: { sales: SoldItem[] }) {
  if (sales.length < 3) return null;
  const sorted = [...sales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const prices = sorted.map((s) => s.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 280; const H = 56; const pad = 4;
  const pts = prices.map((p, i) => {
    const x = pad + ((W - pad * 2) * i) / (prices.length - 1);
    const y = H - pad - ((p - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  });
  const area = `${pad},${H - pad} ${pts.join(" ")} ${W - pad},${H - pad}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      <polygon points={area} fill="rgba(16,185,129,0.08)" />
      <polyline points={pts.join(" ")} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round" />
      {pts.map((pt, i) => {
        const [x, y] = pt.split(",").map(Number);
        return (
          <circle key={i} cx={x} cy={y} r="2" fill="#10b981" className="opacity-60">
            <title>{`${fmtDate(sorted[i]?.date ?? "")} — $${sorted[i]?.price.toFixed(2)}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

// ─── eBay sold tab content ────────────────────────────────────────────────────

function EbayTabContent({ source }: { source: PriceSource }) {
  const [showAll, setShowAll] = useState(false);
  const sales = [...(source.recentSales ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const visible = showAll ? sales : sales.slice(0, 8);
  const currency = source.currency;
  const trending = source.meta?.avgCents;

  // Handle non-ok statuses first
  if (source.status === "no_key") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          eBay API key not configured. Set <code className="rounded bg-slate-800 px-1 py-0.5 text-[10px] text-slate-400">EBAY_APP_ID</code> to see sold prices.
        </p>
        {source.meta?.url && (
          <a href={source.meta.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-sky-500 hover:text-sky-400 transition-colors">
            Search eBay sold listings ↗
          </a>
        )}
      </div>
    );
  }

  if (source.status === "unavailable") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-500">No recent sold listings found on eBay for this item.</p>
        {source.meta?.url && (
          <a href={source.meta.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-sky-500 hover:text-sky-400 transition-colors">
            Search manually on eBay ↗
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Trending",  value: source.priceCents, highlight: true },
          { label: "Lowest",    value: source.meta?.minCents },
          { label: "Highest",   value: source.meta?.maxCents },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="rounded-xl bg-slate-800/60 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
            <p className={clsx("mt-1 text-base font-bold", highlight ? "text-emerald-400" : "text-slate-300")}>
              {fmtCents(value ?? null, currency)}
            </p>
          </div>
        ))}
      </div>

      {/* Sparkline */}
      {sales.length >= 3 && (
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-600">
            Price history ({sales.length} recent sales)
          </p>
          <div className="rounded-lg bg-slate-800/40 px-2 py-1">
            <PriceSparkline sales={sales} />
          </div>
        </div>
      )}

      {/* Transaction list */}
      {sales.length > 0 ? (
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-600">Recent sales</p>
          <div className="space-y-0.5">
            {visible.map((sale, i) => {
              const inner = (
                <>
                  <p className="min-w-0 flex-1 truncate text-xs text-slate-400" title={sale.title}>
                    {sale.title.length > 48 ? sale.title.slice(0, 48) + "…" : sale.title}
                  </p>
                  <div className="ml-4 flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-slate-600">{relativeTime(sale.date)}</span>
                    <span className={clsx(
                      "text-xs font-semibold tabular-nums",
                      sale.price * 100 >= (trending ?? 0) ? "text-emerald-400" : "text-slate-300",
                    )}>
                      {fmtCents(Math.round(sale.price * 100), sale.currency)}
                    </span>
                  </div>
                </>
              );
              return sale.url ? (
                <a key={i} href={sale.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-800/40 transition-colors">
                  {inner}
                </a>
              ) : (
                <div key={i} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-800/40 transition-colors">
                  {inner}
                </div>
              );
            })}
          </div>
          {sales.length > 8 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-2 w-full rounded-lg py-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              {showAll ? "Show less ↑" : `Show all ${sales.length} sales ↓`}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">No recent sold listings found.</p>
          {source.meta?.url && (
            <a href={source.meta.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-sky-500 hover:text-sky-400 transition-colors">
              Search on eBay ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Generic source tab content ────────────────────────────────────────────────

function GenericTabContent({ source, onUsePrice }: { source: PriceSource; onUsePrice?: (c: number) => void }) {
  const [showAll, setShowAll] = useState(false);

  if (source.status === "no_key") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-500">API key not configured for this source.</p>
        {source.meta?.url && (
          <a href={source.meta.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-sky-500 hover:text-sky-400 transition-colors">
            View on {source.label} ↗
          </a>
        )}
      </div>
    );
  }
  const sales = source.recentSales ?? [];

  const salesSorted = [...sales].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  if ((source.status === "unavailable" || source.priceCents == null) && salesSorted.length === 0) {
    return <p className="text-xs text-slate-500">Price data unavailable from this source.</p>;
  }
  const visible = showAll ? salesSorted : salesSorted.slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Price */}
      <div className="flex items-center gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Price</p>
          <p className="text-2xl font-bold text-emerald-400">
            {fmtCents(source.priceCents, source.currency)}
          </p>
        </div>
        {onUsePrice && source.priceCents && (
          <button
            onClick={() => onUsePrice(source.priceCents!)}
            className="ml-auto rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-2 text-xs font-semibold text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors"
          >
            Use this price
          </button>
        )}
      </div>

      {/* Min / Max */}
      {(source.meta?.minCents != null || source.meta?.maxCents != null) && (
        <div className="grid grid-cols-2 gap-3">
          {source.meta.minCents != null && (
            <div className="rounded-xl bg-slate-800/60 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Min sold</p>
              <p className="mt-1 text-sm font-bold text-slate-300">{fmtCents(source.meta.minCents, source.currency)}</p>
            </div>
          )}
          {source.meta.maxCents != null && (
            <div className="rounded-xl bg-slate-800/60 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Max sold</p>
              <p className="mt-1 text-sm font-bold text-slate-300">{fmtCents(source.meta.maxCents, source.currency)}</p>
            </div>
          )}
        </div>
      )}

      {source.meta?.count != null && (
        <p className="text-[10px] text-slate-600">{source.meta.count.toLocaleString()} sales recorded</p>
      )}

      {/* Recent sales (e.g. Skinport history) */}
      {salesSorted.length >= 3 && (
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-600">
            Price history ({salesSorted.length} recent sales)
          </p>
          <div className="rounded-lg bg-slate-800/40 px-2 py-1">
            <PriceSparkline sales={salesSorted} />
          </div>
        </div>
      )}
      {salesSorted.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-600">Recent sales</p>
          <div className="space-y-0.5">
            {visible.map((sale, i) => {
              const inner = (
                <>
                  <p className="min-w-0 flex-1 truncate text-xs text-slate-400" title={sale.title}>
                    {sale.title.length > 48 ? sale.title.slice(0, 48) + "…" : sale.title}
                  </p>
                  <div className="ml-4 flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-slate-600">{relativeTime(sale.date)}</span>
                    <span className="text-xs font-semibold tabular-nums text-slate-300">
                      {fmtCents(Math.round(sale.price * 100), sale.currency)}
                    </span>
                  </div>
                </>
              );
              return sale.url ? (
                <a key={i} href={sale.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-800/40 transition-colors">
                  {inner}
                </a>
              ) : (
                <div key={i} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-800/40 transition-colors">
                  {inner}
                </div>
              );
            })}
          </div>
          {salesSorted.length > 8 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-2 w-full rounded-lg py-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              {showAll ? "Show less ↑" : `Show all ${salesSorted.length} sales ↓`}
            </button>
          )}
        </div>
      )}

      {source.meta?.url && (
        <a href={source.meta.url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-sky-500 hover:text-sky-400 transition-colors">
          View on {source.label} ↗
        </a>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PriceSourcesPanel({ assetClass, externalId, name, onUsePrice, onHistoryData }: Props) {
  const [sources, setSources] = useState<PriceSource[]>([]);
  const [active,  setActive]  = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    if (!name) return;
    const params = new URLSearchParams({
      assetClass,
      name,
      ...(externalId ? { externalId } : {}),
      ...(force ? { force: "true" } : {}),
    });
    const res = await fetch(`/api/prices/sources?${params}`);
    if (!res.ok) return;
    const data: PriceSourcesResponse = await res.json();
    setSources(data.sources);
    setFetchedAt(data.fetchedAt);
    if (!active && data.sources[0]) setActive(data.sources[0].key);

    // Pass eBay sold history to parent for the price history chart
    if (onHistoryData) {
      const ebaySrc = data.sources.find((s) => s.key === "ebay");
      const soldItems = ebaySrc?.recentSales ?? [];
      if (soldItems.length > 0) {
        onHistoryData(buildChartHistory(soldItems));
      }
    }
  }, [assetClass, externalId, name, active, onHistoryData]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [assetClass, externalId, name]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRefresh() {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }

  function handleUsePrice(cents: number) {
    onUsePrice?.(cents);
  }

  const activeSource = sources.find((s) => s.key === active);

  // ── Loading skeleton
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-300">Market Prices</span>
          <div className="h-3 w-3 animate-spin rounded-full border border-slate-700 border-t-sky-400" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-3 rounded bg-slate-800 animate-pulse" style={{ width: `${55 + i * 12}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (sources.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-300">Market Prices</span>
        <div className="flex items-center gap-2">
          {fetchedAt && (
            <span className="text-[10px] text-slate-700" title={new Date(fetchedAt).toLocaleString()}>
              Updated {relativeTime(fetchedAt)}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors disabled:opacity-50"
            title="Refresh prices"
          >
            {refreshing ? "↻ Loading…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* Source tabs */}
      <div className="flex gap-1 flex-wrap">
        {sources.map((src) => (
          <button
            key={src.key}
            onClick={() => setActive(src.key)}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              active === src.key
                ? "bg-slate-700 text-slate-200"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/60",
              src.status === "no_key" && "opacity-50",
            )}
          >
            {src.label}
            {src.priceCents != null && (
              <span className={clsx(
                "ml-1.5 font-semibold",
                active === src.key ? "text-emerald-400" : "text-slate-400",
              )}>
                {fmtCents(src.priceCents, src.currency)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {activeSource && (
        <div className="min-h-[80px]">
          {activeSource.key === "ebay" ? (
            <div className="space-y-4">
              <EbayTabContent source={activeSource} />
              {onUsePrice && activeSource.priceCents != null && (
                <button
                  onClick={() => handleUsePrice(activeSource.priceCents!)}
                  className="w-full rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-2 text-xs font-semibold text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors"
                >
                  Use eBay trending price: {fmtCents(activeSource.priceCents, activeSource.currency)}
                </button>
              )}
            </div>
          ) : (
            <GenericTabContent source={activeSource} onUsePrice={onUsePrice ? handleUsePrice : undefined} />
          )}
        </div>
      )}
    </div>
  );
}
