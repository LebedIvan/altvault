"use client";

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { clsx } from "clsx";

// ─── Seeded LCG for deterministic index history ───────────────────────────────
function makePrng(seed: number) {
  let s = seed >>> 0;
  return () => { s = Math.imul(1664525, s) + 1013904223; return (s >>> 0) / 0xffffffff; };
}

function buildIndexHistory(seed: number, days: number, startValue: number, volatility: number, drift: number) {
  const rng = makePrng(seed);
  const arr: { day: number; v: number }[] = [];
  let v = startValue;
  for (let i = days; i >= 0; i--) {
    v = v * (1 + drift / 365 + (rng() - 0.49) * volatility);
    arr.push({ day: i, v: Math.round(v * 10) / 10 });
  }
  return arr;
}

const INDICES = [
  { id: "ATPOKE",  label: "Vaulty Pokémon",  color: "#f59e0b", seed: 111, start: 1000, vol: 0.025, drift: 0.32 },
  { id: "ATMTG",   label: "Vaulty MTG Vintage", color: "#8b5cf6", seed: 222, start: 1000, vol: 0.018, drift: 0.15 },
  { id: "ATKNIFE", label: "Vaulty CS2 Knife",   color: "#ef4444", seed: 333, start: 1000, vol: 0.030, drift: 0.42 },
  { id: "ATPSA10", label: "Pokémon PSA 10 Vintage", color: "#10b981", seed: 444, start: 1000, vol: 0.022, drift: 0.55 },
  { id: "ATALT",   label: "Alt Composite Index",    color: "#3b82f6", seed: 555, start: 1000, vol: 0.016, drift: 0.28 },
];

const RANGES = [
  { label: "7D",  days: 7   },
  { label: "1M",  days: 30  },
  { label: "3M",  days: 90  },
  { label: "1Y",  days: 365 },
];

import { useState } from "react";

function IndexCard({ idx, history }: { idx: typeof INDICES[0]; history: { day: number; v: number }[] }) {
  const [range, setRange] = useState(1); // default 1M
  const rangeData = history.slice(0, RANGES[range]!.days + 1).reverse();
  const first = rangeData[0]?.v ?? 1;
  const last = rangeData[rangeData.length - 1]?.v ?? 1;
  const change = (last - first) / first;
  const isUp = change >= 0;
  const current = history[0]?.v ?? 1000;

  const chartData = rangeData.map((p, i) => ({ i, v: p.v }));

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-start justify-between mb-1">
        <div>
          <span className="text-xs font-mono font-bold text-slate-400">{idx.id}</span>
          <p className="text-xs text-slate-600 mt-0.5">{idx.label}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black tabular-nums text-white">
            {current.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </p>
          <p className={clsx("text-xs font-bold tabular-nums", isUp ? "text-emerald-400" : "text-red-400")}>
            {isUp ? "+" : ""}{(change * 100).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Mini range selector */}
      <div className="flex gap-1 mb-2">
        {RANGES.map((r, i) => (
          <button
            key={r.label}
            onClick={() => setRange(i)}
            className={clsx(
              "px-1.5 py-0.5 rounded text-xs font-medium transition-colors",
              range === i ? "bg-slate-700 text-white" : "text-slate-600 hover:text-slate-400",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={60}>
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${idx.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={idx.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={idx.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={["auto", "auto"]} hide />
          <XAxis dataKey="i" hide />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <div className="rounded bg-slate-800 border border-slate-700 px-2 py-1 text-xs text-white">
                  {(payload[0].value as number).toFixed(1)}
                </div>
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={idx.color}
            strokeWidth={1.5}
            fill={`url(#grad-${idx.id})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MarketIndices() {
  const allHistory = useMemo(
    () =>
      INDICES.map((idx) => ({
        idx,
        history: buildIndexHistory(idx.seed, 365, idx.start, idx.vol, idx.drift),
      })),
    [],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500">
          Market Indices
        </h2>
        <span className="text-xs text-slate-600">Base = 1000</span>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {allHistory.map(({ idx, history }) => (
          <IndexCard key={idx.id} idx={idx} history={history} />
        ))}
      </div>
    </div>
  );
}
