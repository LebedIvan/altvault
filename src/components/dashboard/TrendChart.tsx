"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AreaChart,
  Area,
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
import type { HistoryPoint } from "@/data/mockHistory";

interface Props {
  history: HistoryPoint[];
}

type Range = "MTD" | "YTD" | "1M" | "3M" | "6M" | "1Y" | "ALL";

const RANGES: Range[] = ["MTD", "YTD", "1M", "3M", "6M", "1Y", "ALL"];

const BENCHMARKS = [
  { key: "SP500",  label: "S&P 500", color: "#f59e0b" },
  { key: "BTC",    label: "Bitcoin", color: "#3b82f6" },
  { key: "GOLD",   label: "Gold",    color: "#d97706" },
  { key: "NASDAQ", label: "NASDAQ",  color: "#a78bfa" },
] as const;

type BenchmarkKey = typeof BENCHMARKS[number]["key"];

interface BenchmarkPoint { date: string; close: number; }

function rangeDays(r: Range): number {
  const now = new Date();
  switch (r) {
    case "MTD": return now.getDate() - 1;
    case "YTD": return Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000);
    case "1M":  return 30;
    case "3M":  return 90;
    case "6M":  return 180;
    case "1Y":  return 365;
    case "ALL": return Infinity;
  }
}

function formatEur(cents: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency", currency: "EUR",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(dateStr));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AbsTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const valueEntry = payload.find((p: any) => p.dataKey === "valueCents");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const costEntry  = payload.find((p: any) => p.dataKey === "costCents");
  const value: number = valueEntry?.value ?? 0;
  const cost: number  = costEntry?.value  ?? 0;
  const gain = value - cost;
  return (
    <div className="rounded-lg border border-[#1C2640] bg-[#0E1830] px-4 py-3 shadow-xl">
      <p className="fm mb-1 text-xs text-[#4E6080]">{label}</p>
      <p className="fb text-base font-bold text-[#E8F0FF]">{formatEur(value)}</p>
      <p className={clsx("fm text-sm font-medium", gain >= 0 ? "text-[#4ADE80]" : "text-[#F87171]")}>
        {gain >= 0 ? "+" : ""}{formatEur(gain)}
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PctTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#1C2640] bg-[#0E1830] px-4 py-3 shadow-2xl min-w-[160px]">
      <p className="fm mb-2 text-xs text-[#4E6080]">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
            <span className="fm text-[#8090A0]">{entry.name}</span>
          </div>
          <span className={clsx("fm font-semibold tabular-nums", (entry.value ?? 0) >= 0 ? "text-[#4ADE80]" : "text-[#F87171]")}>
            {(entry.value ?? 0) >= 0 ? "+" : ""}{Number(entry.value ?? 0).toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({ history }: Props) {
  const [range, setRange] = useState<Range>("1Y");
  const [activeBenchmarks, setActiveBenchmarks] = useState<Set<BenchmarkKey>>(new Set());
  const [benchmarkData, setBenchmarkData] = useState<Partial<Record<BenchmarkKey, BenchmarkPoint[]>>>({});
  const [loadingBenchmarks, setLoadingBenchmarks] = useState<Set<BenchmarkKey>>(new Set());

  const filtered = useMemo(() => {
    const days = rangeDays(range);
    if (!isFinite(days)) return history;
    return history.slice(-Math.max(1, days));
  }, [history, range]);

  const first = filtered[0]?.valueCents ?? 0;
  const last  = filtered.at(-1)?.valueCents ?? 0;
  const isUp  = last >= first;
  const color = isUp ? "#4ADE80" : "#F87171";

  const showBenchmarks = activeBenchmarks.size > 0;

  // Fetch benchmark data
  const fetchBenchmark = useCallback(async (key: BenchmarkKey) => {
    if (benchmarkData[key]) return;
    setLoadingBenchmarks((s) => new Set(s).add(key));
    try {
      const res = await fetch(`/api/benchmark/${key}?range=${range}`);
      if (!res.ok) return;
      const data = (await res.json()) as { points: BenchmarkPoint[] };
      setBenchmarkData((prev) => ({ ...prev, [key]: data.points }));
    } catch { /* silently fail */ } finally {
      setLoadingBenchmarks((s) => { const n = new Set(s); n.delete(key); return n; });
    }
  }, [benchmarkData, range]);

  // Invalidate cache on range change
  useEffect(() => { setBenchmarkData({}); }, [range]);

  // Fetch active benchmarks when range changes
  useEffect(() => {
    for (const key of Array.from(activeBenchmarks)) void fetchBenchmark(key);
  }, [activeBenchmarks, range, fetchBenchmark]);

  function toggleBenchmark(key: BenchmarkKey) {
    setActiveBenchmarks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else { next.add(key); void fetchBenchmark(key); }
      return next;
    });
  }

  // Build % normalized chart data for benchmark comparison mode
  const pctChartData = useMemo(() => {
    if (!showBenchmarks || filtered.length === 0) return [];
    const baseValue = filtered[0]?.valueCents ?? 0;
    const merged = new Map<string, Record<string, number>>();

    // Portfolio % return
    for (const p of filtered) {
      const pct = baseValue > 0 ? ((p.valueCents - baseValue) / baseValue) * 100 : 0;
      merged.set(p.date, { portfolio: pct });
    }

    const startDate = filtered[0]?.date;
    const endDate   = filtered.at(-1)?.date;

    for (const key of Array.from(activeBenchmarks)) {
      const bData = benchmarkData[key as BenchmarkKey];
      if (!bData?.length) continue;
      const sliced = bData.filter(
        (p) => (!startDate || p.date >= startDate) && (!endDate || p.date <= endDate),
      );
      const base = sliced[0]?.close;
      if (!base) continue;
      for (const p of sliced) {
        const existing = merged.get(p.date) ?? {};
        existing[key] = ((p.close - base) / base) * 100;
        merged.set(p.date, existing);
      }
    }

    return Array.from(merged.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }));
  }, [filtered, showBenchmarks, activeBenchmarks, benchmarkData]);

  // X-axis ticks
  const absStep = Math.max(1, Math.floor(filtered.length / 6));
  const absTicks = filtered.filter((_, i) => i % absStep === 0 || i === filtered.length - 1).map((p) => p.date);

  const pctStep = Math.max(1, Math.floor(pctChartData.length / 6));
  const pctTicks = pctChartData.filter((_, i) => i % pctStep === 0 || i === pctChartData.length - 1).map((p) => p.date);

  if (history.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center fm text-sm text-[#2A3A50]">
        Добавьте активы — график построится автоматически
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Range selector */}
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={clsx(
                "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                range === r
                  ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25"
                  : "text-[#4E6080] hover:text-[#B0C4DE]",
              )}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Benchmark pills */}
        <div className="flex items-center gap-1.5">
          <span className="fm text-xs text-[#3E5070] mr-1">vs</span>
          {BENCHMARKS.map((b) => {
            const active  = activeBenchmarks.has(b.key);
            const loading = loadingBenchmarks.has(b.key);
            return (
              <button
                key={b.key}
                onClick={() => toggleBenchmark(b.key)}
                className={clsx(
                  "flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all",
                  active
                    ? "border-transparent text-white"
                    : "border-[#1C2640] text-[#3E5070] hover:border-[#2A3A50] hover:text-[#B0C4DE]",
                )}
                style={active ? { background: b.color + "22", borderColor: b.color + "66" } : {}}
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
      {showBenchmarks ? (
        /* % return mode with benchmark overlays */
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={pctChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1C2640" vertical={false} />
            <XAxis dataKey="date" ticks={pctTicks} tickFormatter={formatDate}
              tick={{ fill: "#4E6080", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`}
              tick={{ fill: "#4E6080", fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
            <Tooltip content={<PctTooltip />} />
            <ReferenceLine y={0} stroke="#334155" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="portfolio" name="Портфель"
              stroke={color} strokeWidth={2.5} dot={false}
              activeDot={{ r: 4, stroke: "#0B1120", strokeWidth: 2 }} />
            {BENCHMARKS.filter((b) => activeBenchmarks.has(b.key)).map((b) => (
              <Line key={b.key} type="monotone" dataKey={b.key} name={b.label}
                stroke={b.color} strokeWidth={1.5} dot={false}
                strokeOpacity={0.8} connectNulls activeDot={{ r: 3 }} />
            ))}
            <Legend iconType="plainline" iconSize={16}
              formatter={(v: string) => <span className="fm text-xs text-[#4E6080]">{v}</span>} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        /* Absolute value mode */
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={filtered} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="grad-value" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="grad-cost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#64748b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#64748b" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1C2640" vertical={false} />
            <XAxis dataKey="date" ticks={absTicks} tickFormatter={formatDate}
              tick={{ fill: "#4E6080", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v: number) => formatEur(v)}
              tick={{ fill: "#4E6080", fontSize: 11 }} axisLine={false} tickLine={false}
              width={80} domain={["auto", "auto"]} />
            <Tooltip content={<AbsTooltip />} />
            <Area type="monotone" dataKey="costCents" stroke="#475569" strokeWidth={1}
              strokeDasharray="4 4" fill="url(#grad-cost)" dot={false} activeDot={false} name="Вложено" />
            <Area type="monotone" dataKey="valueCents" stroke={color} strokeWidth={2.5}
              fill="url(#grad-value)" dot={false}
              activeDot={{ r: 4, fill: color, stroke: "#0B1120", strokeWidth: 2 }} name="Портфель" />
            <ReferenceLine y={filtered[0]?.costCents} stroke="#334155" strokeDasharray="3 3" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
