"use client";

import { useState } from "react";
import { clsx } from "clsx";
import Link from "next/link";
import { NewsFeed } from "./NewsFeed";
import { MarketHeatmap } from "./MarketHeatmap";
import { Screener } from "./Screener";
import { WhaleTracker } from "./WhaleTracker";
import { LegoSunset } from "./LegoSunset";
import { MacroTicker } from "./MacroTicker";
import { usePortfolio } from "@/store/portfolioStore";
import { useCurrency, CURRENCY_LABELS, type DisplayCurrency } from "@/store/currencyStore";
import { computePortfolioSummary } from "@/lib/calculations/portfolio";
import { formatPct } from "@/lib/formatters";

type Tab = "feed" | "heatmap" | "screener" | "whale" | "lego";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "feed",     label: "News Feed",    icon: "📰" },
  { key: "heatmap",  label: "Heatmap",      icon: "🗺️" },
  { key: "screener", label: "Screener",     icon: "🔍" },
  { key: "whale",    label: "Whale Tracker",icon: "🐋" },
  { key: "lego",     label: "LEGO Sets",    icon: "🧱" },
];

function PortfolioMini() {
  const { assets } = usePortfolio();
  const { fmtCents, displayCurrency, setDisplayCurrency } = useCurrency();
  const summary = computePortfolioSummary(assets);
  const isUp = summary.totalUnrealizedPnLCents >= 0;

  return (
    <div className="rounded-xl border border-[#1C2640] bg-[#0E1830] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="fm text-xs font-bold uppercase tracking-widest text-[#4E6080]">
          Portfolio
        </h3>
        <select
          value={displayCurrency}
          onChange={(e) => setDisplayCurrency(e.target.value as DisplayCurrency)}
          className="rounded border border-[#1C2640] bg-[#080F1C] px-2 py-0.5 text-xs text-[#B0C4DE] focus:outline-none focus:border-[#F59E0B]/50"
        >
          {(Object.keys(CURRENCY_LABELS) as DisplayCurrency[]).map((c) => (
            <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="fm text-[10px] text-[#2A3A50]">Total Value</p>
          <p className="fb text-xl font-black tabular-nums text-[#E8F0FF]">
            {fmtCents(summary.totalCurrentValueCents)}
          </p>
        </div>
        <div>
          <p className="fm text-[10px] text-[#2A3A50]">Unrealized P&L</p>
          <p className={clsx("fb text-xl font-black tabular-nums", isUp ? "text-[#4ADE80]" : "text-[#F87171]")}>
            {isUp ? "+" : ""}{fmtCents(summary.totalUnrealizedPnLCents)}
          </p>
        </div>
        <div>
          <p className="fm text-[10px] text-[#2A3A50]">Ann. ROI</p>
          <p className={clsx("fb text-sm font-bold", summary.overallAnnualizedROI >= 0 ? "text-[#4ADE80]" : "text-[#F87171]")}>
            {formatPct(summary.overallAnnualizedROI)}
          </p>
        </div>
        <div>
          <p className="fm text-[10px] text-[#2A3A50]">Assets</p>
          <p className="fb text-sm font-bold text-[#E8F0FF]">{assets.length}</p>
        </div>
      </div>

      <Link
        href="/"
        className="mt-3 block text-center rounded-lg border border-[#1C2640] bg-[#080F1C] py-1.5 text-xs font-medium text-[#4E6080] hover:border-[#F59E0B]/40 hover:text-[#F59E0B] transition-colors"
      >
        View Full Portfolio →
      </Link>
    </div>
  );
}

export function TerminalDashboard() {
  const [tab, setTab] = useState<Tab>("feed");

  return (
    <div className="min-h-screen bg-[#070c14] text-white font-mono">
      {/* ── Terminal Navbar ── */}
      <header className="sticky top-0 z-20 border-b border-emerald-900/40 bg-[#070c14]/95 backdrop-blur">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-2.5">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Vaulty" className="h-7 w-7 rounded object-cover" />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
                Vaulty Terminal
              </span>
              <span className="text-[9px] text-slate-600 tracking-wider">
                Alternative Investments Intelligence
              </span>
            </div>
          </div>

          {/* Live clock-like indicator */}
          <div className="hidden md:flex items-center gap-6 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-600 font-bold tracking-wider">LIVE</span>
            </div>
            <span className="text-slate-600">
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/merlin"
              className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-1.5 text-xs font-bold text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors"
            >
              ◆ Merlin
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-[#1C2640] bg-[#0E1830] px-3 py-1.5 text-xs text-[#4E6080] hover:border-[#F59E0B]/40 hover:text-[#F59E0B] transition-colors"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* ── Macro Ticker Tape ── */}
      <MacroTicker />

      {/* ── Main layout ── */}
      <div className="mx-auto max-w-screen-2xl px-4 py-4">
        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-4 border-b border-slate-800/60 pb-2 overflow-x-auto">
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={clsx(
                "flex shrink-0 items-center gap-1.5 rounded-t px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors",
                tab === key
                  ? "border-b-2 border-emerald-500 text-emerald-400 bg-emerald-950/20"
                  : "text-slate-600 hover:text-slate-400",
              )}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-4">
          {/* Main content (left) */}
          <div className="min-h-[calc(100vh-220px)]">
            {tab === "feed"     && <NewsFeed />}
            {tab === "heatmap"  && <MarketHeatmap />}
            {tab === "screener" && <Screener />}
            {tab === "whale"    && <WhaleTracker />}
            {tab === "lego"     && <LegoSunset />}
          </div>

          {/* Right sidebar — always visible */}
          <div className="space-y-4">
            {/* Portfolio mini summary */}
            <PortfolioMini />

            {/* Contextual sidebar content */}
            {(tab === "feed" || tab === "heatmap" || tab === "screener" || tab === "whale" || tab === "lego") && (
              <div className="rounded-xl border border-[#1C2640] bg-[#0E1830] p-4">
                <h3 className="fm text-xs font-bold uppercase tracking-widest text-[#4E6080] mb-3">
                  Quick Links
                </h3>
                <div className="space-y-1">
                  {TABS.filter((t) => t.key !== tab).map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#4E6080] hover:bg-[#162035] hover:text-[#B0C4DE] transition-colors text-left"
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <p className="fm text-[10px] text-[#2A3A50] px-1 leading-relaxed">
              News is aggregated from public Reddit feeds. Not financial advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
