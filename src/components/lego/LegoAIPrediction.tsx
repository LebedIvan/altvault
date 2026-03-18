"use client";

import { useState, useEffect } from "react";
import { clsx } from "clsx";
import type { LegoSetRecord } from "@/lib/legoSetRecord";
import type { LegoPrediction } from "@/app/api/lego/predict/route";
import type { EbaySoldData } from "@/app/api/ebay/sold/route";

interface Props {
  set:      LegoSetRecord;
  gbpToUsd: number;
}

// ─── Markdown renderer (same pattern as AIAnalyst) ────────────────────────────

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} className="font-bold text-[#E8F0FF]">{p.slice(2, -2)}</strong>
      : p,
  );
}

// ─── Verdict pill ─────────────────────────────────────────────────────────────

function VerdictBadge({ verdict }: { verdict: LegoPrediction["verdict"] }) {
  const cfg = {
    BUY:  { bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-400", label: "BUY",  icon: "▲" },
    HOLD: { bg: "bg-amber-500/15   border-amber-500/30",   text: "text-amber-400",   label: "HOLD", icon: "◆" },
    SELL: { bg: "bg-red-500/15     border-red-500/30",     text: "text-red-400",     label: "SELL", icon: "▼" },
  }[verdict];

  return (
    <div className={clsx("flex items-center gap-1.5 rounded-xl border px-4 py-2", cfg.bg)}>
      <span className={clsx("text-lg font-black", cfg.text)}>{cfg.icon}</span>
      <span className={clsx("text-lg font-black tracking-widest", cfg.text)}>{cfg.label}</span>
    </div>
  );
}

function ConfidenceDots({ confidence }: { confidence: LegoPrediction["confidence"] }) {
  const filled = { LOW: 1, MEDIUM: 2, HIGH: 3 }[confidence];
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={clsx(
            "h-2 w-2 rounded-full",
            i <= filled
              ? confidence === "HIGH" ? "bg-emerald-400" : confidence === "MEDIUM" ? "bg-amber-400" : "bg-red-400"
              : "bg-[#1C2640]",
          )}
        />
      ))}
      <span className="ml-1 text-[11px] text-[#4E6080]">{confidence}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LegoAIPrediction({ set, gbpToUsd }: Props) {
  const [prediction, setPrediction] = useState<LegoPrediction | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [, setFetched]       = useState(false);

  function load() {
    if (loading) return;
    setLoading(true);
    setError(null);

    // First fetch eBay summary, then pass to predict
    const ebayQuery = `LEGO ${set.setNumber} ${set.name}`;
    fetch(`/api/ebay/sold?q=${encodeURIComponent(ebayQuery)}&currency=USD`)
      .then((r) => (r.ok ? r.json() : null))
      .then(async (ebayData: EbaySoldData | null) => {
        const ebay = ebayData
          ? {
              trendingPrice: ebayData.trendingPrice,
              lowestPrice:   ebayData.lowestPrice,
              highestPrice:  ebayData.highestPrice,
              averagePrice:  ebayData.averagePrice,
              totalSales:    ebayData.totalSales,
              source:        ebayData.source,
            }
          : null;

        const res = await fetch("/api/lego/predict", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ set, gbpToUsd, ebay }),
        });
        const data = (await res.json()) as { prediction?: LegoPrediction; error?: string };
        if (!res.ok || data.error) throw new Error(data.error ?? "AI error");
        setPrediction(data.prediction!);
        setFetched(true);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  // Auto-load on mount
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const marketUsd = set.marketPriceGbp != null ? set.marketPriceGbp * gbpToUsd : null;

  return (
    <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/30">
          <span className="fm text-xs font-black text-[#F59E0B]">AI</span>
        </div>
        <span className="text-sm font-semibold text-[#E8F0FF]">Investment Prediction</span>
        <span className="ml-auto text-[10px] text-[#2A3A50]">powered by Claude</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2 text-xs text-[#4E6080]">
            <span className="h-3 w-3 animate-spin rounded-full border border-[#4E6080] border-t-[#F59E0B]" />
            Analyzing market data…
          </div>
          {[70, 90, 55].map((w, i) => (
            <div key={i} className="h-2 rounded-full bg-[#1C2640] animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="space-y-2">
          <p className="text-xs text-[#F87171]">
            {error.includes("ANTHROPIC_API_KEY")
              ? "AI not configured — add ANTHROPIC_API_KEY to .env.local"
              : `Error: ${error}`}
          </p>
          <button
            onClick={load}
            className="text-xs text-[#F59E0B] hover:text-[#FCD34D] transition-colors"
          >
            Retry ↻
          </button>
        </div>
      )}

      {/* Prediction */}
      {prediction && !loading && (
        <>
          {/* Verdict row */}
          <div className="flex items-center gap-4 flex-wrap">
            <VerdictBadge verdict={prediction.verdict} />
            <div className="space-y-1">
              <ConfidenceDots confidence={prediction.confidence} />
              <p className="text-[11px] text-[#4E6080]">Horizon: {prediction.timeHorizon}</p>
            </div>
            {prediction.priceTargetUsd != null && (
              <div className="ml-auto text-right">
                <p className="text-[10px] uppercase tracking-wider text-[#4E6080]">Price Target</p>
                <p className="text-base font-bold text-[#E8F0FF]">
                  ${prediction.priceTargetUsd.toFixed(2)}
                </p>
                {prediction.upsidePct != null && (
                  <p className={clsx(
                    "text-xs font-semibold",
                    prediction.upsidePct >= 0 ? "text-emerald-400" : "text-red-400",
                  )}>
                    {prediction.upsidePct >= 0 ? "+" : ""}{prediction.upsidePct.toFixed(1)}% upside
                  </p>
                )}
                {marketUsd != null && (
                  <p className="text-[10px] text-[#2A3A50]">from ${marketUsd.toFixed(0)}</p>
                )}
              </div>
            )}
          </div>

          {/* Summary */}
          <p className="text-sm text-[#B0C4DE] leading-relaxed border-l-2 border-[#F59E0B]/30 pl-3">
            {renderInline(prediction.summary)}
          </p>

          {/* Key factors */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4E6080] mb-2">
              Key Factors
            </p>
            <ul className="space-y-1.5">
              {prediction.keyFactors.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#B0C4DE]">
                  <span className="mt-0.5 text-emerald-400 shrink-0">✓</span>
                  {renderInline(f)}
                </li>
              ))}
            </ul>
          </div>

          {/* Risks */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4E6080] mb-2">
              Risks
            </p>
            <ul className="space-y-1.5">
              {prediction.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#4E6080]">
                  <span className="mt-0.5 text-amber-500 shrink-0">⚠</span>
                  {renderInline(r)}
                </li>
              ))}
            </ul>
          </div>

          {/* Refresh */}
          <div className="flex items-center justify-between pt-1 border-t border-[#1C2640]">
            <p className="text-[10px] text-[#2A3A50]">
              Not financial advice. AI analysis based on market patterns.
            </p>
            <button
              onClick={load}
              className="text-[10px] text-[#2A3A50] hover:text-[#4E6080] transition-colors"
            >
              Refresh ↻
            </button>
          </div>
        </>
      )}
    </div>
  );
}
