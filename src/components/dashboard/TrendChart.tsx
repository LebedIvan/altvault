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

type Range = "MTD" | "YTD" | "1M" | "3M" | "6M" | "1Y" | "ALL";

const RANGES: Range[] = ["MTD", "YTD", "1M", "3M", "6M", "1Y", "ALL"];

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
  // Find by dataKey — order in payload matches render order, not intuition
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

export function TrendChart({ history }: Props) {
  const [range, setRange] = useState<Range>("1Y");

  const filtered = useMemo(() => {
    const days = rangeDays(range);
    if (!isFinite(days)) return history;
    return history.slice(-Math.max(1, days));
  }, [history, range]);

  const first = filtered[0]?.valueCents ?? 0;
  const last  = filtered.at(-1)?.valueCents ?? 0;
  const isUp  = last >= first;
  const color = isUp ? "#4ADE80" : "#F87171";

  // X-axis: show ~6 labels
  const step = Math.max(1, Math.floor(filtered.length / 6));
  const ticks = filtered
    .filter((_, i) => i % step === 0 || i === filtered.length - 1)
    .map((p) => p.date);

  if (history.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center fm text-sm text-[#2A3A50]">
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
                ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25"
                : "text-[#4E6080] hover:text-[#B0C4DE]",
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

          <CartesianGrid strokeDasharray="3 3" stroke="#1C2640" vertical={false} />

          <XAxis
            dataKey="date"
            ticks={ticks}
            tickFormatter={formatDate}
            tick={{ fill: "#4E6080", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatEur(v)}
            tick={{ fill: "#4E6080", fontSize: 11 }}
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
            activeDot={{ r: 4, fill: color, stroke: "#0B1120", strokeWidth: 2 }}
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
