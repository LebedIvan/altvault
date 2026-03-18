import type { Asset } from "@/types/asset";
import type { HistoryPoint } from "@/data/mockHistory";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function txDateStr(date: Date | string): string {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return toDateStr(d);
}

function dateDiffDays(a: string, b: string): number {
  const msA = new Date(a + "T00:00:00Z").getTime();
  const msB = new Date(b + "T00:00:00Z").getTime();
  return Math.round((msB - msA) / 86_400_000);
}

// ─── Seeded Brownian bridge ────────────────────────────────────────────────────

/** FNV-1a hash — turns a string into a numeric seed */
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Daily volatility by asset class */
const VOL_BY_CLASS: Record<string, number> = {
  commodities:     0.008,
  cs2_skins:       0.020,
  trading_cards:   0.025,
  lego:            0.006,
  music_royalties: 0.003,
  p2p_lending:     0.001,
  domain_names:    0.015,
  anime_cels:      0.018,
  sports_betting:  0.035,
};

/**
 * Builds a deterministic price path from startPrice → endPrice over N days.
 * Uses a seeded LCG + Box-Muller for a Brownian bridge pinned at both ends.
 */
function buildBrownianBridge(
  seed: number,
  N: number,
  startPrice: number,
  endPrice: number,
  dailyVol: number,
): number[] {
  if (N <= 0) return [startPrice];

  let s = seed >>> 0;
  function rng(): number {
    s = Math.imul(1664525, s) + 1013904223;
    return (s >>> 0) / 0xffffffff;
  }
  function randn(): number {
    const u1 = Math.max(rng(), 1e-10);
    const u2 = rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  const walk = new Float64Array(N + 1);
  for (let i = 1; i <= N; i++) walk[i] = (walk[i - 1] ?? 0) + randn();
  const finalVal = walk[N] ?? 0;
  for (let i = 0; i <= N; i++) walk[i] = (walk[i] ?? 0) - (i / N) * finalVal;

  const logS = Math.log(Math.max(startPrice, 1));
  const logE = Math.log(Math.max(endPrice, 1));
  const totalDrift = logE - logS;

  const prices: number[] = [];
  for (let i = 0; i <= N; i++) {
    prices.push(Math.exp(logS + (i / N) * totalDrift + dailyVol * (walk[i] ?? 0)));
  }
  return prices;
}

// ─── Pre-computed price paths ──────────────────────────────────────────────────

interface AssetPath {
  firstBuyStr: string;
  path: number[]; // price-per-unit at each day (index 0 = firstBuy, index N = today)
}

function buildAssetPath(asset: Asset, todayStr: string): AssetPath | null {
  const buys = asset.transactions.filter((tx) => tx.type === "buy");
  if (buys.length === 0) return null;

  const firstBuyStr = buys
    .map((tx) => txDateStr(tx.date))
    .reduce((a, b) => (a < b ? a : b));

  const totalDays = dateDiffDays(firstBuyStr, todayStr);
  if (totalDays <= 0) return null;

  // Average buy price per unit across all buys
  const totalUnits = buys.reduce((s, tx) => s + tx.quantity, 0);
  const totalCost = buys.reduce(
    (s, tx) =>
      s +
      Math.round(tx.pricePerUnitCents * tx.quantity) +
      tx.feeCents +
      tx.otherCostsCents,
    0,
  );
  const avgBuyPricePerUnit = totalUnits > 0 ? totalCost / totalUnits : asset.currentPriceCents;

  const vol = VOL_BY_CLASS[asset.assetClass] ?? 0.012;

  // Build anchor points from real price snapshots
  const rawSnapshots = (asset.priceSnapshots ?? [])
    .filter((s) => s.date > firstBuyStr && s.date <= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Deduplicate by date (one per day by design, but be safe)
  const seenDates = new Set<string>();
  const snapshots = rawSnapshots.filter((s) => {
    if (seenDates.has(s.date)) return false;
    seenDates.add(s.date);
    return true;
  });

  interface Anchor { date: string; price: number }
  const anchors: Anchor[] = [
    { date: firstBuyStr, price: avgBuyPricePerUnit },
    ...snapshots.map((s) => ({ date: s.date, price: s.priceCents })),
  ];
  // Add today's anchor only if not already covered by a snapshot
  const lastAnchor = anchors[anchors.length - 1];
  if (!lastAnchor || lastAnchor.date !== todayStr) {
    anchors.push({ date: todayStr, price: asset.currentPriceCents });
  }

  // Allocate full path array
  const path = new Float64Array(totalDays + 1);

  // Fill each segment between consecutive anchors with a Brownian bridge
  for (let i = 0; i < anchors.length - 1; i++) {
    const segStart = anchors[i];
    const segEnd   = anchors[i + 1];
    if (!segStart || !segEnd) continue;
    const startIdx = dateDiffDays(firstBuyStr, segStart.date);
    const endIdx   = dateDiffDays(firstBuyStr, segEnd.date);
    const N        = endIdx - startIdx;
    if (N <= 0) continue;

    const seed = hashStr(asset.id + "_seg_" + i);
    const segPrices = buildBrownianBridge(seed, N, segStart.price, segEnd.price, vol);

    for (let j = 0; j <= N; j++) {
      path[startIdx + j] = segPrices[j] ?? 0;
    }
  }

  return { firstBuyStr, path: Array.from(path) };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildPortfolioHistory(assets: Asset[]): HistoryPoint[] {
  if (assets.length === 0) return [];

  const todayStr = toDateStr(new Date());

  const paths = new Map<string, AssetPath>();
  for (const asset of assets) {
    const p = buildAssetPath(asset, todayStr);
    if (p) paths.set(asset.id, p);
  }

  const allDates = assets.flatMap((a) => a.transactions.map((t) => txDateStr(t.date)));
  if (allDates.length === 0) return [];
  const startStr = allDates.reduce((a, b) => (a < b ? a : b));

  const points: HistoryPoint[] = [];
  let cursor = startStr;

  while (cursor <= todayStr) {
    let costCents = 0;
    let valueCents = 0;

    for (const asset of assets) {
      const txs = asset.transactions
        .filter((tx) => txDateStr(tx.date) <= cursor)
        .sort((a, b) => txDateStr(a.date).localeCompare(txDateStr(b.date)));

      if (txs.length === 0) continue;

      let unitsHeld = 0;
      let totalCostAtDay = 0;
      let firstBuyStr: string | null = null;

      for (const tx of txs) {
        if (tx.type === "buy") {
          unitsHeld += tx.quantity;
          totalCostAtDay +=
            Math.round(tx.pricePerUnitCents * tx.quantity) +
            tx.feeCents +
            tx.otherCostsCents;
          if (firstBuyStr === null) firstBuyStr = txDateStr(tx.date);
        } else {
          if (unitsHeld > 0) {
            const costPerUnit = totalCostAtDay / unitsHeld;
            const removed = Math.min(tx.quantity, unitsHeld);
            totalCostAtDay -= Math.round(removed * costPerUnit);
            unitsHeld -= removed;
          }
        }
      }

      if (unitsHeld <= 0 || firstBuyStr === null) continue;

      costCents += totalCostAtDay;

      const pathInfo = paths.get(asset.id);
      if (!pathInfo) {
        valueCents += totalCostAtDay;
        continue;
      }

      const elapsedDays = dateDiffDays(pathInfo.firstBuyStr, cursor);
      if (elapsedDays < 0) {
        valueCents += totalCostAtDay;
        continue;
      }

      const pricePerUnit = pathInfo.path[Math.min(elapsedDays, pathInfo.path.length - 1)] ?? 0;
      valueCents += Math.round(unitsHeld * pricePerUnit);
    }

    points.push({ date: cursor, valueCents, costCents });
    cursor = nextDay(cursor);
  }

  return points;
}

export function buildSingleAssetHistory(asset: Asset): HistoryPoint[] {
  return buildPortfolioHistory([asset]);
}
