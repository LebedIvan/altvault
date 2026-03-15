import type { Asset } from "@/types/asset";

/**
 * Mock portfolio data for development/demo.
 * All monetary values in EUR cents.
 */
export const MOCK_ASSETS: Asset[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Charizard Base Set PSA 9",
    assetClass: "trading_cards",
    externalId: "PSA-12345678",
    condition: "mint",
    grade: 9,
    currency: "EUR",
    currentPriceCents: 45_000_00, // €4,500
    liquidityDays: 14,
    riskScore: 35,
    platformFeeRate: 0.025,
    holdingCostCents: 500, // €5/month
    tags: ["pokemon", "graded", "base-set"],
    createdAt: new Date("2023-03-15"),
    updatedAt: new Date("2025-03-01"),
    transactions: [
      {
        id: "t1111111-0000-0000-0000-000000000001",
        assetId: "11111111-1111-1111-1111-111111111111",
        type: "buy",
        pricePerUnitCents: 280_000, // €2,800
        quantity: 1,
        currency: "EUR",
        feeCents: 7_000, // €70 fee
        otherCostsCents: 15_00, // €15 shipping
        date: new Date("2023-03-15"),
        platform: "eBay",
      },
    ],
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "LEGO Icons Eiffel Tower 10307",
    assetClass: "lego",
    externalId: "10307",
    condition: "mint",
    currency: "EUR",
    currentPriceCents: 62_000, // €620
    liquidityDays: 30,
    riskScore: 25,
    platformFeeRate: 0.10,
    holdingCostCents: 0,
    tags: ["icons", "retired", "sealed"],
    createdAt: new Date("2023-11-20"),
    updatedAt: new Date("2025-03-01"),
    transactions: [
      {
        id: "t2222222-0000-0000-0000-000000000001",
        assetId: "22222222-2222-2222-2222-222222222222",
        type: "buy",
        pricePerUnitCents: 42_999, // €429.99 (retail)
        quantity: 2,
        currency: "EUR",
        feeCents: 0,
        otherCostsCents: 1_200,
        date: new Date("2023-11-20"),
        platform: "LEGO Store",
      },
    ],
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "AK-47 | Redline (Field-Tested)",
    assetClass: "cs2_skins",
    externalId: "AK-47 | Redline (Field-Tested)",
    condition: "good",
    currency: "EUR",
    currentPriceCents: 3_500, // €35
    liquidityDays: 1,
    riskScore: 60,
    platformFeeRate: 0.15,
    holdingCostCents: 0,
    tags: ["rifle", "field-tested"],
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2025-03-01"),
    transactions: [
      {
        id: "t3333333-0000-0000-0000-000000000001",
        assetId: "33333333-3333-3333-3333-333333333333",
        type: "buy",
        pricePerUnitCents: 2_100,
        quantity: 5,
        currency: "EUR",
        feeCents: 0,
        otherCostsCents: 0,
        date: new Date("2024-01-10"),
        platform: "Steam Market",
      },
      {
        id: "t3333333-0000-0000-0000-000000000002",
        assetId: "33333333-3333-3333-3333-333333333333",
        type: "sell",
        pricePerUnitCents: 2_800,
        quantity: 2,
        currency: "EUR",
        feeCents: 0,
        otherCostsCents: 0,
        date: new Date("2024-05-15"),
        platform: "Steam Market",
      },
    ],
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    name: "Silver 1oz Maple Leaf (×10)",
    assetClass: "commodities",
    externalId: "SILVER-MAPLE-1OZ",
    condition: "mint",
    currency: "EUR",
    currentPriceCents: 3_150, // €31.50/oz
    liquidityDays: 5,
    riskScore: 30,
    platformFeeRate: 0.015,
    holdingCostCents: 200,
    tags: ["silver", "bullion", "maple-leaf"],
    createdAt: new Date("2023-06-01"),
    updatedAt: new Date("2025-03-01"),
    transactions: [
      {
        id: "t4444444-0000-0000-0000-000000000001",
        assetId: "44444444-4444-4444-4444-444444444444",
        type: "buy",
        pricePerUnitCents: 2_700,
        quantity: 10,
        currency: "EUR",
        feeCents: 500,
        otherCostsCents: 800,
        date: new Date("2023-06-01"),
        platform: "Andorrano Metales",
      },
    ],
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    name: "Indie Song Royalty Share (Spotify Top 50)",
    assetClass: "music_royalties",
    externalId: "ROYALTY-SPOTIFY-2024-001",
    currency: "EUR",
    currentPriceCents: 8_500_00, // €8,500
    liquidityDays: 90,
    riskScore: 50,
    platformFeeRate: 0.05,
    holdingCostCents: 0,
    tags: ["royalty", "spotify", "streaming"],
    createdAt: new Date("2024-02-14"),
    updatedAt: new Date("2025-03-01"),
    transactions: [
      {
        id: "t5555555-0000-0000-0000-000000000001",
        assetId: "55555555-5555-5555-5555-555555555555",
        type: "buy",
        pricePerUnitCents: 6_000_00, // €6,000
        quantity: 1,
        currency: "EUR",
        feeCents: 30_000, // €300 fee
        otherCostsCents: 0,
        date: new Date("2024-02-14"),
        platform: "Royalty Exchange",
      },
    ],
  },
  {
    id: "66666666-6666-6666-6666-666666666666",
    name: "investtech.com domain",
    assetClass: "domain_names",
    externalId: "investtech.com",
    currency: "EUR",
    currentPriceCents: 15_000_00, // €15,000
    liquidityDays: 180,
    riskScore: 70,
    platformFeeRate: 0.10,
    holdingCostCents: 1_500, // €15/year → ~€1.25/month
    tags: ["fintech", "premium", "dot-com"],
    createdAt: new Date("2022-08-10"),
    updatedAt: new Date("2025-03-01"),
    transactions: [
      {
        id: "t6666666-0000-0000-0000-000000000001",
        assetId: "66666666-6666-6666-6666-666666666666",
        type: "buy",
        pricePerUnitCents: 5_000_00,
        quantity: 1,
        currency: "EUR",
        feeCents: 50_000, // €500 Sedo fee
        otherCostsCents: 0,
        date: new Date("2022-08-10"),
        platform: "Sedo",
      },
    ],
  },
];
