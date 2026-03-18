"use client";

import { clsx } from "clsx";
import type { HealthScoreResult } from "@/lib/calculations/healthScore";

const COMPONENT_LABELS: Record<string, string> = {
  diversification: "Diversification",
  liquidity:       "Liquidity",
  performance:     "Performance",
  riskAdjusted:    "Risk-Adjusted",
  trend:           "Trend",
  sizing:          "Position Sizing",
  costBasis:       "Cost Basis",
};

const COLOR_MAP = {
  emerald: {
    ring:   "ring-emerald-500/30",
    bg:     "bg-emerald-500",
    text:   "text-emerald-400",
    badge:  "bg-emerald-900/30 border-emerald-700/50 text-emerald-300",
    glow:   "shadow-emerald-500/20",
  },
  yellow: {
    ring:   "ring-yellow-500/30",
    bg:     "bg-yellow-500",
    text:   "text-yellow-400",
    badge:  "bg-yellow-900/30 border-yellow-700/50 text-yellow-300",
    glow:   "shadow-yellow-500/20",
  },
  orange: {
    ring:   "ring-orange-500/30",
    bg:     "bg-orange-500",
    text:   "text-orange-400",
    badge:  "bg-orange-900/30 border-orange-700/50 text-orange-300",
    glow:   "shadow-orange-500/20",
  },
  red: {
    ring:   "ring-red-500/30",
    bg:     "bg-red-500",
    text:   "text-red-400",
    badge:  "bg-red-900/30 border-red-700/50 text-red-300",
    glow:   "shadow-red-500/20",
  },
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#1C2640]">
      <div
        className={clsx("absolute inset-y-0 left-0 rounded-full transition-all", color)}
        style={{ width: `${Math.max(0, Math.min(100, score * 100)).toFixed(1)}%` }}
      />
    </div>
  );
}

interface Props {
  health: HealthScoreResult;
  compact?: boolean;
}

export function HealthScoreCard({ health, compact = false }: Props) {
  const c = COLOR_MAP[health.gradeColor];

  if (compact) {
    return (
      <div className={clsx("flex items-center gap-3 rounded-xl border p-3", `ring-1 ${c.ring}`, "border-[#1C2640] bg-[#0E1830]")}>
        {/* Score circle */}
        <div className={clsx("flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ring-2", `ring-2 ${c.ring}`, "bg-[#080F1C]")}>
          <span className={clsx("fb text-xl font-black tabular-nums", c.text)}>{health.overall}</span>
          <span className="fm text-[8px] text-[#2A3A50] leading-none">/ 100</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="fb text-sm font-bold text-[#E8F0FF]">Portfolio Health</span>
            <span className={clsx("rounded border px-1.5 py-0.5 text-[10px] font-bold", c.badge)}>
              {health.grade}
            </span>
          </div>
          {health.issues.length > 0 && (
            <p className="fm text-xs text-[#4E6080] truncate mt-0.5">
              {health.issues[0]?.severity === "critical" ? "🔴" : "🟡"} {health.issues[0]?.message}
            </p>
          )}
          {health.issues.length === 0 && health.strengths.length > 0 && (
            <p className="fm text-xs text-[#4ADE80] truncate mt-0.5">✓ {health.strengths[0]}</p>
          )}
        </div>
      </div>
    );
  }

  // Full card
  return (
    <div className="space-y-5">
      {/* Score header */}
      <div className="flex items-center gap-5">
        <div className={clsx(
          "flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl ring-2 shadow-lg",
          c.ring, c.glow, "bg-[#080F1C]",
        )}>
          <span className={clsx("fb text-4xl font-black tabular-nums leading-none", c.text)}>{health.overall}</span>
          <span className="fm text-[9px] text-[#2A3A50] mt-0.5">/ 100</span>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="fb text-xl font-bold text-[#E8F0FF]">Portfolio Health</h2>
            <span className={clsx("rounded-lg border px-2.5 py-1 text-sm font-bold", c.badge)}>
              {health.grade}
            </span>
          </div>
          <p className="fm text-sm text-[#4E6080]">
            {health.overall >= 80 ? "Strong portfolio — well-structured" :
             health.overall >= 65 ? "Decent portfolio — some improvements possible" :
             health.overall >= 50 ? "Needs attention — several issues to address" :
             "High risk — immediate action recommended"}
          </p>
        </div>
      </div>

      {/* Component breakdown */}
      <div className="space-y-2.5">
        <h3 className="fm text-xs font-bold uppercase tracking-widest text-[#4E6080]">Score Breakdown</h3>
        {Object.entries(health.components).map(([key, comp]) => {
          const scorePct = Math.round(comp.score * 100);
          const barColor = scorePct >= 70 ? "bg-[#4ADE80]" : scorePct >= 45 ? "bg-[#F59E0B]" : "bg-[#F87171]";
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-[#B0C4DE]">
                    {COMPONENT_LABELS[key] ?? key}
                  </span>
                  <span className="fm text-[10px] text-[#2A3A50]">
                    ({(comp.weight * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="fm text-[10px] text-[#4E6080] text-right max-w-[180px] truncate hidden sm:block">
                    {comp.detail}
                  </span>
                  <span className={clsx(
                    "fm w-8 text-right text-xs tabular-nums font-bold",
                    scorePct >= 70 ? "text-[#4ADE80]" : scorePct >= 45 ? "text-[#F59E0B]" : "text-[#F87171]",
                  )}>
                    {scorePct}
                  </span>
                </div>
              </div>
              <ScoreBar score={comp.score} color={barColor} />
            </div>
          );
        })}
      </div>

      {/* Issues */}
      {health.issues.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="fm text-xs font-bold uppercase tracking-widest text-[#4E6080]">Issues</h3>
          {health.issues.map((issue, i) => (
            <div
              key={i}
              className={clsx(
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
                issue.severity === "critical"
                  ? "border-[#F87171]/30 bg-[#F87171]/10 text-[#F87171]"
                  : "border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#FCD34D]",
              )}
            >
              <span className="shrink-0">{issue.severity === "critical" ? "🔴" : "🟡"}</span>
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Strengths */}
      {health.strengths.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="fm text-xs font-bold uppercase tracking-widest text-[#4E6080]">Strengths</h3>
          {health.strengths.map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border border-[#4ADE80]/25 bg-[#4ADE80]/10 px-3 py-2 text-xs text-[#4ADE80]"
            >
              <span className="shrink-0">✓</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
