"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { clsx } from "clsx";
import type { HistoryPoint } from "@/data/mockHistory";

interface Props {
  history: HistoryPoint[];
}

type Range = "1M" | "3M" | "6M" | "1Y" | "ALL";

const RANGES: Range[] = ["1M", "3M", "6M", "1Y", "ALL"];

const RANGE_DAYS: Record<Range, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  "ALL": Infinity,
};

function formatEur(cents: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(
    new Date(dateStr),
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const value: number = payload[0]?.value ?? 0;
  const cost: number = payload[1]?.value ?? 0;
  const gain = value - cost;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 shadow-xl">
      <p className="mb-1 text-xs text-slate-500">{label}</p>
      <p className="text-base font-bold text-white">{formatEur(value)}</p>
      <p className={clsx("text-sm font-medium", gain >= 0 ? "text-emerald-400" : "text-red-400")}>
        {gain >= 0 ? "+" : ""}{formatEur(gain)}
      </p>
    </div>
  );
}

export function TrendChart({ history }: Props) {
  const [range, setRange] = useState<Range>("1Y");

  const filtered = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (!isFinite(days)) return history;
    return history.slice(-days);
  }, [history, range]);

  const first = filtered[0]?.valueCents ?? 0;
  const last  = filtered.at(-1)?.valueCents ?? 0;
  const isUp  = last >= first;
  const color = isUp ? "#10b981" : "#ef4444";

  // X-axis: show ~6 labels
  const step = Math.max(1, Math.floor(filtered.length / 6));
  const ticks = filtered
    .filter((_, i) => i % step === 0 || i === filtered.length - 1)
    .map((p) => p.date);

  if (history.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-slate-600">
        Добавьте активы — график построится автоматически
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Range selector */}
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

      {/* Chart */}
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

          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

          <XAxis
            dataKey="date"
            ticks={ticks}
            tickFormatter={formatDate}
            tick={{ fill: "#475569", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatEur(v)}
            tick={{ fill: "#475569", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={80}
            domain={["auto", "auto"]}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Cost basis reference */}
          <Area
            type="monotone"
            dataKey="costCents"
            stroke="#475569"
            strokeWidth={1}
            strokeDasharray="4 4"
            fill="url(#grad-cost)"
            dot={false}
            activeDot={false}
            name="Invertido"
          />

          {/* Portfolio value */}
          <Area
            type="monotone"
            dataKey="valueCents"
            stroke={color}
            strokeWidth={2.5}
            fill="url(#grad-value)"
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: "#0f172a", strokeWidth: 2 }}
            name="Valor"
          />

          <ReferenceLine
            y={filtered[0]?.costCents}
            stroke="#334155"
            strokeDasharray="3 3"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
