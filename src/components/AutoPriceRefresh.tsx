"use client";

import { useEffect, useRef } from "react";
import { usePortfolio } from "@/store/portfolioStore";
import { refreshAllPrices } from "@/lib/priceRefresh";
import type { Asset } from "@/types/asset";

const INTERVAL_MS        = 24 * 60 * 60 * 1000; // 24 hours
const LAST_REFRESH_KEY   = "vaulty_last_auto_refresh";
const BACKFILLED_KEY     = "vaulty_backfilled_ids_v2"; // comma-separated asset IDs

// ─── Server helpers ───────────────────────────────────────────────────────────

/** Seed the DB with current prices for ALL assets (first run only). */
async function seedIfEmpty() {
  try {
    await fetch("/api/snapshots/seed", { method: "POST" });
  } catch { /* non-critical */ }
}

/**
 * Backfill historical data for assets that haven't been backfilled yet.
 * Currently fetches up to 10Y of weekly data for commodity metals from Yahoo Finance.
 */
async function backfillNew(assets: Asset[]) {
  const done = new Set(
    (localStorage.getItem(BACKFILLED_KEY) ?? "").split(",").filter(Boolean),
  );

  const newAssets = assets.filter((a) => !done.has(a.id));
  if (newAssets.length === 0) return;

  const commodities    = newAssets.filter((a) => a.assetClass === "commodities");
  const tradingCards   = newAssets.filter((a) => a.assetClass === "trading_cards");

  const toMark: string[] = [];

  // Commodities → Yahoo Finance 10Y weekly history
  if (commodities.length > 0) {
    try {
      await fetch("/api/snapshots/backfill", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          assets: commodities.map((a) => ({
            assetId: a.id, name: a.name, assetClass: a.assetClass,
          })),
        }),
      });
      toMark.push(...commodities.map((a) => a.id));
    } catch { /* non-critical */ }
  }

  // Trading cards → TCGdex avg1/avg7/avg30 (Pokemon) + MTGJSON 90d (MTG)
  if (tradingCards.length > 0) {
    try {
      await fetch("/api/snapshots/backfill/trading-cards", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          assets: tradingCards.map((a) => ({
            assetId:    a.id,
            name:       a.name,
            assetClass: a.assetClass,
            externalId: a.externalId,
          })),
        }),
      });
      toMark.push(...tradingCards.map((a) => a.id));
    } catch { /* non-critical */ }
  }

  if (toMark.length > 0) {
    const allDone = Array.from(done).concat(toMark).join(",");
    localStorage.setItem(BACKFILLED_KEY, allDone);
  }
}

/**
 * Push today's snapshot for ALL assets to the server-side DB.
 * Assets with a refreshed price use the new price;
 * others use their current localStorage price.
 */
async function persistSnapshots(assets: Asset[], priceMap: Map<string, number>) {
  const today = new Date().toISOString().slice(0, 10);
  const snapshots = assets.map((a) => ({
    assetId:    a.id,
    name:       a.name,
    assetClass: a.assetClass,
    priceCents: priceMap.get(a.id) ?? a.currentPriceCents,
    date:       today,
  }));

  try {
    await fetch("/api/snapshots", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ snapshots }),
    });
  } catch { /* non-critical */ }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AutoPriceRefresh() {
  const { assets, updatePrice, updateAsset, isLoaded } = usePortfolio();

  const assetsRef       = useRef(assets);
  const updatePriceRef  = useRef(updatePrice);
  const updateAssetRef  = useRef(updateAsset);
  useEffect(() => { assetsRef.current = assets; }, [assets]);
  useEffect(() => { updatePriceRef.current = updatePrice; }, [updatePrice]);
  useEffect(() => { updateAssetRef.current = updateAsset; }, [updateAsset]);

  useEffect(() => {
    if (!isLoaded) return;

    // 1. Seed DB with current prices if it's empty (first ever run)
    void seedIfEmpty();

    // 2. Backfill historical data for commodity assets not yet backfilled
    void backfillNew(assetsRef.current);

    async function run() {
      const currentAssets = assetsRef.current;

      // 3. Refresh market prices for supported asset classes
      const results  = await refreshAllPrices(currentAssets);
      const priceMap = new Map<string, number>();
      for (const r of results) {
        if (r.priceCents !== null) {
          updatePriceRef.current(r.assetId, r.priceCents);
          priceMap.set(r.assetId, r.priceCents);
        }
        if (r.extraPatch) {
          updateAssetRef.current(r.assetId, r.extraPatch);
        }
      }

      // 4. Snapshot ALL assets (real price or currentPriceCents)
      await persistSnapshots(currentAssets, priceMap);

      localStorage.setItem(LAST_REFRESH_KEY, String(Date.now()));
    }

    const last = parseInt(localStorage.getItem(LAST_REFRESH_KEY) ?? "0", 10);
    if (Date.now() - last > INTERVAL_MS) void run();

    const timer = setInterval(run, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isLoaded]);

  return null;
}
