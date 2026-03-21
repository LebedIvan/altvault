"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePortfolio } from "@/store/portfolioStore";
import { computeAssetMetrics } from "@/lib/calculations/pnl";
import { fetchLatestPrice } from "@/lib/priceRefresh";
import { AssetHeader } from "./AssetHeader";
import { PriceHistoryChart } from "./PriceHistoryChart";
import { AssetDetails } from "./AssetDetails";
import { EbaySoldPanel } from "./EbaySoldPanel";
import { SellAssetModal } from "@/components/dashboard/SellAssetModal";
import type { Asset } from "@/types/asset";

function buildComicsEbayQuery(asset: Asset): string {
  const base = asset.name.split(" — ")[0]?.trim() ?? asset.name;
  const gradePart = asset.grade ? ` CGC ${asset.grade}` : "";
  return `${base}${gradePart} comic`;
}

export function AssetPageClient() {
  const { id } = useParams<{ id: string }>();
  const { assets, isLoaded, updatePrice } = usePortfolio();
  const [showSell, setShowSell] = useState(false);

  // Price refresh state
  const [refreshing, setRefreshing]     = useState(false);
  const [priceSource, setPriceSource]   = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1120]">
        <div className="fm text-[#4E6080]">Загрузка...</div>
      </div>
    );
  }

  const asset = assets.find((a) => a.id === id);
  if (!asset) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0B1120]">
        <p className="text-[#4E6080]">Актив не найден</p>
        <Link href="/" className="text-[#F59E0B] hover:underline text-sm">
          ← Вернуться в портфель
        </Link>
      </div>
    );
  }

  const metrics = computeAssetMetrics(asset);

  async function handleRefreshPrice() {
    setRefreshing(true);
    setRefreshError(null);
    const result = await fetchLatestPrice(asset!);
    setRefreshing(false);
    if (result.priceCents !== null) {
      updatePrice(asset!.id, result.priceCents);
      setPriceSource(result.source ?? null);
    } else if (result.skipped) {
      setRefreshError("Нет автоматического источника цены — введите вручную");
    } else {
      setRefreshError(result.error ?? "Ошибка обновления");
    }
  }

  function handleManualPrice(priceCents: number) {
    updatePrice(asset!.id, priceCents);
    setPriceSource("Ручной ввод");
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-[#E8F0FF]">
      {/* Navbar */}
      <header className="sticky top-0 z-20 border-b border-[#1C2640] bg-[#0B1120]/90 backdrop-blur">
        <div className="mx-auto flex max-w-screen-xl items-center gap-4 px-6 py-3">
          <Link
            href="/app"
            className="flex items-center gap-2 text-[#4E6080] hover:text-[#B0C4DE] transition-colors text-sm"
          >
            ← Портфель
          </Link>
          <span className="text-[#1C2640]">/</span>
          <span className="text-sm font-medium text-[#B0C4DE] truncate max-w-xs">
            {asset.name}
          </span>
          <div className="ml-auto">
            <button
              onClick={() => setShowSell(true)}
              className="rounded-lg bg-[#F87171]/20 px-4 py-1.5 text-sm font-semibold text-[#F87171] hover:bg-[#F87171]/40 transition-colors"
            >
              Продать
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-8">
        <div className="space-y-6">
          <AssetHeader
            asset={asset}
            metrics={metrics}
            refreshing={refreshing}
            priceSource={priceSource}
            refreshError={refreshError}
            onRefreshPrice={handleRefreshPrice}
            onManualPrice={handleManualPrice}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <PriceHistoryChart asset={asset} />
              {/* eBay sold data — shown when asset has a name to search */}
              {asset.name && (
                <EbaySoldPanel
                  query={asset.assetClass === "comics" ? buildComicsEbayQuery(asset) : asset.name}
                  currency={asset.currency}
                />
              )}
            </div>
            <div className="lg:col-span-1">
              <AssetDetails asset={asset} metrics={metrics} />
            </div>
          </div>
        </div>
      </main>

      {showSell && (
        <SellAssetModal asset={asset} onClose={() => setShowSell(false)} />
      )}
    </div>
  );
}
