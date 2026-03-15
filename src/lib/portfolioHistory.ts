import type { Asset } from "@/types/asset";
import type { HistoryPoint } from "@/data/mockHistory";

/** Format a Date as YYYY-MM-DD using local time. */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a stored date (may be ISO UTC string or Date) as a local YYYY-MM-DD string. */
function txDateStr(date: Date | string): string {
  const d = new Date(date);
  // If the stored value is a UTC-midnight ISO string like "2025-03-15T00:00:00.000Z",
  // reading it as local date may shift by ±1 day. Avoid that by reading the UTC parts.
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Advance a YYYY-MM-DD string by one day. */
function nextDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return toDateStr(d);
}

/**
 * Build daily portfolio history from real transaction data.
 *
 * Cost basis  → 100% accurate (derived from buy/sell transactions).
 * Value       → interpolated linearly from average buy price to current market price.
 *               Intermediate values are estimates; real intraday history needs a price API.
 */
export function buildPortfolioHistory(assets: Asset[]): HistoryPoint[] {
  if (assets.length === 0) return [];

  // Earliest transaction date across all assets
  const allDates = assets.flatMap((a) =>
    a.transactions.map((t) => txDateStr(t.date)),
  );
  if (allDates.length === 0) return [];

  const startStr = allDates.reduce((a, b) => (a < b ? a : b));
  const todayStr  = toDateStr(new Date());

  const points: HistoryPoint[] = [];
  let cursor = startStr;

  while (cursor <= todayStr) {
    let costCents  = 0;
    let valueCents = 0;

    for (const asset of assets) {
      // Transactions on or before cursor date (string comparison is safe for ISO dates)
      const txs = asset.transactions
        .filter((tx) => txDateStr(tx.date) <= cursor)
        .sort((a, b) => txDateStr(a.date).localeCompare(txDateStr(b.date)));

      if (txs.length === 0) continue;

      let unitsHeld       = 0;
      let totalCostAtDay  = 0;
      let firstBuyStr: string | null = null;

      for (const tx of txs) {
        if (tx.type === "buy") {
          unitsHeld      += tx.quantity;
          totalCostAtDay +=
            Math.round(tx.pricePerUnitCents * tx.quantity) +
            tx.feeCents +
            tx.otherCostsCents;
          if (firstBuyStr === null) firstBuyStr = txDateStr(tx.date);
        } else {
          if (unitsHeld > 0) {
            const costPerUnit = totalCostAtDay / unitsHeld;
            const removed     = Math.min(tx.quantity, unitsHeld);
            totalCostAtDay   -= Math.round(removed * costPerUnit);
            unitsHeld        -= removed;
          }
        }
      }

      if (unitsHeld <= 0 || firstBuyStr === null) continue;

      costCents += totalCostAtDay;

      // Interpolate value from avg-buy-price → current price over the holding period
      const totalDays   = dateDiffDays(firstBuyStr, todayStr);
      const elapsedDays = dateDiffDays(firstBuyStr, cursor);

      if (totalDays <= 0) {
        valueCents += totalCostAtDay;
      } else {
        const fraction           = Math.min(1, Math.max(0, elapsedDays / totalDays));
        const avgBuyPricePerUnit = totalCostAtDay / unitsHeld;
        const interpolated       =
          avgBuyPricePerUnit +
          fraction * (asset.currentPriceCents - avgBuyPricePerUnit);
        valueCents += Math.round(unitsHeld * interpolated);
      }
    }

    points.push({ date: cursor, valueCents, costCents });
    cursor = nextDay(cursor);
  }

  return points;
}

/** Days between two YYYY-MM-DD strings (b - a). */
function dateDiffDays(a: string, b: string): number {
  const msA = new Date(a + "T00:00:00Z").getTime();
  const msB = new Date(b + "T00:00:00Z").getTime();
  return Math.round((msB - msA) / 86_400_000);
}

/**
 * Build daily history for a single asset.
 */
export function buildSingleAssetHistory(asset: Asset): HistoryPoint[] {
  return buildPortfolioHistory([asset]);
}
