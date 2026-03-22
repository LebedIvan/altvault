"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { HeroMetrics } from "./HeroMetrics";
import { TrendChart } from "./TrendChart";
import { AssetTable } from "./AssetTable";
import { AllocationChart } from "./AllocationChart";
import { TaxReportPanel } from "./TaxReport";
import { AddAssetModal } from "./AddAssetModal";
import { TopMovers } from "./TopMovers";
import { computePortfolioSummary } from "@/lib/calculations/portfolio";
import { computeHealthScore } from "@/lib/calculations/healthScore";
import { buildTaxReport } from "@/lib/calculations/tax";
import { buildPortfolioHistory } from "@/lib/portfolioHistory";
import { HealthScoreCard } from "@/components/analyst/HealthScoreCard";
import { usePortfolio } from "@/store/portfolioStore";
import { useCurrency, CURRENCY_LABELS, type DisplayCurrency } from "@/store/currencyStore";
import { useUser, getInitials } from "@/store/userStore";
import { useAuth } from "@/store/authStore";
import { useLang } from "@/store/langStore";
import { t } from "@/lib/i18n";
import { refreshAllPrices, type RefreshResult } from "@/lib/priceRefresh";

type Tab = "overview" | "holdings" | "tax";

export function PortfolioDashboard() {
  const { assets, updatePrice, updateAsset, resetToDemo, isLoaded } = usePortfolio();
  const { displayCurrency, setDisplayCurrency, fmtCents } = useCurrency();
  const { profile } = useUser();
  const { mode, user, logout } = useAuth();
  const { lang } = useLang();

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: t(lang, "app_tab_overview") },
    { key: "holdings", label: t(lang, "app_tab_holdings") },
    { key: "tax",      label: t(lang, "app_tab_tax") },
  ];

  const [tab, setTab] = useState<Tab>("overview");
  const [taxYear, setTaxYear] = useState(2024);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshLog, setRefreshLog] = useState<RefreshResult[]>([]);

  const summary = computePortfolioSummary(assets);
  const health  = computeHealthScore(assets);
  const taxReport = buildTaxReport(assets, taxYear);
  const history = buildPortfolioHistory(assets);

  const latestValue = summary.totalCurrentValueCents;

  const currentYear = new Date().getFullYear();
  const taxYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  async function handleRefreshPrices() {
    setRefreshing(true);
    setRefreshLog([]);
    const results = await refreshAllPrices(assets);
    for (const r of results) {
      if (r.priceCents !== null) {
        updatePrice(r.assetId, r.priceCents);
      }
      if (r.extraPatch) {
        updateAsset(r.assetId, r.extraPatch);
      }
    }
    setRefreshLog(results);
    setRefreshing(false);
  }

  const supportedCount = assets.filter(
    (a) => a.assetClass === "cs2_skins" || a.assetClass === "commodities" || a.assetClass === "trading_cards" || a.assetClass === "games_tech",
  ).length;

  return (
    <div className="min-h-screen bg-[#0B1120] text-[#E8F0FF]">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-20 border-b border-[#1C2640] bg-[#0B1120]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-3 sm:px-6 py-2 sm:py-3 gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" alt="Vaulty" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg object-cover" />
            <span className="fb text-sm font-bold tracking-tight text-[#E8F0FF] hidden sm:block">Vaulty</span>
          </div>

          {/* Tabs — центр */}
          <nav className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-none">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={clsx(
                  "fm shrink-0 rounded-md px-2.5 sm:px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                  tab === key
                    ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25"
                    : "text-[#4E6080] hover:text-[#B0C4DE]",
                )}
              >
                {label}
              </button>
            ))}
            <a
              href="/terminal"
              className="fm shrink-0 hidden sm:block ml-1 rounded-md border border-[#1C2640] bg-[#080F1C] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#4ADE80] transition-colors hover:border-[#4ADE80]/30"
            >
              Terminal
            </a>
            <a
              href="/analyst"
              className="fm shrink-0 hidden md:flex ml-1 items-center gap-1 rounded-md border border-[#1C2640] bg-[#080F1C] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#F59E0B] transition-colors hover:border-[#F59E0B]/30"
            >
              🤖 AI
              {health.issues.some(i => i.severity === "critical") && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#F87171]" />
              )}
            </a>
            <a
              href="/merlin"
              className="fm shrink-0 hidden md:flex ml-1 items-center gap-1 rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/20"
            >
              ◆ Merlin
            </a>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Currency selector */}
            <select
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value as DisplayCurrency)}
              className="fm rounded-lg border border-[#1C2640] bg-[#0E1830] px-1.5 sm:px-2 py-1.5 text-xs font-semibold text-[#B0C4DE] focus:outline-none focus:border-[#F59E0B]/40 cursor-pointer"
            >
              {(Object.keys(CURRENCY_LABELS) as DisplayCurrency[]).map((c) => (
                <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>
              ))}
            </select>

            {/* Refresh prices */}
            {supportedCount > 0 && (
              <button
                onClick={handleRefreshPrices}
                disabled={refreshing}
                className="fm flex items-center gap-1 rounded-lg border border-[#1C2640] bg-[#0E1830] px-2 py-1.5 text-xs font-medium text-[#4E6080] hover:border-[#F59E0B]/30 hover:text-[#F59E0B] disabled:opacity-50 transition-colors"
              >
                <span className={clsx("text-base leading-none", refreshing && "animate-spin")}>↻</span>
                <span className="hidden sm:inline">{refreshing ? t(lang, "app_refreshing") : t(lang, "app_refresh_prices")}</span>
              </button>
            )}

            {/* Demo badge */}
            {mode === "demo" && (
              <span className="fm hidden sm:inline rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-1 text-xs font-semibold text-[#F59E0B] uppercase tracking-wider">
                {t(lang, "app_demo_badge")}
              </span>
            )}
            {mode === "user" && (
              <button
                onClick={() => { if (confirm(t(lang, "app_demo_confirm"))) resetToDemo(); }}
                className="fm hidden sm:flex items-center rounded-lg border border-[#1C2640] bg-[#0E1830] px-2 py-1.5 text-xs font-medium text-[#3E5070] hover:border-[#2A3A50] hover:text-[#B0C4DE] transition-colors"
              >
                {t(lang, "app_demo_reset")}
              </button>
            )}

            {/* Avatar */}
            <Link
              href="/settings"
              title={user ? `${user.name} — ${t(lang, "settings_title")}` : t(lang, "settings_title")}
              className={clsx(
                "flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs font-black text-white transition-opacity hover:opacity-80",
                user ? `bg-${profile.avatarColor}-500` : "bg-[#1C2640]",
              )}
            >
              {user ? getInitials(user.name || profile.name) : "?"}
            </Link>

            {/* Logout */}
            <button
              onClick={() => void logout()}
              title={t(lang, "settings_logout")}
              className="fm rounded-lg border border-[#1C2640] px-2 py-1.5 text-xs text-[#3E5070] hover:border-[#2A3A50] hover:text-[#B0C4DE] transition-colors"
            >
              ↩
            </button>

            {/* Add asset */}
            <button
              onClick={() => setShowAddModal(true)}
              className="fm flex items-center gap-1 rounded-lg bg-[#F59E0B] px-2.5 sm:px-4 py-1.5 text-xs font-bold text-[#0B1120] hover:bg-[#FCD34D] uppercase tracking-wider transition-colors"
            >
              + <span className="hidden sm:inline">{t(lang, "app_add_asset")}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-3 sm:px-6 py-4 sm:py-8">

        {/* Refresh log */}
        {refreshLog.length > 0 && (
          <div className="mb-4 rounded-xl border border-[#1C2640] bg-[#0E1830] p-4">
            <p className="fm mb-2 text-xs font-semibold uppercase tracking-wider text-[#4E6080]">
              {t(lang, "app_refresh_result")}
            </p>
            <div className="space-y-1">
              {refreshLog.map((r) => {
                const asset = assets.find((a) => a.id === r.assetId);
                return (
                  <div key={r.assetId} className="flex items-center gap-3 text-sm">
                    <span
                      className={clsx(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        r.priceCents !== null ? "bg-[#4ADE80]" : "bg-[#F87171]",
                      )}
                    />
                    <span className="fm text-[#B0C4DE]">{asset?.name ?? r.assetId}</span>
                    {r.priceCents !== null ? (
                      <span className="fm text-[#4ADE80]">
                        → {fmtCents(r.priceCents, asset?.currency ?? "EUR")}
                      </span>
                    ) : (
                      <span className="fm text-[#F87171]">{r.error}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {isLoaded && assets.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#1C2640] py-20 text-center">
            <p className="fb text-2xl font-bold text-[#3E5070]">{t(lang, "app_empty_title")}</p>
            <p className="fm mt-2 text-sm text-[#2A3A50]">{t(lang, "app_empty_sub")}</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="fm mt-6 rounded-lg bg-[#F59E0B] px-6 py-2.5 text-sm font-bold text-[#0B1120] hover:bg-[#FCD34D] uppercase tracking-wider transition-colors"
            >
              + {t(lang, "app_add_asset")}
            </button>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {tab === "overview" && assets.length > 0 && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
              <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] p-6">
                <HeroMetrics summary={summary} latestValueCents={latestValue} />
              </div>
              <a href="/analyst" className="block rounded-2xl border border-[#1C2640] bg-[#0E1830] p-5 hover:border-[#F59E0B]/30 transition-colors group">
                <HealthScoreCard health={health} compact />
                <p className="fm mt-3 text-center text-xs text-[#2A3A50] group-hover:text-[#F59E0B] transition-colors uppercase tracking-wider">
                  Open AI Analyst →
                </p>
              </a>
            </div>

            <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] p-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="fm text-xs font-semibold uppercase tracking-wider text-[#4E6080]">{t(lang, "app_portfolio_value")}</h2>
                <div className="flex items-center gap-4 fm text-xs text-[#3E5070]">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-5 rounded bg-[#4ADE80]" />
                    {t(lang, "app_col_value")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-5 rounded bg-[#2A3A50]" />
                    {t(lang, "app_col_invested")}
                  </span>
                </div>
              </div>
              <TrendChart history={history} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] p-6">
                <h2 className="fm mb-1 text-xs font-semibold uppercase tracking-wider text-[#4E6080]">{t(lang, "app_allocation")}</h2>
                <AllocationChart byClass={summary.byClass} />
              </div>

              <div className="lg:col-span-2 rounded-2xl border border-[#1C2640] bg-[#0E1830] p-6">
                <h2 className="fm mb-4 text-xs font-semibold uppercase tracking-wider text-[#4E6080]">{t(lang, "app_by_class")}</h2>
                <div className="space-y-3">
                  {Object.entries(summary.byClass)
                    .sort((a, b) => b[1].totalCurrentValueCents - a[1].totalCurrentValueCents)
                    .map(([cls, s]) => {
                      const pnlPct = s.totalCostCents
                        ? s.unrealizedPnLCents / s.totalCostCents
                        : 0;
                      const isPos = s.unrealizedPnLCents >= 0;
                      return (
                        <div key={cls} className="flex items-center gap-2 sm:gap-4">
                          <p className="fm w-20 sm:w-32 shrink-0 text-xs capitalize text-[#4E6080] truncate">
                            {cls.replace(/_/g, " ")}
                          </p>
                          <div className="flex-1 min-w-0">
                            <div className="h-1.5 overflow-hidden rounded-full bg-[#162035]">
                              <div
                                className="h-full rounded-full bg-[#F59E0B]"
                                style={{ width: `${(s.allocation * 100).toFixed(1)}%` }}
                              />
                            </div>
                          </div>
                          <p className="fm w-9 sm:w-10 text-right text-xs tabular-nums text-[#4E6080]">
                            {(s.allocation * 100).toFixed(1)}%
                          </p>
                          <p className="fm w-20 sm:w-24 text-right text-sm tabular-nums font-medium text-[#E8F0FF]">
                            {fmtCents(s.totalCurrentValueCents)}
                          </p>
                          <p className={clsx(
                            "fm hidden sm:block w-20 text-right text-sm tabular-nums font-semibold",
                            isPos ? "text-[#4ADE80]" : "text-[#F87171]",
                          )}>
                            {isPos ? "+" : ""}{(pnlPct * 100).toFixed(1)}%
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <TopMovers assets={assets} onViewAll={() => setTab("holdings")} />
          </div>
        )}

        {/* ── HOLDINGS ── */}
        {tab === "holdings" && assets.length > 0 && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] p-6">
              <HeroMetrics summary={summary} latestValueCents={latestValue} />
            </div>
            <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] p-2">
              <AssetTable assets={assets} metrics={summary.assetBreakdown} />
            </div>
          </div>
        )}

        {/* ── TAX ── */}
        {tab === "tax" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="fb text-xl font-bold text-[#E8F0FF]">{t(lang, "app_tax_title")}</h2>
                <p className="fm text-sm text-[#4E6080]">{t(lang, "app_tax_sub")}</p>
              </div>
              <div className="flex items-center gap-2 fm text-sm">
                <label className="text-[#4E6080]">{t(lang, "app_tax_year")}</label>
                <select
                  value={taxYear}
                  onChange={(e) => setTaxYear(Number(e.target.value))}
                  className="rounded-lg border border-[#1C2640] bg-[#0E1830] px-3 py-1.5 text-[#E8F0FF] focus:outline-none focus:ring-1 focus:ring-[#F59E0B]/40"
                >
                  {taxYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <TaxReportPanel report={taxReport} />
          </div>
        )}
      </main>

      {showAddModal && <AddAssetModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
