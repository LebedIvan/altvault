import { computeAssetMetrics } from "@/lib/calculations/pnl";
import type { Asset } from "@/types/asset";
import { randomUUID } from "crypto";

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  const id = randomUUID();
  return {
    id,
    name: "Test Card",
    assetClass: "trading_cards",
    currency: "EUR",
    currentPriceCents: 10_000, // €100.00
    liquidityDays: 7,
    riskScore: 40,
    platformFeeRate: 0.025,
    holdingCostCents: 0,
    transactions: [],
    tags: [],
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

describe("computeAssetMetrics", () => {
  const now = new Date("2025-01-01");

  it("returns zero metrics when no transactions exist", () => {
    const asset = makeAsset();
    const metrics = computeAssetMetrics(asset, now);
    expect(metrics.unitsHeld).toBe(0);
    expect(metrics.unrealizedPnLCents).toBe(0);
    expect(metrics.realizedPnLCents).toBe(0);
    expect(metrics.simpleROI).toBe(0);
    expect(metrics.annualizedROI).toBe(0);
  });

  it("computes unrealized P&L for a single open position", () => {
    const asset = makeAsset({
      currentPriceCents: 15_000, // €150
      transactions: [
        {
          id: randomUUID(),
          assetId: "x",
          type: "buy",
          pricePerUnitCents: 10_000, // €100
          quantity: 2,
          currency: "EUR",
          feeCents: 500, // €5
          otherCostsCents: 0,
          date: new Date("2024-01-01"),
          platform: "TCGPlayer",
        },
      ],
    });

    const metrics = computeAssetMetrics(asset, now);

    // Cost basis: 2 × €100 + €5 fee = €205
    expect(metrics.totalCostCents).toBe(20_500);
    // Current value: 2 × €150 = €300
    expect(metrics.currentValueCents).toBe(30_000);
    // Unrealized P&L: €300 - €205 = €95
    expect(metrics.unrealizedPnLCents).toBe(9_500);
    expect(metrics.unitsHeld).toBe(2);
    expect(metrics.realizedPnLCents).toBe(0);
    expect(metrics.simpleROI).toBeCloseTo(9_500 / 20_500, 4);
  });

  it("computes realized P&L using FIFO on a partial sell", () => {
    const assetId = randomUUID();
    const asset = makeAsset({
      id: assetId,
      currentPriceCents: 20_000,
      transactions: [
        {
          id: randomUUID(),
          assetId,
          type: "buy",
          pricePerUnitCents: 10_000,
          quantity: 3,
          currency: "EUR",
          feeCents: 0,
          otherCostsCents: 0,
          date: new Date("2024-01-01"),
          platform: "eBay",
        },
        {
          id: randomUUID(),
          assetId,
          type: "sell",
          pricePerUnitCents: 15_000,
          quantity: 1,
          currency: "EUR",
          feeCents: 0,
          otherCostsCents: 0,
          date: new Date("2024-06-01"),
          platform: "eBay",
        },
      ],
    });

    const metrics = computeAssetMetrics(asset, now);

    // Realized: sold 1 unit @ €150 vs cost €100 → +€50
    expect(metrics.realizedPnLCents).toBe(5_000);
    // 2 units remain
    expect(metrics.unitsHeld).toBe(2);
    // Unrealized: 2 × €200 - 2 × €100 = €200
    expect(metrics.unrealizedPnLCents).toBe(20_000);
  });

  it("correctly nets a loss (buy high, sell low)", () => {
    const assetId = randomUUID();
    const asset = makeAsset({
      id: assetId,
      currentPriceCents: 5_000,
      transactions: [
        {
          id: randomUUID(),
          assetId,
          type: "buy",
          pricePerUnitCents: 10_000,
          quantity: 1,
          currency: "EUR",
          feeCents: 0,
          otherCostsCents: 0,
          date: new Date("2024-01-01"),
          platform: "eBay",
        },
        {
          id: randomUUID(),
          assetId,
          type: "sell",
          pricePerUnitCents: 7_000,
          quantity: 1,
          currency: "EUR",
          feeCents: 0,
          otherCostsCents: 0,
          date: new Date("2024-06-01"),
          platform: "eBay",
        },
      ],
    });

    const metrics = computeAssetMetrics(asset, now);
    expect(metrics.realizedPnLCents).toBe(-3_000);
    expect(metrics.unitsHeld).toBe(0);
  });

  it("deducts platform fee from netValueAfterFeeCents", () => {
    const asset = makeAsset({
      currentPriceCents: 10_000,
      platformFeeRate: 0.10,
      transactions: [
        {
          id: randomUUID(),
          assetId: "x",
          type: "buy",
          pricePerUnitCents: 8_000,
          quantity: 1,
          currency: "EUR",
          feeCents: 0,
          otherCostsCents: 0,
          date: new Date("2024-01-01"),
          platform: "eBay",
        },
      ],
    });

    const metrics = computeAssetMetrics(asset, now);
    // Net value: €100 × (1 - 0.10) = €90
    expect(metrics.netValueAfterFeeCents).toBe(9_000);
  });
});
