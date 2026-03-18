"use client";

import { useState, useEffect } from "react";
import { clsx } from "clsx";
import type { EbaySoldData, SoldItem } from "@/app/api/ebay/sold/route";

interface Props {
  query: string;
  currency?: string;
}

function fmt(price: number | null, currency: string): string {
  if (price === null) return "—";
  const sym = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  return `${sym}${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch {
    return iso;
  }
}

// Mini sparkline for price history
function PriceSparkline({ sales, currency }: { sales: SoldItem[]; currency: string }) {
  if (sales.length < 3) return null;

  const sorted = [...sales].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const prices = sorted.map((s) => s.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const W = 280;
  const H = 60;
  const pad = 4;

  const points = prices.map((p, i) => {
    const x = pad + ((W - pad * 2) * i) / (prices.length - 1);
    const y = H - pad - ((p - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(" ");
  const areaPoints = `${pad},${H - pad} ${polyline} ${W - pad},${H - pad}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      <polygon points={areaPoints} fill="rgba(16,185,129,0.08)" />
      <polyline
        points={polyline}
        fill="none"
        stroke="#10b981"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* hover dots */}
      {prices.map((p, i) => {
        const [x, y] = (points[i] ?? "0,0").split(",").map(Number);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="2"
            fill="#10b981"
            className="opacity-60"
          >
            <title>{`${formatDate(sorted[i]?.date ?? "")} — ${fmt(p, currency)}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

export function EbaySoldPanel({ query, currency = "USD" }: Props) {
  const [data, setData] = useState<EbaySoldData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError(null);
    fetch(`/api/ebay/sold?q=${encodeURIComponent(query)}&currency=${currency}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((d: EbaySoldData) => {
        setData(d);
      })
      .catch(() => setError("Could not load eBay data"))
      .finally(() => setLoading(false));
  }, [query, currency]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-300">eBay Sold Prices</span>
          <div className="h-3 w-3 animate-spin rounded-full border border-slate-700 border-t-sky-400" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-3 rounded bg-slate-800 animate-pulse" style={{ width: `${60 + i * 10}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const visibleSales = showAll ? data.recentSales : data.recentSales.slice(0, 8);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-300">eBay Sold Prices</span>
          {data.source === "simulated" && (
            <span className="rounded-full border border-amber-700/40 bg-amber-900/20 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
              DEMO
            </span>
          )}
        </div>
        <span className="text-xs text-slate-600">
          {data.totalSales.toLocaleString()} sales
        </span>
      </div>

      {/* Price range stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-800/60 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Trending</p>
          <p className="mt-1 text-base font-bold text-emerald-400">
            {fmt(data.trendingPrice, data.currency)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800/60 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Lowest</p>
          <p className="mt-1 text-base font-bold text-slate-300">
            {fmt(data.lowestPrice, data.currency)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800/60 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Highest</p>
          <p className="mt-1 text-base font-bold text-slate-300">
            {fmt(data.highestPrice, data.currency)}
          </p>
        </div>
      </div>

      {/* Sparkline chart */}
      {data.recentSales.length >= 3 && (
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-600">
            Price History ({data.recentSales.length} recent sales)
          </p>
          <div className="rounded-lg bg-slate-800/40 px-2 py-1">
            <PriceSparkline sales={data.recentSales} currency={data.currency} />
          </div>
        </div>
      )}

      {/* Recent sales table */}
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-600">
          Recent Sales
        </p>
        <div className="space-y-1">
          {visibleSales.map((sale, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs text-slate-400" title={sale.title}>
                  {sale.title.length > 45 ? sale.title.slice(0, 45) + "…" : sale.title}
                </p>
              </div>
              <div className="ml-4 flex items-center gap-3 shrink-0">
                <span className="text-[11px] text-slate-600">{formatDate(sale.date)}</span>
                <span
                  className={clsx(
                    "text-xs font-semibold tabular-nums",
                    sale.price >= (data.trendingPrice ?? 0)
                      ? "text-emerald-400"
                      : "text-slate-300",
                  )}
                >
                  {fmt(sale.price, sale.currency)}
                </span>
              </div>
            </div>
          ))}
        </div>
        {data.recentSales.length > 8 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-2 w-full rounded-lg py-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            {showAll
              ? "Show less ↑"
              : `Show all ${data.recentSales.length} sales ↓`}
          </button>
        )}
      </div>

      {data.source === "simulated" && (
        <p className="text-[10px] text-slate-700 leading-relaxed">
          Demo data shown. Set <code className="font-mono">EBAY_APP_ID</code> in .env.local for real eBay sold listings.
        </p>
      )}
    </div>
  );
}
