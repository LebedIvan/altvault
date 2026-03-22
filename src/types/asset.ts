import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const AssetClassSchema = z.enum([
  "trading_cards",
  "basketball_cards",
  "football_cards",
  "hockey_cards",
  "american_football_cards",
  "comics",
  "lego",
  "cs2_skins",
  "music_royalties",
  "p2p_lending",
  "domain_names",
  "anime_cels",
  "commodities",
  "sports_betting",
  "games_tech",
]);

export type AssetClass = z.infer<typeof AssetClassSchema>;

export const CurrencySchema = z.enum(["EUR", "USD", "GBP"]);
export type Currency = z.infer<typeof CurrencySchema>;

export const ConditionSchema = z.enum([
  "mint",
  "near_mint",
  "excellent",
  "good",
  "fair",
  "poor",
]);
export type Condition = z.infer<typeof ConditionSchema>;

// ─── Transaction ──────────────────────────────────────────────────────────────

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  assetId: z.string().uuid(),
  type: z.enum(["buy", "sell"]),
  /** Amount in cents (integer), always in asset's base currency */
  pricePerUnitCents: z.number().int().positive(),
  quantity: z.number().positive(),
  currency: CurrencySchema,
  /** Platform fee in cents */
  feeCents: z.number().int().nonnegative(),
  /** Shipping + insurance in cents */
  otherCostsCents: z.number().int().nonnegative(),
  date: z.coerce.date(),
  platform: z.string(),
  notes: z.string().optional(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

// ─── Asset ────────────────────────────────────────────────────────────────────

export const PriceSnapshotLiteSchema = z.object({
  date: z.string(),           // "YYYY-MM-DD"
  priceCents: z.number().int().nonnegative(),
});
export type PriceSnapshotLite = z.infer<typeof PriceSnapshotLiteSchema>;

export const AssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  assetClass: AssetClassSchema,
  /** External identifier (e.g. Pokémon card set/number, Steam item name) */
  externalId: z.string().optional(),
  condition: ConditionSchema.optional(),
  /** PSA/BGS numeric grade, if professionally graded */
  grade: z.number().min(1).max(10).optional(),
  currency: CurrencySchema,
  /** Current market price in cents */
  currentPriceCents: z.number().int().nonnegative(),
  /** Historical price snapshots — one per day, recorded on each auto-refresh */
  priceSnapshots: z.array(PriceSnapshotLiteSchema).default([]),
  /** Estimated days to liquidate */
  liquidityDays: z.number().int().positive(),
  /** 0–100 composite risk score (higher = riskier) */
  riskScore: z.number().min(0).max(100),
  /** Platform fee percentage as a decimal (e.g. 0.025 = 2.5%) */
  platformFeeRate: z.number().min(0).max(1),
  /** Monthly storage/insurance cost in cents */
  holdingCostCents: z.number().int().nonnegative().default(0),
  transactions: z.array(TransactionSchema),
  tags: z.array(z.string()).default([]),
  /** Card/skin image URL for display */
  imageUrl: z.string().url().optional(),
  /** Small thumbnail URL */
  imageThumbnailUrl: z.string().url().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  // Games & Tech specific (optional, only populated for games_tech)
  cexSellPriceCents:  z.number().int().nonnegative().optional(),
  cexBuyPriceCents:   z.number().int().nonnegative().optional(),
  loosePriceCents:    z.number().int().nonnegative().optional(),
  cibPriceCents:      z.number().int().nonnegative().optional(),
  ebayMedianCents:    z.number().int().nonnegative().optional(),
});

export type Asset = z.infer<typeof AssetSchema>;

// ─── Price snapshot (for history charts) ─────────────────────────────────────

export const PriceSnapshotSchema = z.object({
  assetId: z.string().uuid(),
  priceCents: z.number().int().nonnegative(),
  currency: CurrencySchema,
  source: z.string(),
  recordedAt: z.coerce.date(),
});

export type PriceSnapshot = z.infer<typeof PriceSnapshotSchema>;
