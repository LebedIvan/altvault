import type { Asset, Transaction } from "@/types/asset";
import type { AssetMetrics } from "@/types/portfolio";
import { DAYS_PER_YEAR } from "@/constants/fees";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Compute per-transaction total cost (price × qty + fees + other costs).
 * All values in cents.
 */
function transactionTotalCostCents(tx: Transaction): number {
  return Math.round(tx.pricePerUnitCents * tx.quantity) + tx.feeCents + tx.otherCostsCents;
}

// ─── FIFO cost basis ──────────────────────────────────────────────────────────

interface FifoLot {
  quantity: number;
  costPerUnitCents: number; // inclusive of proportional fees
  purchaseDate: Date;
}

/**
 * Splits buy transactions into FIFO lots and matches them against sells.
 * Returns unrealizedPnL, realizedPnL, unitsHeld, avgDaysHeld.
 */
function computeFifo(
  buys: Transaction[],
  sells: Transaction[],
  now: Date,
): {
  unitsHeld: number;
  totalCostCents: number;
  realizedPnLCents: number;
  unrealizedCostCents: number;
  avgDaysHeld: number;
} {
  // Build FIFO queue of buy lots
  const lots: FifoLot[] = buys
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((tx) => ({
      quantity: tx.quantity,
      // Distribute fee + other costs per unit
      costPerUnitCents:
        tx.pricePerUnitCents +
        Math.round((tx.feeCents + tx.otherCostsCents) / tx.quantity),
      purchaseDate: tx.date,
    }));

  let realizedPnLCents = 0;

  const sortedSells = sells
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const sell of sortedSells) {
    let remainingToSell = sell.quantity;
    const netSellPricePerUnit =
      sell.pricePerUnitCents -
      Math.round((sell.feeCents + sell.otherCostsCents) / sell.quantity);

    while (remainingToSell > 0 && lots.length > 0) {
      const lot = lots[0]!;
      const consumed = Math.min(lot.quantity, remainingToSell);

      realizedPnLCents += Math.round(
        consumed * (netSellPricePerUnit - lot.costPerUnitCents),
      );

      lot.quantity -= consumed;
      remainingToSell -= consumed;

      if (lot.quantity === 0) {
        lots.shift();
      }
    }
  }

  // Remaining lots = open positions
  const unitsHeld = lots.reduce((sum, l) => sum + l.quantity, 0);
  const unrealizedCostCents = lots.reduce(
    (sum, l) => sum + Math.round(l.quantity * l.costPerUnitCents),
    0,
  );

  // Weighted-average days held for open positions
  const avgDaysHeld =
    unitsHeld === 0
      ? 0
      : lots.reduce((sum, l) => sum + l.quantity * daysBetween(l.purchaseDate, now), 0) /
        unitsHeld;

  const totalCostCents =
    buys.reduce((sum, tx) => sum + transactionTotalCostCents(tx), 0);

  return {
    unitsHeld,
    totalCostCents,
    realizedPnLCents,
    unrealizedCostCents,
    avgDaysHeld,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute full AssetMetrics for a single asset using FIFO cost basis.
 */
export function computeAssetMetrics(asset: Asset, now: Date = new Date()): AssetMetrics {
  const buys = asset.transactions.filter((tx) => tx.type === "buy");
  const sells = asset.transactions.filter((tx) => tx.type === "sell");

  const { unitsHeld, totalCostCents, realizedPnLCents, unrealizedCostCents, avgDaysHeld } =
    computeFifo(buys, sells, now);

  const currentValueCents = Math.round(asset.currentPriceCents * unitsHeld);

  // Deduct sell-side platform fee from net value
  const netValueAfterFeeCents = Math.round(
    currentValueCents * (1 - asset.platformFeeRate),
  );

  const unrealizedPnLCents = currentValueCents - unrealizedCostCents;

  const simpleROI =
    unrealizedCostCents === 0 ? 0 : unrealizedPnLCents / unrealizedCostCents;

  // Annualized ROI using CAGR formula: (endValue / startValue)^(365/days) - 1
  const annualizedROI =
    avgDaysHeld < 1 || unrealizedCostCents === 0
      ? 0
      : Math.pow(
          (unrealizedCostCents + unrealizedPnLCents) / unrealizedCostCents,
          DAYS_PER_YEAR / avgDaysHeld,
        ) - 1;

  return {
    assetId: asset.id,
    totalCostCents,
    currentValueCents,
    unrealizedPnLCents,
    realizedPnLCents,
    unitsHeld,
    annualizedROI,
    simpleROI,
    netValueAfterFeeCents,
    avgDaysHeld,
  };
}
