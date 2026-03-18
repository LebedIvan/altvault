"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePortfolio } from "@/store/portfolioStore";
import { computeHealthScore } from "@/lib/calculations/healthScore";
import { HealthScoreCard } from "./HealthScoreCard";
import { AIAnalyst } from "./AIAnalyst";

export function AnalystPage() {
  const { assets, isLoaded } = usePortfolio();

  const health = useMemo(() => computeHealthScore(assets), [assets]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1120]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1C2640] border-t-[#F59E0B]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-[#E8F0FF]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[#1C2640] bg-[#0B1120]/90 backdrop-blur">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="h-8 w-8 rounded-lg object-cover overflow-hidden"
            >
              <img src="/logo.png" alt="Vaulty" className="h-8 w-8 object-cover" />
            </Link>
            <div>
              <span className="fb text-sm font-semibold tracking-tight text-[#E8F0FF]">Vaulty</span>
              <span className="fm ml-2 text-xs text-[#4E6080]">/ AI Analyst</span>
            </div>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-[#1C2640] px-3 py-1.5 text-xs text-[#4E6080] hover:border-[#F59E0B]/40 hover:text-[#F59E0B] transition-colors"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-4 py-6">
        <div className="mb-6">
          <h1 className="fb text-2xl font-bold text-[#E8F0FF]">AI Portfolio Analyst</h1>
          <p className="fm text-sm text-[#4E6080] mt-1">
            Personalized analysis and actionable insights for your alternative investments
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
          {/* Left — Health Score */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] p-5">
              <HealthScoreCard health={health} />
            </div>

            {/* Quick stats */}
            <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] p-4">
              <h3 className="fm text-xs font-bold uppercase tracking-widest text-[#4E6080] mb-3">
                Portfolio Snapshot
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="fm text-[#4E6080]">Positions</span>
                  <span className="fm font-medium text-[#E8F0FF]">{assets.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="fm text-[#4E6080]">Asset classes</span>
                  <span className="fm font-medium text-[#E8F0FF]">
                    {new Set(assets.map(a => a.assetClass)).size}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="fm text-[#4E6080]">Issues detected</span>
                  <span className={health.issues.length > 0 ? "fm font-bold text-[#F87171]" : "fm font-medium text-[#4ADE80]"}>
                    {health.issues.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="fm text-[#4E6080]">Strengths found</span>
                  <span className="fm font-medium text-[#4ADE80]">{health.strengths.length}</span>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="fm text-[10px] text-[#2A3A50] px-1 leading-relaxed">
              AI analysis is for informational purposes only. Not financial advice.
              Always do your own research before making investment decisions.
              Powered by Claude (Anthropic).
            </p>
          </div>

          {/* Right — Chat */}
          <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] p-5 flex flex-col" style={{ minHeight: "70vh" }}>
            <AIAnalyst health={health} />
          </div>
        </div>
      </main>
    </div>
  );
}
