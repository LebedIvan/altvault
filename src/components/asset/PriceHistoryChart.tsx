"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from "recharts";
import { clsx } from "clsx";
import type { Asset } from "@/types/asset";
import { buildSingleAssetHistory } from "@/lib/portfolioHistory";

type Range = "MTD" | "YTD" | "1M" | "3M" | "6M" | "1Y" | "5Y" | "ALL";
const RANGES: Range[] = ["MTD", "YTD", "1M", "3M", "6M", "1Y", "5Y", "ALL"];

function rangeDays(r: Range): number {
  const now = new Date();
  switch (r) {
    case "MTD": return now.getDate() - 1;
    case "YTD": return Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000);
    case "1M":  return 30;
    case "3M":  return 90;
    case "6M":  return 180;
    case "1Y":  return 365;
    case "5Y":  return 1825;
    case "ALL": return Infinity;
  }
}

interface BenchmarkPoint {
  date: string;
  close: number;
}

const BENCHMARKS = [
  { key: "SP500",     label: "S&P 500",   color: "#f59e0b" },
  { key: "BTC",       label: "Bitcoin",   color: "#3b82f6" },
  { key: "GOLD",      label: "Gold",      color: "#d97706" },
  { key: "NASDAQ",    label: "NASDAQ",    color: "#a78bfa" },
  { key: "SILVER",    label: "Silver",    color: "#94a3b8" },
  { key: "PLATINUM",  label: "Platinum",  color: "#e2e8f0" },
  { key: "PALLADIUM", label: "Palladium", color: "#fb923c" },
] as const;

type BenchmarkKey = typeof BENCHMARKS[number]["key"];

/** Normalise a series to % return from its first point */
function toReturnPct(
  points: { date: string; value: number }[],
): { date: string; pct: number }[] {
  const base = points[0]?.value;
  if (!base || base === 0) return [];
  return points.map((p) => ({
    date: p.date,
    pct: ((p.value - base) / base) * 100,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 shadow-2xl min-w-[160px]">
      <p className="mb-2 text-xs text-slate-500">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-slate-400">{entry.name}</span>
          </div>
          <span
            className={clsx(
              "font-semibold tabular-nums",
              entry.value >= 0 ? "text-emerald-400" : "text-red-400",
            )}
          >
            {entry.value >= 0 ? "+" : ""}{Number(entry.value).toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  asset?: Asset;
  /** Override the computed history — used when data comes from outside (e.g. eBay sold for LEGO pages) */
  historyOverride?: { date: string; valueCents: number }[];
  /** Display name shown in chart legend (used with historyOverride) */
  name?: string;
}

/** Detect which real-price benchmark to use for this asset (commodities only). */
function detectAutoBenchmark(asset: Asset): BenchmarkKey | null {
  if (asset.assetClass !== "commodities") return null;
  const n = asset.name.toUpperCase();
  if (n.includes("GOLD"))      return "GOLD";
  if (n.includes("SILVER"))    return "SILVER";
  if (n.includes("PLATINUM"))  return "PLATINUM";
  if (n.includes("PALLADIUM")) return "PALLADIUM";
  return null;
}

export function PriceHistoryChart({ asset, historyOverride, name }: Props) {
  const [range, setRange] = useState<Range>("1Y");
  const [activeBenchmarks, setActiveBenchmarks] = useState<Set<BenchmarkKey>>(
    new Set(["SP500"] as BenchmarkKey[]),
  );
  const [benchmarkData, setBenchmarkData] = useState<
    Partial<Record<BenchmarkKey, BenchmarkPoint[]>>
  >({});
  const [loadingBenchmarks, setLoadingBenchmarks] = useState<Set<BenchmarkKey>>(new Set());

  // Real-price benchmark for supported asset types (e.g. GOLD for gold commodities)
  const autoBenchmarkKey = asset ? detectAutoBenchmark(asset) : null;

  // Fetch benchmark data
  const fetchBenchmark = useCallback(
    async (key: BenchmarkKey) => {
      if (benchmarkData[key]) return;
      setLoadingBenchmarks((s) => new Set(s).add(key));
      try {
        const res = await fetch(`/api/benchmark/${key}?range=${range}`);
        if (!res.ok) return;
        const data = (await res.json()) as { points: BenchmarkPoint[] };
        setBenchmarkData((prev) => ({ ...prev, [key]: data.points }));
      } catch {
        // silently fail
      } finally {
        setLoadingBenchmarks((s) => {
          const next = new Set(s);
          next.delete(key);
          return next;
        });
      }
    },
    [benchmarkData, range],
  );

  // Auto-fetch real price data for supported asset types
  useEffect(() => {
    if (autoBenchmarkKey) void fetchBenchmark(autoBenchmarkKey);
  }, [autoBenchmarkKey, fetchBenchmark]);

  useEffect(() => {
    for (const key of Array.from(activeBenchmarks)) {
      void fetchBenchmark(key);
    }
  }, [activeBenchmarks, range, fetchBenchmark]);

  // Invalidate cache on range change
  useEffect(() => {
    setBenchmarkData({});
  }, [range]);

  // Asset's own % return history
  const assetHistory = historyOverride ?? (asset ? buildSingleAssetHistory(asset) : []);
  const days = rangeDays(range);
  const sliced = isFinite(days) ? assetHistory.slice(-Math.max(1, days)) : assetHistory;

  // Use real market data for commodities (GOLD → Yahoo GC=F), else linear interpolation
  const realPoints = autoBenchmarkKey ? benchmarkData[autoBenchmarkKey] : undefined;
  const usingRealData = !!realPoints && realPoints.length > 0;
  const assetPct = usingRealData
    ? toReturnPct(realPoints!.map((p) => ({ date: p.date, value: p.close })))
    : toReturnPct(sliced.map((p) => ({ date: p.date, value: p.valueCents })));

  function toggleBenchmark(key: BenchmarkKey) {
    setActiveBenchmarks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else {
        next.add(key);
        void fetchBenchmark(key);
      }
      return next;
    });
  }

  // Merge asset + benchmarks into one series indexed by date
  const assetMap = new Map(assetPct.map((p) => [p.date, p.pct]));
  const startDate = assetPct[0]?.date;
  const endDate = assetPct.at(-1)?.date;

  // Build merged data
  const mergedMap = new Map<string, Record<string, number>>();
  for (const p of assetPct) {
    mergedMap.set(p.date, { asset: p.pct });
  }

  for (const key of Array.from(activeBenchmarks)) {
    const bData = benchmarkData[key as BenchmarkKey];
    if (!bData || bData.length === 0) continue;

    // Slice to same date range as asset
    const filtered = bData.filter(
      (p: BenchmarkPoint) =>
        (!startDate || p.date >= startDate) &&
        (!endDate   || p.date <= endDate),
    );
    const base = filtered[0]?.close;
    if (!base) continue;

    for (const p of filtered) {
      const existing = mergedMap.get(p.date) ?? {};
      existing[key] = ((p.close - base) / base) * 100;
      mergedMap.set(p.date, existing);
    }
  }

  const chartData = Array.from(mergedMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));

  // Stats
  const firstPct = assetPct[0]?.pct ?? 0;
  const lastPct  = assetPct.at(-1)?.pct ?? 0;
  const totalReturn = lastPct - firstPct;
  const minPct = Math.min(...assetPct.map((p) => p.pct));
  const maxPct = Math.max(...assetPct.map((p) => p.pct));

  const isUp = totalReturn >= 0;

  // X-axis ticks
  const step = Math.max(1, Math.floor(chartData.length / 6));
  const ticks = chartData
    .filter((_, i) => i % step === 0 || i === chartData.length - 1)
    .map((p) => p.date);

  function fmtDate(d: string) {
    return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(
      new Date(d),
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      {/* Title row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-300">История цены</h2>

        <div className="flex items-center gap-3">
          {/* Stats */}
          {assetPct.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                {startDate && fmtDate(startDate)} – {endDate && fmtDate(endDate)}
              </span>
              <span className={clsx("font-semibold", isUp ? "text-emerald-400" : "text-red-400")}>
                {isUp ? "▲" : "▼"} {Math.abs(totalReturn).toFixed(2)}%
              </span>
              <span className="text-amber-500">max: {maxPct.toFixed(2)}%</span>
              <span className="text-red-500/70">min: {minPct.toFixed(2)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Range + benchmark selectors */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {/* Range */}
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={clsx(
                "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                range === r
                  ? "bg-slate-700 text-white"
                  : "text-slate-500 hover:text-slate-300",
              )}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Benchmark pills */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-600 mr-1">Бенчмарки</span>
          {BENCHMARKS.filter((b) => b.key !== autoBenchmarkKey).map((b) => {
            const active = activeBenchmarks.has(b.key);
            const loading = loadingBenchmarks.has(b.key);
            return (
              <button
                key={b.key}
                onClick={() => toggleBenchmark(b.key)}
                className={clsx(
                  "flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all",
                  active
                    ? "border-transparent text-white"
                    : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300",
                )}
                style={active ? { background: b.color + "33", borderColor: b.color + "66" } : {}}
              >
                {loading && <span className="animate-spin text-xs">↻</span>}
                <span style={active ? { color: b.color } : {}}>●</span>
                {b.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      {assetPct.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-600">
          Нет данных для отображения
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="date"
              ticks={ticks}
              tickFormatter={fmtDate}
              tick={{ fill: "#475569", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`}
              tick={{ fill: "#475569", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#334155" strokeDasharray="4 4" />

            {/* Asset line */}
            <Line
              type="monotone"
              dataKey="asset"
              name={(name ?? asset?.name ?? "").slice(0, 24)}
              stroke={isUp ? "#10b981" : "#ef4444"}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, stroke: "#0f172a", strokeWidth: 2 }}
            />

            {/* Benchmark lines */}
            {BENCHMARKS.filter((b) => activeBenchmarks.has(b.key)).map((b) => (
              <Line
                key={b.key}
                type="monotone"
                dataKey={b.key}
                name={b.label}
                stroke={b.color}
                strokeWidth={1.5}
                dot={false}
                strokeOpacity={0.8}
                connectNulls={true}
                activeDot={{ r: 3 }}
              />
            ))}

            <Legend
              iconType="plainline"
              iconSize={16}
              formatter={(value: string) => (
                <span className="text-xs text-slate-400">{value}</span>
              )}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Chart note */}
      <p className="mt-2 text-xs text-slate-600">
        {historyOverride
          ? "📦 История цен из eBay sold listings. Бенчмарки от Yahoo Finance, нормализованы к той же стартовой точке."
          : usingRealData
            ? "✓ Реальные рыночные данные (Yahoo Finance)."
            : "⚠ Симулированная история цены — промежуточные значения не соответствуют реальным сделкам на рынке. Только цена покупки и текущая цена являются реальными."}
      </p>

      {/* Suppress unused var */}
      {void assetMap}
    </div>
  );
}
