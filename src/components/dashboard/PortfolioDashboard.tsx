"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { HeroMetrics } from "./HeroMetrics";
import { TrendChart } from "./TrendChart";
import { AssetTable } from "./AssetTable";
import { AllocationChart } from "./AllocationChart";
import { TaxReportPanel } from "./TaxReport";
import { AddAssetModal } from "./AddAssetModal";
import { computePortfolioSummary } from "@/lib/calculations/portfolio";
import { buildTaxReport } from "@/lib/calculations/tax";
import { buildPortfolioHistory } from "@/lib/portfolioHistory";
import { formatCents } from "@/lib/formatters";
import { usePortfolio } from "@/store/portfolioStore";
import { refreshAllPrices, type RefreshResult } from "@/lib/priceRefresh";

type Tab = "overview" | "holdings" | "tax";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview",  label: "Обзор"  },
  { key: "holdings",  label: "Активы" },
  { key: "tax",       label: "Налоги" },
];

export function PortfolioDashboard() {
  const { assets, updatePrice, isLoaded } = usePortfolio();

  const [tab, setTab] = useState<Tab>("overview");
  const [taxYear, setTaxYear] = useState(2024);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshLog, setRefreshLog] = useState<RefreshResult[]>([]);

  const summary = computePortfolioSummary(assets);
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
    }
    setRefreshLog(results);
    setRefreshing(false);
  }

  const supportedCount = assets.filter(
    (a) => a.assetClass === "cs2_skins" || a.assetClass === "commodities",
  ).length;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-[#0d1117]/90 backdrop-blur">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-sm font-black text-white">
              A
            </span>
            <span className="text-sm font-semibold tracking-tight">AltVault</span>
          </div>

          <nav className="flex items-center gap-1">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={clsx(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  tab === key
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:text-slate-300",
                )}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Refresh prices */}
            {supportedCount > 0 && (
              <button
                onClick={handleRefreshPrices}
                disabled={refreshing}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-sky-600 hover:text-sky-400 disabled:opacity-50"
              >
                <span className={clsx("text-base leading-none", refreshing && "animate-spin")}>
                  ↻
                </span>
                {refreshing ? "Обновление..." : "Обновить цены"}
              </button>
            )}

            {/* Add asset */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-sky-500"
            >
              + Добавить
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-8">

        {/* Refresh log */}
        {refreshLog.length > 0 && (
          <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Результат обновления цен
            </p>
            <div className="space-y-1">
              {refreshLog.map((r) => {
                const asset = assets.find((a) => a.id === r.assetId);
                return (
                  <div key={r.assetId} className="flex items-center gap-3 text-sm">
                    <span
                      className={clsx(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        r.priceCents !== null ? "bg-emerald-400" : "bg-red-400",
                      )}
                    />
                    <span className="text-slate-300">{asset?.name ?? r.assetId}</span>
                    {r.priceCents !== null ? (
                      <span className="text-emerald-400">
                        → {formatCents(r.priceCents, asset?.currency ?? "EUR")}
                      </span>
                    ) : (
                      <span className="text-red-400">{r.error}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {isLoaded && assets.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 py-20 text-center">
            <p className="text-2xl font-bold text-slate-500">Портфель пуст</p>
            <p className="mt-2 text-sm text-slate-600">
              Добавьте первый актив, чтобы начать отслеживание
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-6 rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
            >
              + Добавить актив
            </button>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {tab === "overview" && assets.length > 0 && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <HeroMetrics summary={summary} latestValueCents={latestValue} />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-300">Динамика портфеля</h2>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-5 rounded bg-emerald-500" />
                    Стоимость
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-5 rounded bg-slate-500" />
                    Вложено
                  </span>
                </div>
              </div>
              <TrendChart history={history} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="mb-1 text-sm font-semibold text-slate-300">Распределение</h2>
                <AllocationChart byClass={summary.byClass} />
              </div>

              <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="mb-4 text-sm font-semibold text-slate-300">По классам активов</h2>
                <div className="space-y-3">
                  {Object.entries(summary.byClass)
                    .sort((a, b) => b[1].totalCurrentValueCents - a[1].totalCurrentValueCents)
                    .map(([cls, s]) => {
                      const pnlPct = s.totalCostCents
                        ? s.unrealizedPnLCents / s.totalCostCents
                        : 0;
                      const isPos = s.unrealizedPnLCents >= 0;
                      return (
                        <div key={cls} className="flex items-center gap-4">
                          <p className="w-32 shrink-0 text-sm capitalize text-slate-400">
                            {cls.replace(/_/g, " ")}
                          </p>
                          <div className="flex-1">
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-sky-500"
                                style={{ width: `${(s.allocation * 100).toFixed(1)}%` }}
                              />
                            </div>
                          </div>
                          <p className="w-10 text-right text-xs tabular-nums text-slate-400">
                            {(s.allocation * 100).toFixed(1)}%
                          </p>
                          <p className="w-24 text-right text-sm tabular-nums font-medium text-white">
                            {formatCents(s.totalCurrentValueCents)}
                          </p>
                          <p className={clsx(
                            "w-20 text-right text-sm tabular-nums font-semibold",
                            isPos ? "text-emerald-400" : "text-red-400",
                          )}>
                            {isPos ? "+" : ""}{(pnlPct * 100).toFixed(1)}%
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── HOLDINGS ── */}
        {tab === "holdings" && assets.length > 0 && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <HeroMetrics summary={summary} latestValueCents={latestValue} />
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-2">
              <AssetTable assets={assets} metrics={summary.assetBreakdown} />
            </div>
          </div>
        )}

        {/* ── TAX ── */}
        {tab === "tax" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Отчёт по налогам IRPF</h2>
                <p className="text-sm text-slate-500">
                  Испания — прирост капитала (base del ahorro)
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <label className="text-slate-500">Год:</label>
                <select
                  value={taxYear}
                  onChange={(e) => setTaxYear(Number(e.target.value))}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
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
