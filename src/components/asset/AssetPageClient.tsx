"use client";

import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { usePortfolio } from "@/store/portfolioStore";
import { computeAssetMetrics } from "@/lib/calculations/pnl";
import { AssetHeader } from "./AssetHeader";
import { PriceHistoryChart } from "./PriceHistoryChart";
import { AssetDetails } from "./AssetDetails";

export function AssetPageClient() {
  const { id } = useParams<{ id: string }>();
  const { assets, isLoaded } = usePortfolio();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1117]">
        <div className="text-slate-500">Загрузка...</div>
      </div>
    );
  }

  const asset = assets.find((a) => a.id === id);
  if (!asset) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0d1117]">
        <p className="text-slate-400">Актив не найден</p>
        <Link href="/" className="text-sky-400 hover:underline text-sm">
          ← Вернуться в портфель
        </Link>
      </div>
    );
  }

  const metrics = computeAssetMetrics(asset);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-[#0d1117]/90 backdrop-blur">
        <div className="mx-auto flex max-w-screen-xl items-center gap-4 px-6 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm"
          >
            ← Портфель
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-sm font-medium text-slate-300 truncate max-w-xs">
            {asset.name}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-8">
        <div className="space-y-6">
          {/* Header */}
          <AssetHeader asset={asset} metrics={metrics} />

          {/* Main layout: chart + sidebar */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Chart — 2/3 width */}
            <div className="lg:col-span-2">
              <PriceHistoryChart asset={asset} />
            </div>

            {/* Details sidebar — 1/3 width */}
            <div className="lg:col-span-1">
              <AssetDetails asset={asset} metrics={metrics} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
