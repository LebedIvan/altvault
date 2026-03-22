/**
 * Demo seed data — curated 16-asset portfolio representing a real alt-investor.
 * Loaded into localStorage when the portfolio is empty in demo mode.
 */
import type { Asset, AssetClass, Currency, Condition } from "@/types/asset";

// ─── Seeded PRNG (LCG) ────────────────────────────────────────────────────────

function makePrng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223;
    return (s >>> 0) / 0xffffffff;
  };
}

// Module-level rng — always reset before use via generateSeedAssets()
let rng = makePrng(0xdeadbeef);

// Deterministic UUID v4-format
function uid(): string {
  const h = (n: number) => {
    let s = "";
    for (let i = 0; i < n; i++) s += Math.floor(rng() * 16).toString(16);
    return s;
  };
  return `${h(8)}-${h(4)}-4${h(3)}-${(8 | Math.floor(rng() * 4)).toString(16)}${h(3)}-${h(12)}`;
}

// Fixed anchor — "today" for the seed
const ANCHOR = new Date("2026-03-15T12:00:00Z");

function daysAgo(n: number): Date {
  return new Date(ANCHOR.getTime() - n * 86_400_000);
}

// ─── Template types ────────────────────────────────────────────────────────────

interface ItemTemplate {
  name: string;
  assetClass: AssetClass;
  currency: Currency;
  currentPriceCents: number;    // current market price in cents
  buyRatio: number;             // buyPrice = currentPrice * buyRatio  (per unit)
  daysAgo: number;              // when the buy happened
  qty: number;
  platform: string;
  liquidityDays: number;
  riskScore: number;
  platformFeeRate: number;      // decimal (e.g. 0.10)
  condition?: Condition;
  grade?: number;
  externalId?: string;
  imageUrl?: string;
  imageThumbnailUrl?: string;
  loosePriceCents?: number;
  cibPriceCents?: number;
}

// ─── Curated demo portfolio ────────────────────────────────────────────────────
// 16 real assets, March 2026 prices, ~€45k total value.
// Mix of winners, modest gains, and one slight loser (palladium) for realism.

const TEMPLATES: ItemTemplate[] = [

  // ── Pokémon TCG ──────────────────────────────────────────────────────────────
  {
    // One of the most sought-after modern Pokémon cards; +56% since purchase
    name: "Charizard VMAX Alternate Art (Evolving Skies #218)",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 21000, buyRatio: 0.64, daysAgo: 580,
    qty: 1, platform: "Cardmarket",
    liquidityDays: 14, riskScore: 58, platformFeeRate: 0.05,
    condition: "near_mint", externalId: "swsh7-218",
    imageThumbnailUrl: "https://assets.tcgdex.net/en/swsh/swsh7/218/low.webp",
    imageUrl: "https://assets.tcgdex.net/en/swsh/swsh7/218/high.webp",
  },
  {
    // Most expensive Eevee evolution card; +63% since purchase
    name: "Umbreon VMAX Alternate Art (Evolving Skies #215)",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 16000, buyRatio: 0.61, daysAgo: 490,
    qty: 1, platform: "Cardmarket",
    liquidityDays: 14, riskScore: 60, platformFeeRate: 0.05,
    condition: "near_mint", externalId: "swsh7-215",
    imageThumbnailUrl: "https://assets.tcgdex.net/en/swsh/swsh7/215/low.webp",
    imageUrl: "https://assets.tcgdex.net/en/swsh/swsh7/215/high.webp",
  },
  {
    // Popular bulk Pokémon buy; modest +31% gain
    name: "Pikachu VMAX Rainbow Rare (Vivid Voltage #188)",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 5500, buyRatio: 0.76, daysAgo: 340,
    qty: 2, platform: "eBay",
    liquidityDays: 7, riskScore: 52, platformFeeRate: 0.10,
    condition: "near_mint", externalId: "swsh4-188",
    imageThumbnailUrl: "https://assets.tcgdex.net/en/swsh/swsh4/188/low.webp",
    imageUrl: "https://assets.tcgdex.net/en/swsh/swsh4/188/high.webp",
  },

  // ── Magic: The Gathering ──────────────────────────────────────────────────────
  {
    // Reserved List staple; always in demand for Legacy/Vintage
    name: "Force of Will (Alliances) — MTG",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 7800, buyRatio: 0.87, daysAgo: 200,
    qty: 4, platform: "Cardmarket",
    liquidityDays: 14, riskScore: 35, platformFeeRate: 0.05,
    condition: "near_mint",
  },
  {
    // Modern all-time staple; one of the most played non-basic lands
    name: "Liliana of the Veil (Innistrad) — MTG",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 5400, buyRatio: 0.93, daysAgo: 120,
    qty: 2, platform: "Cardmarket",
    liquidityDays: 14, riskScore: 38, platformFeeRate: 0.05,
    condition: "near_mint",
  },

  // ── LEGO ─────────────────────────────────────────────────────────────────────
  {
    // OG UCS Falcon — only 9,999 produced; retired 2007. +69% gain.
    name: "LEGO 10179 UCS Millennium Falcon (2007)",
    assetClass: "lego", currency: "EUR",
    currentPriceCents: 540000, buyRatio: 0.59, daysAgo: 690,
    qty: 1, platform: "Bricklink",
    liquidityDays: 60, riskScore: 32, platformFeeRate: 0.05,
    condition: "mint", externalId: "10179",
  },
  {
    // Modern Millennium Falcon — bought at retail, now premium
    name: "LEGO 75192 Millennium Falcon (2017)",
    assetClass: "lego", currency: "EUR",
    currentPriceCents: 89000, buyRatio: 0.79, daysAgo: 510,
    qty: 1, platform: "LEGO Store",
    liquidityDays: 30, riskScore: 30, platformFeeRate: 0.03,
    condition: "mint", externalId: "75192",
  },
  {
    // Icons flagship set; still rising since retirement
    name: "LEGO 10307 Eiffel Tower",
    assetClass: "lego", currency: "EUR",
    currentPriceCents: 61000, buyRatio: 0.82, daysAgo: 350,
    qty: 1, platform: "LEGO Store",
    liquidityDays: 25, riskScore: 28, platformFeeRate: 0.03,
    condition: "mint", externalId: "10307",
  },

  // ── CS2 Skins ─────────────────────────────────────────────────────────────────
  {
    // The most iconic AWP skin; FN is the rarest condition. +34% since buy.
    name: "AWP | Dragon Lore (Factory New)",
    assetClass: "cs2_skins", currency: "EUR",
    currentPriceCents: 145000, buyRatio: 0.75, daysAgo: 560,
    qty: 1, platform: "Steam Market",
    liquidityDays: 2, riskScore: 65, platformFeeRate: 0.13,
  },
  {
    // Contraband rarity — can never be re-released. +28% gain.
    name: "AK-47 | Fire Serpent (Minimal Wear)",
    assetClass: "cs2_skins", currency: "EUR",
    currentPriceCents: 82000, buyRatio: 0.78, daysAgo: 440,
    qty: 1, platform: "Steam Market",
    liquidityDays: 2, riskScore: 63, platformFeeRate: 0.13,
  },

  // ── Precious Metals ───────────────────────────────────────────────────────────
  {
    // 5 oz physical gold bar; inflation hedge. Gold at ~$3,100/oz in Mar 2026.
    name: "Gold (5 troy oz) — PAMP Suisse Bar",
    assetClass: "commodities", currency: "EUR",
    currentPriceCents: 1420000, buyRatio: 0.81, daysAgo: 350,
    qty: 1, platform: "Atkinsons Bullion",
    liquidityDays: 5, riskScore: 20, platformFeeRate: 0.01,
  },
  {
    // Silver 100oz COMEX bar — silver at ~$34/oz
    name: "Silver (100 troy oz) — COMEX Bar",
    assetClass: "commodities", currency: "EUR",
    currentPriceCents: 311000, buyRatio: 0.84, daysAgo: 430,
    qty: 1, platform: "Atkinsons Bullion",
    liquidityDays: 7, riskScore: 28, platformFeeRate: 0.02,
  },

  // ── Comics ────────────────────────────────────────────────────────────────────
  {
    // 1st appearance of Venom — one of the most iconic key issues. CGC 9.8.
    name: "Amazing Spider-Man #300 CGC 9.8 (1988) — 1st Venom",
    assetClass: "comics", currency: "USD",
    currentPriceCents: 118000, buyRatio: 0.64, daysAgo: 450,
    qty: 1, platform: "eBay",
    liquidityDays: 21, riskScore: 48, platformFeeRate: 0.10,
    condition: "mint", grade: 9.8, externalId: "cv-29584",
  },
  {
    // 1st appearance of Deadpool — consistently rising. CGC 9.8.
    name: "New Mutants #98 CGC 9.8 (1991) — 1st Deadpool",
    assetClass: "comics", currency: "USD",
    currentPriceCents: 92000, buyRatio: 0.67, daysAgo: 380,
    qty: 1, platform: "eBay",
    liquidityDays: 21, riskScore: 50, platformFeeRate: 0.10,
    condition: "mint", grade: 9.8, externalId: "cv-47765",
  },

  // ── Sports Cards ──────────────────────────────────────────────────────────────
  {
    // LeBron's most iconic RC; PSA 9 is the sweet spot for value. +62% return.
    name: "LeBron James 2003-04 Topps Chrome Rookie PSA 9",
    assetClass: "basketball_cards", currency: "USD",
    currentPriceCents: 84000, buyRatio: 0.62, daysAgo: 600,
    qty: 1, platform: "eBay",
    liquidityDays: 21, riskScore: 45, platformFeeRate: 0.10,
    condition: "mint", grade: 9,
  },
  {
    // The GOAT RC. PSA 7 — accessible grade with strong collector demand.
    name: "Michael Jordan 1986-87 Fleer Rookie PSA 7",
    assetClass: "basketball_cards", currency: "USD",
    currentPriceCents: 410000, buyRatio: 0.78, daysAgo: 650,
    qty: 1, platform: "Heritage Auctions",
    liquidityDays: 45, riskScore: 38, platformFeeRate: 0.15,
    condition: "excellent", grade: 7,
  },

  // ── Games & Tech ──────────────────────────────────────────────────────────────
  {
    // Chibi-Robo! GameCube (loose) — rare cult classic, highly sought after
    name: "Chibi-Robo! GameCube (Loose)",
    assetClass: "games_tech", currency: "USD",
    currentPriceCents: 14000, buyRatio: 0.29, daysAgo: 2400,
    qty: 1, platform: "eBay",
    liquidityDays: 14, riskScore: 45, platformFeeRate: 0.10,
    condition: "fair", externalId: "45654",
    loosePriceCents: 14000, cibPriceCents: 9000,
  },
  {
    // PS2 Slim Console — iconic compact redesign, great CIB condition
    name: "PS2 Slim Console (Complete)",
    assetClass: "games_tech", currency: "USD",
    currentPriceCents: 9500, buyRatio: 0.42, daysAgo: 900,
    qty: 1, platform: "eBay",
    liquidityDays: 14, riskScore: 40, platformFeeRate: 0.10,
    condition: "near_mint",
    loosePriceCents: 7000, cibPriceCents: 9500,
  },
  {
    // Pokémon Platinum DS (CIB) — one of the most valuable DS games
    name: "Nintendo DS Pokemon Platinum (CIB)",
    assetClass: "games_tech", currency: "USD",
    currentPriceCents: 8500, buyRatio: 0.55, daysAgo: 600,
    qty: 1, platform: "eBay",
    liquidityDays: 14, riskScore: 45, platformFeeRate: 0.10,
    condition: "near_mint", externalId: "52883",
    loosePriceCents: 8500, cibPriceCents: 12000,
  },
];

// ─── Builder ─────────────────────────────────────────────────────────────────

export function generateSeedAssets(): Asset[] {
  // Always reset PRNG so IDs are identical on every call
  rng = makePrng(0xdeadbeef);

  return TEMPLATES.map((t): Asset => {
    const assetId = uid();
    const txId    = uid();

    const buyPriceCents = Math.round(t.currentPriceCents * t.buyRatio);
    const buyDate       = daysAgo(t.daysAgo);

    return {
      id:                assetId,
      name:              t.name,
      assetClass:        t.assetClass,
      externalId:        t.externalId,
      condition:         t.condition,
      grade:             t.grade,
      currency:          t.currency,
      currentPriceCents: t.currentPriceCents,
      liquidityDays:     t.liquidityDays,
      riskScore:         t.riskScore,
      platformFeeRate:   t.platformFeeRate,
      holdingCostCents:  0,
      tags:              [],
      priceSnapshots:    [],
      imageUrl:          t.imageUrl,
      imageThumbnailUrl: t.imageThumbnailUrl,
      loosePriceCents:   t.loosePriceCents,
      cibPriceCents:     t.cibPriceCents,
      createdAt:         buyDate,
      updatedAt:         ANCHOR,
      transactions: [
        {
          id:                txId,
          assetId,
          type:              "buy",
          pricePerUnitCents: Math.round(buyPriceCents / t.qty),
          quantity:          t.qty,
          currency:          t.currency,
          feeCents:          Math.round(buyPriceCents * t.platformFeeRate * 0.5),
          otherCostsCents:   0,
          date:              buyDate,
          platform:          t.platform,
        },
      ],
    };
  });
}

/** Returns true when this looks like a fresh (empty) portfolio */
export function portfolioNeedsSeed(assets: Asset[]): boolean {
  return assets.length === 0;
}
