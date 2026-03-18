"use client";

import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from "recharts";
import type { MerlinPortfolio, AllocationSlice } from "@/app/api/ai/portfolio-builder/route";

// ─── Constants ────────────────────────────────────────────────────────────────

const CLASS_COLORS: Record<string, string> = {
  lego:         "#F59E0B",
  pokemon:      "#EF4444",
  cs2_skins:    "#3B82F6",
  gold:         "#D97706",
  silver:       "#94A3B8",
  mtg:          "#8B5CF6",
  comics:       "#10B981",
  sports_cards: "#06B6D4",
  default:      "#6366F1",
};

const ANALYSIS_STEPS = [
  "Scanning alternative investment markets…",
  "Calculating risk-adjusted returns by asset class…",
  "Running Monte Carlo simulation (10,000 scenarios)…",
  "Optimizing allocation ratios via MPT…",
  "Building stress test scenarios…",
  "Finalizing portfolio recommendation…",
];

function getColor(cls: string) {
  return CLASS_COLORS[cls] ?? CLASS_COLORS.default!;
}

// ─── Donut chart (SVG) ────────────────────────────────────────────────────────

function DonutChart({ allocations, size = 200 }: { allocations: AllocationSlice[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const R  = size * 0.4;
  const r  = size * 0.24;

  let cumulative = 0;
  const slices = allocations.map((a) => {
    const start = cumulative;
    cumulative += a.pct;
    return { ...a, start, end: cumulative };
  });

  function arc(startPct: number, endPct: number) {
    const toRad = (p: number) => ((p / 100) * 360 - 90) * (Math.PI / 180);
    const x1 = cx + R * Math.cos(toRad(startPct));
    const y1 = cy + R * Math.sin(toRad(startPct));
    const x2 = cx + R * Math.cos(toRad(endPct));
    const y2 = cy + R * Math.sin(toRad(endPct));
    const ix1 = cx + r * Math.cos(toRad(startPct));
    const iy1 = cy + r * Math.sin(toRad(startPct));
    const ix2 = cx + r * Math.cos(toRad(endPct));
    const iy2 = cy + r * Math.sin(toRad(endPct));
    const large = endPct - startPct > 50 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${r} ${r} 0 ${large} 0 ${ix1} ${iy1} Z`;
  }

  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <svg width={size} height={size} className="overflow-visible">
      {slices.map((s) => (
        <path
          key={s.class}
          d={arc(s.start, s.end)}
          fill={getColor(s.class)}
          opacity={hovered === null || hovered === s.class ? 1 : 0.35}
          className="cursor-pointer transition-opacity duration-150"
          onMouseEnter={() => setHovered(s.class)}
          onMouseLeave={() => setHovered(null)}
          strokeWidth={1}
          stroke="#080F1C"
        />
      ))}
      {/* Center text */}
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#E8F0FF" fontSize={size * 0.09} fontWeight="700">
        {hovered ? `${allocations.find(a => a.class === hovered)?.pct ?? 0}%` : allocations.length}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#4E6080" fontSize={size * 0.055}>
        {hovered ? (allocations.find(a => a.class === hovered)?.label ?? "") : "classes"}
      </text>
    </svg>
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={60} height={60} className="-rotate-90">
        <circle cx={30} cy={30} r={r} fill="none" stroke="#1C2640" strokeWidth={5} />
        <circle
          cx={30} cy={30} r={r}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <p className="text-sm font-black text-[#E8F0FF] -mt-1" style={{ color }}>{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-[#4E6080]">{label}</p>
    </div>
  );
}

// ─── Terminal animation line ──────────────────────────────────────────────────

function TerminalLine({ text, done, active }: { text: string; done: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-3 text-xs font-mono">
      {done ? (
        <span className="text-emerald-400 shrink-0">✓</span>
      ) : active ? (
        <span className="h-3 w-3 animate-spin rounded-full border border-[#4E6080] border-t-[#F59E0B] shrink-0" />
      ) : (
        <span className="h-2 w-2 rounded-full bg-[#1C2640] shrink-0" />
      )}
      <span className={clsx(done ? "text-[#4E6080]" : active ? "text-[#E8F0FF]" : "text-[#2A3A50]")}>
        {text}
      </span>
    </div>
  );
}

// ─── Allocation row ───────────────────────────────────────────────────────────

function AllocationRow({ a }: { a: AllocationSlice }) {
  const [open, setOpen] = useState(false);
  const color = getColor(a.class);

  return (
    <div className="border-b border-[#1C2640] last:border-0">
      <button
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#080F1C] transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        {/* Color dot */}
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />

        {/* Name */}
        <span className="flex-1 text-sm font-semibold text-[#E8F0FF] min-w-0 truncate">{a.label}</span>

        {/* Pct bar */}
        <div className="w-24 hidden sm:block">
          <div className="h-1.5 rounded-full bg-[#1C2640] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${a.pct}%`, background: color }} />
          </div>
        </div>

        {/* % */}
        <span className="w-12 text-right text-sm font-bold" style={{ color }}>{a.pct}%</span>

        {/* Amount */}
        <span className="w-20 text-right text-sm text-[#B0C4DE] hidden md:block">
          ${a.amountUsd.toLocaleString()}
        </span>

        {/* 1Y return */}
        <span className="w-16 text-right text-sm font-semibold text-emerald-400 hidden lg:block">
          +{a.expectedReturn1Y}%
        </span>

        {/* Risk */}
        <span className={clsx(
          "w-16 text-right text-xs hidden lg:block",
          a.riskLevel === "low" ? "text-emerald-400" : a.riskLevel === "medium" ? "text-amber-400" : "text-red-400",
        )}>
          {a.riskLevel}
        </span>

        {/* Chevron */}
        <span className={clsx("text-[#2A3A50] text-xs transition-transform shrink-0", open && "rotate-180")}>▼</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 bg-[#080F1C]">
          <p className="text-xs text-[#4E6080] leading-relaxed">{a.rationale}</p>

          {/* Returns grid */}
          <div className="grid grid-cols-3 gap-2">
            {[["1Y", a.expectedReturn1Y], ["3Y", a.expectedReturn3Y], ["5Y", a.expectedReturn5Y]].map(([period, val]) => (
              <div key={period} className="rounded-lg border border-[#1C2640] p-2 text-center">
                <p className="text-[9px] uppercase tracking-wider text-[#2A3A50]">{period}</p>
                <p className="text-sm font-bold text-emerald-400">+{val}%</p>
              </div>
            ))}
          </div>

          {/* Top picks */}
          <div>
            <p className="text-[9px] uppercase tracking-wider text-[#2A3A50] mb-1.5">Top Picks</p>
            <ul className="space-y-1">
              {a.topPicks.map((pick, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#B0C4DE]">
                  <span className="shrink-0" style={{ color }}>→</span>
                  {pick}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Forecast chart ───────────────────────────────────────────────────────────

function ForecastChart({ data }: { data: MerlinPortfolio["forecast"] }) {
  const fmt = (v: number) =>
    v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="merlin-opt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#4ADE80" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="merlin-base" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="merlin-cons" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#94A3B8" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1C2640" />
        <XAxis
          dataKey="year"
          tick={{ fill: "#4E6080", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `Y${v}`}
        />
        <YAxis
          tick={{ fill: "#4E6080", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={fmt}
          width={52}
        />
        <Tooltip
          contentStyle={{ background: "#080F1C", border: "1px solid #1C2640", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#E8F0FF" }}
          formatter={(v: number, name: string) => [fmt(v), name]}
          labelFormatter={(l) => `Year ${l}`}
        />
        <Area type="monotone" dataKey="optimistic"   stroke="#4ADE80" strokeWidth={1.5} fill="url(#merlin-opt)"  name="Optimistic"   strokeDasharray="4 2" />
        <Area type="monotone" dataKey="base"         stroke="#F59E0B" strokeWidth={2}   fill="url(#merlin-base)" name="Base Case" />
        <Area type="monotone" dataKey="conservative" stroke="#94A3B8" strokeWidth={1.5} fill="url(#merlin-cons)" name="Conservative" strokeDasharray="4 2" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Phase = "input" | "loading" | "result";

const AMOUNT_PRESETS = [1000, 5000, 10000, 25000, 50000];
const HORIZON_OPTIONS = [1, 2, 3, 5, 7, 10];
type RiskProfile = "conservative" | "moderate" | "aggressive";

export function MerlinTerminal() {
  const [phase, setPhase]         = useState<Phase>("input");
  const [amount, setAmount]       = useState(5000);
  const [amountStr, setAmountStr] = useState("5000");
  const [horizon, setHorizon]     = useState(3);
  const [risk, setRisk]           = useState<RiskProfile>("moderate");
  const [portfolio, setPortfolio] = useState<MerlinPortfolio | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [stepDone, setStepDone]   = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Drive analysis steps during loading
  useEffect(() => {
    if (phase !== "loading") { setStepDone(0); return; }
    let step = 0;
    const iv = setInterval(() => {
      step++;
      setStepDone(step);
      if (step >= ANALYSIS_STEPS.length) clearInterval(iv);
    }, 650);
    return () => clearInterval(iv);
  }, [phase]);

  async function build() {
    setPhase("loading");
    setError(null);
    setPortfolio(null);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/portfolio-builder", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ amountUsd: amount, horizonYears: horizon, riskProfile: risk }),
        signal:  abortRef.current.signal,
      });
      const data = (await res.json()) as { portfolio?: MerlinPortfolio; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "AI error");
      setPortfolio(data.portfolio!);
      setPhase("result");
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Unknown error");
      setPhase("input");
    }
  }

  function reset() {
    abortRef.current?.abort();
    setPhase("input");
    setPortfolio(null);
    setError(null);
  }

  // ── Render: Input ────────────────────────────────────────────────────────────

  if (phase === "input") return (
    <div className="min-h-screen bg-[#080F1C] px-4 py-10 flex items-start justify-center">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-1.5 mb-2">
            <span className="text-[#F59E0B] font-black text-sm">◆ MERLIN</span>
          </div>
          <h1 className="text-3xl font-black text-[#E8F0FF] tracking-tight">
            Сформируй портфель
          </h1>
          <p className="text-[#4E6080] text-sm leading-relaxed max-w-sm mx-auto">
            Merlin анализирует рынок альт-активов, рассчитывает доходность
            и подбирает оптимальные пропорции для твоего капитала.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] p-6 space-y-6">

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[#4E6080]">
              Сумма инвестиций (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4E6080] font-bold">$</span>
              <input
                type="number"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v > 0) setAmount(v);
                }}
                className="w-full rounded-xl border border-[#1C2640] bg-[#080F1C] pl-8 pr-4 py-3 text-lg font-bold text-[#E8F0FF] focus:border-[#F59E0B]/60 focus:outline-none"
                placeholder="5000"
                min={100}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {AMOUNT_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setAmount(p); setAmountStr(String(p)); }}
                  className={clsx(
                    "rounded-lg border px-3 py-1 text-xs font-semibold transition-colors",
                    amount === p
                      ? "border-[#F59E0B]/60 bg-[#F59E0B]/10 text-[#F59E0B]"
                      : "border-[#1C2640] text-[#4E6080] hover:border-[#F59E0B]/30 hover:text-[#B0C4DE]",
                  )}
                >
                  ${p.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Horizon */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[#4E6080]">
              Горизонт инвестирования
            </label>
            <div className="flex flex-wrap gap-2">
              {HORIZON_OPTIONS.map((y) => (
                <button
                  key={y}
                  onClick={() => setHorizon(y)}
                  className={clsx(
                    "rounded-lg border px-4 py-2 text-xs font-semibold transition-colors",
                    horizon === y
                      ? "border-[#F59E0B]/60 bg-[#F59E0B]/10 text-[#F59E0B]"
                      : "border-[#1C2640] text-[#4E6080] hover:border-[#F59E0B]/30 hover:text-[#B0C4DE]",
                  )}
                >
                  {y}Y
                </button>
              ))}
            </div>
          </div>

          {/* Risk */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[#4E6080]">
              Риск-профиль
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["conservative", "moderate", "aggressive"] as RiskProfile[]).map((r) => {
                const cfg = {
                  conservative: { label: "Консервативный", sub: "Metals + LEGO", color: "text-emerald-400", border: "border-emerald-500/50 bg-emerald-500/10" },
                  moderate:     { label: "Умеренный",      sub: "Balanced",       color: "text-amber-400",   border: "border-amber-500/50 bg-amber-500/10" },
                  aggressive:   { label: "Агрессивный",    sub: "High alpha",     color: "text-red-400",     border: "border-red-500/50 bg-red-500/10" },
                }[r];
                return (
                  <button
                    key={r}
                    onClick={() => setRisk(r)}
                    className={clsx(
                      "rounded-xl border p-3 text-left transition-colors",
                      risk === r ? cfg.border : "border-[#1C2640] hover:border-[#2A3A50]",
                    )}
                  >
                    <p className={clsx("text-xs font-bold", risk === r ? cfg.color : "text-[#4E6080]")}>{cfg.label}</p>
                    <p className="text-[10px] text-[#2A3A50] mt-0.5">{cfg.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => void build()}
            disabled={amount < 100}
            className="w-full rounded-xl bg-[#F59E0B] py-4 text-sm font-black text-[#0B1120] transition-all hover:bg-[#FCD34D] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ◆ Сформировать портфель
          </button>
        </div>

        {error && (
          <p className="text-center text-xs text-red-400">{error}</p>
        )}
      </div>
    </div>
  );

  // ── Render: Loading ──────────────────────────────────────────────────────────

  if (phase === "loading") return (
    <div className="min-h-screen bg-[#080F1C] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-[#F59E0B] font-black text-lg">◆ MERLIN</span>
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#F59E0B]" />
          </div>
          <p className="text-[#4E6080] text-sm">Анализирую рынок…</p>
        </div>

        <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] p-6 space-y-3 font-mono">
          {ANALYSIS_STEPS.map((s, i) => (
            <TerminalLine
              key={i}
              text={s}
              done={i < stepDone}
              active={i === stepDone}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full rounded-full bg-[#1C2640] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#F59E0B] transition-all duration-700"
            style={{ width: `${Math.min((stepDone / ANALYSIS_STEPS.length) * 100, 100)}%` }}
          />
        </div>

        <div className="text-center">
          <p className="text-[10px] text-[#2A3A50]">
            ${amount.toLocaleString()} · {horizon}Y · {risk}
          </p>
        </div>
      </div>
    </div>
  );

  // ── Render: Result ───────────────────────────────────────────────────────────

  if (!portfolio) return null;

  return (
    <div className="min-h-screen bg-[#080F1C] px-4 py-8 space-y-6 max-w-5xl mx-auto">

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-1.5">
            <span className="text-[#F59E0B] font-black text-sm">◆ MERLIN</span>
          </div>
          <div>
            <p className="text-sm font-bold text-[#E8F0FF]">
              ${amount.toLocaleString()} · {horizon}Y · {risk}
            </p>
            <p className="text-[10px] text-[#4E6080]">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
        <button
          onClick={reset}
          className="rounded-xl border border-[#1C2640] px-4 py-2 text-xs text-[#4E6080] hover:border-[#F59E0B]/30 hover:text-[#F59E0B] transition-colors"
        >
          ← Пересчитать
        </button>
      </div>

      {/* Overview card */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left: donut + legend */}
        <div className="lg:col-span-2 rounded-2xl border border-[#1C2640] bg-[#0E1830] p-5 flex flex-col items-center gap-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#4E6080] self-start">Аллокация</p>
          <DonutChart allocations={portfolio.allocations} size={180} />
          <div className="w-full space-y-2">
            {portfolio.allocations.map((a) => (
              <div key={a.class} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: getColor(a.class) }} />
                  <span className="text-[#B0C4DE]">{a.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#E8F0FF]">{a.pct}%</span>
                  <span className="text-[#4E6080] w-16 text-right">${a.amountUsd.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: metrics + thesis */}
        <div className="lg:col-span-3 rounded-2xl border border-[#1C2640] bg-[#0E1830] p-5 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#4E6080]">Прогноз</p>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#4E6080]">Ожид. доходность / год</p>
              <p className="text-3xl font-black text-emerald-400">+{portfolio.projectedAnnualReturn}%</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#4E6080]">Ценность через {horizon}Y</p>
              <p className="text-3xl font-black text-[#E8F0FF]">
                ${Math.round(portfolio.forecast[portfolio.forecast.length - 1]?.base ?? amount).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Score rings */}
          <div className="flex gap-6 justify-center py-1">
            <ScoreRing value={portfolio.riskScore}            label="Risk"          color="#F87171" />
            <ScoreRing value={portfolio.diversificationScore} label="Diversif."     color="#4ADE80" />
            <ScoreRing value={portfolio.liquidityScore}       label="Liquidity"     color="#60A5FA" />
          </div>

          {/* Thesis */}
          <div className="rounded-xl border border-[#1C2640] bg-[#080F1C] p-3">
            <p className="text-[9px] uppercase tracking-wider text-[#F59E0B] mb-1.5">Инвест-тезис</p>
            <p className="text-xs text-[#B0C4DE] leading-relaxed">{portfolio.keyThesis}</p>
          </div>
        </div>
      </div>

      {/* Allocations table */}
      <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1C2640] flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#4E6080]">Позиции по классам</p>
          <p className="text-[10px] text-[#2A3A50]">↓ раскрой для деталей и топ-пиков</p>
        </div>
        {portfolio.allocations.map((a) => (
          <AllocationRow key={a.class} a={a} />
        ))}
      </div>

      {/* Forecast chart */}
      <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#4E6080]">Прогноз роста портфеля</p>
          <div className="flex items-center gap-4 text-[10px]">
            {[["#4ADE80", "Оптимистично", "4 2"], ["#F59E0B", "Базовый"], ["#94A3B8", "Консервативно", "4 2"]].map(([c, l, d]) => (
              <div key={l} className="flex items-center gap-1.5">
                <svg width={16} height={2}>
                  <line x1={0} y1={1} x2={16} y2={1} stroke={c} strokeWidth={d ? 1.5 : 2} strokeDasharray={d} />
                </svg>
                <span className="text-[#4E6080]">{l}</span>
              </div>
            ))}
          </div>
        </div>
        <ForecastChart data={portfolio.forecast} />
      </div>

      {/* Stress tests */}
      <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#4E6080]">Стресс-тест сценарии</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {portfolio.stressTests.map((s, i) => (
            <div key={i} className="rounded-xl border border-[#1C2640] bg-[#080F1C] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#B0C4DE] leading-tight">{s.icon} {s.scenario}</span>
                <span className={clsx(
                  "text-sm font-black",
                  s.impact >= 0 ? "text-emerald-400" : "text-red-400",
                )}>
                  {s.impact >= 0 ? "+" : ""}{s.impact}%
                </span>
              </div>
              <p className="text-[10px] text-[#4E6080] leading-relaxed">{s.explanation}</p>
              <div className="text-[10px] text-[#2A3A50]">
                = ${Math.round(amount * (1 + s.impact / 100)).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {portfolio.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1">
          {portfolio.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-400/80">⚠ {w}</p>
          ))}
        </div>
      )}

      <p className="text-center text-[10px] text-[#1C2640] pb-4">
        Not financial advice. AI-generated analysis based on historical alternative investment market patterns.
      </p>
    </div>
  );
}
