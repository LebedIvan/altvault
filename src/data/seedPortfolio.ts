/**
 * Demo seed data — 15 assets per category, deterministic (seeded LCG).
 * Loaded into localStorage when the portfolio is empty.
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
  buyRatio: number;             // buyPrice = currentPrice * buyRatio
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
}

// ─── Item templates ───────────────────────────────────────────────────────────

const TEMPLATES: ItemTemplate[] = [

  // ── Trading Cards — Pokémon ──────────────────────────────────────────────────
  {
    name: "Charizard VMAX — Secret Rare (Sword & Shield Promos)",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 38000, buyRatio: 0.72, daysAgo: 580,
    qty: 1, platform: "Cardmarket",
    liquidityDays: 21, riskScore: 60, platformFeeRate: 0.05,
    condition: "near_mint", externalId: "swshp-SWSH050",
    imageThumbnailUrl: "https://assets.tcgdex.net/en/swsh/swshp/SWSH050/low.webp",
    imageUrl: "https://assets.tcgdex.net/en/swsh/swshp/SWSH050/high.webp",
  },
  {
    name: "Umbreon VMAX Alternate Art (Evolving Skies)",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 22000, buyRatio: 0.68, daysAgo: 490,
    qty: 1, platform: "Cardmarket",
    liquidityDays: 21, riskScore: 62, platformFeeRate: 0.05,
    condition: "near_mint", externalId: "swsh7-215",
    imageThumbnailUrl: "https://assets.tcgdex.net/en/swsh/swsh7/215/low.webp",
    imageUrl: "https://assets.tcgdex.net/en/swsh/swsh7/215/high.webp",
  },
  {
    name: "Pikachu VMAX Rainbow Rare (Vivid Voltage)",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 6800, buyRatio: 0.80, daysAgo: 340,
    qty: 2, platform: "eBay",
    liquidityDays: 14, riskScore: 55, platformFeeRate: 0.10,
    condition: "near_mint", externalId: "swsh4-188",
    imageThumbnailUrl: "https://assets.tcgdex.net/en/swsh/swsh4/188/low.webp",
    imageUrl: "https://assets.tcgdex.net/en/swsh/swsh4/188/high.webp",
  },
  {
    name: "Lugia V Alternate Art (Silver Tempest)",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 13500, buyRatio: 0.74, daysAgo: 420,
    qty: 1, platform: "Cardmarket",
    liquidityDays: 21, riskScore: 58, platformFeeRate: 0.05,
    condition: "near_mint", externalId: "swsh12-186",
    imageThumbnailUrl: "https://assets.tcgdex.net/en/swsh/swsh12/186/low.webp",
    imageUrl: "https://assets.tcgdex.net/en/swsh/swsh12/186/high.webp",
  },
  {
    name: "Rayquaza VMAX Alternate Art (Evolving Skies)",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 28000, buyRatio: 0.66, daysAgo: 600,
    qty: 1, platform: "Cardmarket",
    liquidityDays: 21, riskScore: 63, platformFeeRate: 0.05,
    condition: "near_mint", externalId: "swsh7-218",
    imageThumbnailUrl: "https://assets.tcgdex.net/en/swsh/swsh7/218/low.webp",
    imageUrl: "https://assets.tcgdex.net/en/swsh/swsh7/218/high.webp",
  },
  {
    name: "Mew VMAX Secret Rainbow Rare (Fusion Strike)",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 9200, buyRatio: 0.85, daysAgo: 250,
    qty: 1, platform: "eBay",
    liquidityDays: 14, riskScore: 57, platformFeeRate: 0.10,
    condition: "near_mint", externalId: "swsh8-269",
    imageThumbnailUrl: "https://assets.tcgdex.net/en/swsh/swsh8/269/low.webp",
    imageUrl: "https://assets.tcgdex.net/en/swsh/swsh8/269/high.webp",
  },
  {
    name: "Giratina V Alternate Art (Lost Origin)",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 11000, buyRatio: 0.78, daysAgo: 310,
    qty: 1, platform: "Cardmarket",
    liquidityDays: 21, riskScore: 59, platformFeeRate: 0.05,
    condition: "near_mint", externalId: "swsh11-182",
    imageThumbnailUrl: "https://assets.tcgdex.net/en/swsh/swsh11/182/low.webp",
    imageUrl: "https://assets.tcgdex.net/en/swsh/swsh11/182/high.webp",
  },
  {
    name: "Arceus VSTAR Rainbow Rare (Brilliant Stars)",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 4200, buyRatio: 0.90, daysAgo: 180,
    qty: 3, platform: "Cardmarket",
    liquidityDays: 14, riskScore: 50, platformFeeRate: 0.05,
    condition: "near_mint", externalId: "swsh9-186",
    imageThumbnailUrl: "https://assets.tcgdex.net/en/swsh/swsh9/186/low.webp",
    imageUrl: "https://assets.tcgdex.net/en/swsh/swsh9/186/high.webp",
  },
  {
    name: "Gardevoir ex Special Art Rare (Scarlet & Violet)",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 17500, buyRatio: 0.70, daysAgo: 450,
    qty: 1, platform: "Cardmarket",
    liquidityDays: 21, riskScore: 60, platformFeeRate: 0.05,
    condition: "near_mint", externalId: "sv1-197",
    imageThumbnailUrl: "https://assets.tcgdex.net/en/sv/sv1/197/low.webp",
    imageUrl: "https://assets.tcgdex.net/en/sv/sv1/197/high.webp",
  },
  {
    name: "Charizard ex Special Art Rare (Obsidian Flames)",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 19000, buyRatio: 0.73, daysAgo: 380,
    qty: 1, platform: "Cardmarket",
    liquidityDays: 21, riskScore: 62, platformFeeRate: 0.05,
    condition: "near_mint", externalId: "sv3-228",
    imageThumbnailUrl: "https://assets.tcgdex.net/en/sv/sv3/228/low.webp",
    imageUrl: "https://assets.tcgdex.net/en/sv/sv3/228/high.webp",
  },
  // MTG
  {
    name: "Black Lotus (Alpha) — MTG",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 280000, buyRatio: 0.82, daysAgo: 650,
    qty: 1, platform: "Heritage Auctions",
    liquidityDays: 90, riskScore: 45, platformFeeRate: 0.15,
    condition: "good", externalId: "alpha-black-lotus",
  },
  {
    name: "Mox Sapphire (Beta) — MTG",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 140000, buyRatio: 0.77, daysAgo: 520,
    qty: 1, platform: "Cardmarket",
    liquidityDays: 60, riskScore: 43, platformFeeRate: 0.05,
    condition: "excellent",
  },
  {
    name: "Force of Will (Alliances) — MTG",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 7800, buyRatio: 0.88, daysAgo: 200,
    qty: 4, platform: "Cardmarket",
    liquidityDays: 14, riskScore: 35, platformFeeRate: 0.05,
    condition: "near_mint",
  },
  {
    name: "Liliana of the Veil (Innistrad) — MTG",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 5500, buyRatio: 0.92, daysAgo: 120,
    qty: 2, platform: "Cardmarket",
    liquidityDays: 14, riskScore: 38, platformFeeRate: 0.05,
    condition: "near_mint",
  },
  {
    name: "Shaymin-EX (EX: Holon Phantoms) — Pokémon PSA 10",
    assetClass: "trading_cards", currency: "EUR",
    currentPriceCents: 55000, buyRatio: 0.65, daysAgo: 680,
    qty: 1, platform: "eBay",
    liquidityDays: 45, riskScore: 50, platformFeeRate: 0.10,
    condition: "mint", grade: 10,
  },

  // ── LEGO ─────────────────────────────────────────────────────────────────────
  {
    name: "LEGO 10179 Ultimate Collector's Millennium Falcon (2007)",
    assetClass: "lego", currency: "EUR",
    currentPriceCents: 480000, buyRatio: 0.62, daysAgo: 690,
    qty: 1, platform: "Bricklink",
    liquidityDays: 60, riskScore: 35, platformFeeRate: 0.05,
    condition: "mint", externalId: "10179",
  },
  {
    name: "LEGO 75192 Millennium Falcon (2017)",
    assetClass: "lego", currency: "EUR",
    currentPriceCents: 89000, buyRatio: 0.78, daysAgo: 510,
    qty: 1, platform: "Bricklink",
    liquidityDays: 30, riskScore: 33, platformFeeRate: 0.05,
    condition: "mint", externalId: "75192",
  },
  {
    name: "LEGO 10294 Titanic",
    assetClass: "lego", currency: "EUR",
    currentPriceCents: 68000, buyRatio: 0.81, daysAgo: 400,
    qty: 1, platform: "LEGO Store",
    liquidityDays: 30, riskScore: 32, platformFeeRate: 0.03,
    condition: "mint", externalId: "10294",
  },
  {
    name: "LEGO 75313 AT-AT",
    assetClass: "lego", currency: "EUR",
    currentPriceCents: 82000, buyRatio: 0.76, daysAgo: 460,
    qty: 1, platform: "LEGO Store",
    liquidityDays: 30, riskScore: 34, platformFeeRate: 0.03,
    condition: "mint", externalId: "75313",
  },
  {
    name: "LEGO 10307 Eiffel Tower",
    assetClass: "lego", currency: "EUR",
    currentPriceCents: 62000, buyRatio: 0.83, daysAgo: 350,
    qty: 1, platform: "LEGO Store",
    liquidityDays: 25, riskScore: 30, platformFeeRate: 0.03,
    condition: "mint", externalId: "10307",
  },
  {
    name: "LEGO 10305 Lion Knights' Castle",
    assetClass: "lego", currency: "EUR",
    currentPriceCents: 43000, buyRatio: 0.85, daysAgo: 280,
    qty: 1, platform: "LEGO Store",
    liquidityDays: 25, riskScore: 30, platformFeeRate: 0.03,
    condition: "mint", externalId: "10305",
  },
  {
    name: "LEGO 21309 NASA Apollo Saturn V",
    assetClass: "lego", currency: "EUR",
    currentPriceCents: 58000, buyRatio: 0.60, daysAgo: 660,
    qty: 1, platform: "Bricklink",
    liquidityDays: 30, riskScore: 32, platformFeeRate: 0.05,
    condition: "mint", externalId: "21309",
  },
  {
    name: "LEGO 75252 Imperial Star Destroyer",
    assetClass: "lego", currency: "EUR",
    currentPriceCents: 77000, buyRatio: 0.74, daysAgo: 530,
    qty: 1, platform: "Bricklink",
    liquidityDays: 30, riskScore: 33, platformFeeRate: 0.05,
    condition: "mint", externalId: "75252",
  },
  {
    name: "LEGO 71043 Hogwarts Castle",
    assetClass: "lego", currency: "EUR",
    currentPriceCents: 52000, buyRatio: 0.79, daysAgo: 420,
    qty: 1, platform: "Bricklink",
    liquidityDays: 30, riskScore: 31, platformFeeRate: 0.05,
    condition: "mint", externalId: "71043",
  },
  {
    name: "LEGO 10276 Colosseum",
    assetClass: "lego", currency: "EUR",
    currentPriceCents: 58000, buyRatio: 0.80, daysAgo: 390,
    qty: 1, platform: "LEGO Store",
    liquidityDays: 25, riskScore: 30, platformFeeRate: 0.03,
    condition: "mint", externalId: "10276",
  },
  {
    name: "LEGO 10255 Assembly Square",
    assetClass: "lego", currency: "EUR",
    currentPriceCents: 39000, buyRatio: 0.70, daysAgo: 580,
    qty: 1, platform: "Bricklink",
    liquidityDays: 30, riskScore: 32, platformFeeRate: 0.05,
    condition: "mint", externalId: "10255",
  },
  {
    name: "LEGO 42143 Ferrari Daytona SP3",
    assetClass: "lego", currency: "EUR",
    currentPriceCents: 44000, buyRatio: 0.82, daysAgo: 310,
    qty: 1, platform: "LEGO Store",
    liquidityDays: 25, riskScore: 31, platformFeeRate: 0.03,
    condition: "mint", externalId: "42143",
  },
  {
    name: "LEGO 75341 The Razor Crest",
    assetClass: "lego", currency: "EUR",
    currentPriceCents: 71000, buyRatio: 0.72, daysAgo: 545,
    qty: 1, platform: "Bricklink",
    liquidityDays: 30, riskScore: 33, platformFeeRate: 0.05,
    condition: "mint", externalId: "75341",
  },
  {
    name: "LEGO 10300 Back to the Future Time Machine",
    assetClass: "lego", currency: "EUR",
    currentPriceCents: 24000, buyRatio: 0.86, daysAgo: 230,
    qty: 1, platform: "LEGO Store",
    liquidityDays: 20, riskScore: 28, platformFeeRate: 0.03,
    condition: "mint", externalId: "10300",
  },
  {
    name: "LEGO 10318 Concorde",
    assetClass: "lego", currency: "EUR",
    currentPriceCents: 21000, buyRatio: 0.88, daysAgo: 175,
    qty: 1, platform: "LEGO Store",
    liquidityDays: 20, riskScore: 28, platformFeeRate: 0.03,
    condition: "mint", externalId: "10318",
  },

  // ── CS2 Skins ─────────────────────────────────────────────────────────────────
  {
    name: "AWP | Dragon Lore (Factory New)",
    assetClass: "cs2_skins", currency: "EUR",
    currentPriceCents: 148000, buyRatio: 0.78, daysAgo: 560,
    qty: 1, platform: "Steam Market",
    liquidityDays: 2, riskScore: 68, platformFeeRate: 0.13,
  },
  {
    name: "M4A4 | Howl (Field-Tested)",
    assetClass: "cs2_skins", currency: "EUR",
    currentPriceCents: 195000, buyRatio: 0.73, daysAgo: 620,
    qty: 1, platform: "Steam Market",
    liquidityDays: 3, riskScore: 70, platformFeeRate: 0.13,
  },
  {
    name: "AK-47 | Fire Serpent (Minimal Wear)",
    assetClass: "cs2_skins", currency: "EUR",
    currentPriceCents: 82000, buyRatio: 0.80, daysAgo: 440,
    qty: 1, platform: "Steam Market",
    liquidityDays: 2, riskScore: 67, platformFeeRate: 0.13,
  },
  {
    name: "Karambit | Doppler Phase 2 (Factory New)",
    assetClass: "cs2_skins", currency: "EUR",
    currentPriceCents: 91000, buyRatio: 0.82, daysAgo: 380,
    qty: 1, platform: "Steam Market",
    liquidityDays: 2, riskScore: 66, platformFeeRate: 0.13,
  },
  {
    name: "AWP | Medusa (Minimal Wear)",
    assetClass: "cs2_skins", currency: "EUR",
    currentPriceCents: 49000, buyRatio: 0.85, daysAgo: 300,
    qty: 1, platform: "Steam Market",
    liquidityDays: 2, riskScore: 65, platformFeeRate: 0.13,
  },
  {
    name: "Sport Gloves | Pandora's Box (Minimal Wear)",
    assetClass: "cs2_skins", currency: "EUR",
    currentPriceCents: 118000, buyRatio: 0.77, daysAgo: 490,
    qty: 1, platform: "Steam Market",
    liquidityDays: 3, riskScore: 69, platformFeeRate: 0.13,
  },
  {
    name: "Butterfly Knife | Fade (Factory New)",
    assetClass: "cs2_skins", currency: "EUR",
    currentPriceCents: 68000, buyRatio: 0.83, daysAgo: 350,
    qty: 1, platform: "Steam Market",
    liquidityDays: 2, riskScore: 66, platformFeeRate: 0.13,
  },
  {
    name: "AK-47 | Wild Lotus (Factory New)",
    assetClass: "cs2_skins", currency: "EUR",
    currentPriceCents: 31000, buyRatio: 0.87, daysAgo: 210,
    qty: 1, platform: "Steam Market",
    liquidityDays: 2, riskScore: 63, platformFeeRate: 0.13,
  },
  {
    name: "M4A1-S | Welcome to the Jungle (Factory New)",
    assetClass: "cs2_skins", currency: "EUR",
    currentPriceCents: 19500, buyRatio: 0.91, daysAgo: 155,
    qty: 1, platform: "Steam Market",
    liquidityDays: 1, riskScore: 60, platformFeeRate: 0.13,
  },
  {
    name: "AK-47 | Gold Arabesque (Factory New)",
    assetClass: "cs2_skins", currency: "EUR",
    currentPriceCents: 38000, buyRatio: 0.84, daysAgo: 270,
    qty: 1, platform: "Steam Market",
    liquidityDays: 2, riskScore: 64, platformFeeRate: 0.13,
  },
  {
    name: "Desert Eagle | Blaze (Factory New)",
    assetClass: "cs2_skins", currency: "EUR",
    currentPriceCents: 15200, buyRatio: 0.93, daysAgo: 110,
    qty: 2, platform: "Steam Market",
    liquidityDays: 1, riskScore: 58, platformFeeRate: 0.13,
  },
  {
    name: "Glock-18 | Fade (Factory New)",
    assetClass: "cs2_skins", currency: "EUR",
    currentPriceCents: 34000, buyRatio: 0.86, daysAgo: 240,
    qty: 1, platform: "Steam Market",
    liquidityDays: 2, riskScore: 62, platformFeeRate: 0.13,
  },
  {
    name: "USP-S | Kill Confirmed (Factory New)",
    assetClass: "cs2_skins", currency: "EUR",
    currentPriceCents: 8400, buyRatio: 0.94, daysAgo: 90,
    qty: 2, platform: "Steam Market",
    liquidityDays: 1, riskScore: 55, platformFeeRate: 0.13,
  },
  {
    name: "M4A4 | Poseidon (Factory New)",
    assetClass: "cs2_skins", currency: "EUR",
    currentPriceCents: 24000, buyRatio: 0.89, daysAgo: 190,
    qty: 1, platform: "Steam Market",
    liquidityDays: 2, riskScore: 61, platformFeeRate: 0.13,
  },
  {
    name: "AWP | Gungnir (Minimal Wear)",
    assetClass: "cs2_skins", currency: "EUR",
    currentPriceCents: 56000, buyRatio: 0.81, daysAgo: 410,
    qty: 1, platform: "Steam Market",
    liquidityDays: 3, riskScore: 67, platformFeeRate: 0.13,
  },

  // ── Music Royalties ──────────────────────────────────────────────────────────
  {
    name: "\"Midnight Rain\" — Indie Folk Catalog (5% share)",
    assetClass: "music_royalties", currency: "EUR",
    currentPriceCents: 210000, buyRatio: 0.75, daysAgo: 580,
    qty: 1, platform: "Royalty Exchange",
    liquidityDays: 180, riskScore: 28, platformFeeRate: 0.05,
  },
  {
    name: "\"Electric Dreams\" — EDM Catalog (8% share)",
    assetClass: "music_royalties", currency: "EUR",
    currentPriceCents: 145000, buyRatio: 0.80, daysAgo: 490,
    qty: 1, platform: "Royalty Exchange",
    liquidityDays: 180, riskScore: 30, platformFeeRate: 0.05,
  },
  {
    name: "\"City Lights\" — Lo-Fi Hip Hop Bundle (3% share)",
    assetClass: "music_royalties", currency: "EUR",
    currentPriceCents: 95000, buyRatio: 0.84, daysAgo: 390,
    qty: 1, platform: "Royalty Exchange",
    liquidityDays: 180, riskScore: 32, platformFeeRate: 0.05,
  },
  {
    name: "\"Epic Orchestral Vol. 1\" — Film Scoring Catalog",
    assetClass: "music_royalties", currency: "EUR",
    currentPriceCents: 380000, buyRatio: 0.72, daysAgo: 650,
    qty: 1, platform: "Royalty Exchange",
    liquidityDays: 365, riskScore: 25, platformFeeRate: 0.05,
  },
  {
    name: "\"Northern Stars\" — Singer-Songwriter (10% share)",
    assetClass: "music_royalties", currency: "EUR",
    currentPriceCents: 285000, buyRatio: 0.78, daysAgo: 520,
    qty: 1, platform: "Royalty Exchange",
    liquidityDays: 180, riskScore: 27, platformFeeRate: 0.05,
  },
  {
    name: "\"Rhythm & Soul\" — R&B Catalog Bundle",
    assetClass: "music_royalties", currency: "EUR",
    currentPriceCents: 230000, buyRatio: 0.82, daysAgo: 420,
    qty: 1, platform: "Royalty Exchange",
    liquidityDays: 180, riskScore: 29, platformFeeRate: 0.05,
  },
  {
    name: "\"Desert Wind\" — Ambient / Chill Catalog",
    assetClass: "music_royalties", currency: "EUR",
    currentPriceCents: 72000, buyRatio: 0.88, daysAgo: 260,
    qty: 1, platform: "Royalty Exchange",
    liquidityDays: 180, riskScore: 33, platformFeeRate: 0.05,
  },
  {
    name: "\"Jazz Café Sessions\" — Jazz Catalog (6% share)",
    assetClass: "music_royalties", currency: "EUR",
    currentPriceCents: 165000, buyRatio: 0.79, daysAgo: 470,
    qty: 1, platform: "Royalty Exchange",
    liquidityDays: 180, riskScore: 26, platformFeeRate: 0.05,
  },
  {
    name: "\"Synthetic Emotions\" — Synthwave Catalog",
    assetClass: "music_royalties", currency: "EUR",
    currentPriceCents: 148000, buyRatio: 0.83, daysAgo: 340,
    qty: 1, platform: "Royalty Exchange",
    liquidityDays: 180, riskScore: 31, platformFeeRate: 0.05,
  },
  {
    name: "\"Summer Breeze\" — Pop Single Rights",
    assetClass: "music_royalties", currency: "EUR",
    currentPriceCents: 42000, buyRatio: 0.91, daysAgo: 150,
    qty: 1, platform: "Royalty Exchange",
    liquidityDays: 90, riskScore: 35, platformFeeRate: 0.05,
  },
  {
    name: "\"Pixel Beats\" — Gaming Music Catalog",
    assetClass: "music_royalties", currency: "EUR",
    currentPriceCents: 105000, buyRatio: 0.86, daysAgo: 300,
    qty: 1, platform: "Royalty Exchange",
    liquidityDays: 180, riskScore: 30, platformFeeRate: 0.05,
  },
  {
    name: "\"Acoustic Sunrise\" — Folk Singles Bundle",
    assetClass: "music_royalties", currency: "EUR",
    currentPriceCents: 63000, buyRatio: 0.90, daysAgo: 200,
    qty: 1, platform: "Royalty Exchange",
    liquidityDays: 90, riskScore: 34, platformFeeRate: 0.05,
  },
  {
    name: "\"Dark Matter\" — Metal/Rock Catalog",
    assetClass: "music_royalties", currency: "EUR",
    currentPriceCents: 88000, buyRatio: 0.85, daysAgo: 270,
    qty: 1, platform: "Royalty Exchange",
    liquidityDays: 180, riskScore: 32, platformFeeRate: 0.05,
  },
  {
    name: "\"Bossa Nova Dreams\" — Latin Catalog (7% share)",
    assetClass: "music_royalties", currency: "EUR",
    currentPriceCents: 122000, buyRatio: 0.81, daysAgo: 380,
    qty: 1, platform: "Royalty Exchange",
    liquidityDays: 180, riskScore: 28, platformFeeRate: 0.05,
  },
  {
    name: "\"Gospel Fire\" — Worship Catalog (4% share)",
    assetClass: "music_royalties", currency: "EUR",
    currentPriceCents: 195000, buyRatio: 0.77, daysAgo: 500,
    qty: 1, platform: "Royalty Exchange",
    liquidityDays: 180, riskScore: 27, platformFeeRate: 0.05,
  },

  // ── P2P Lending ──────────────────────────────────────────────────────────────
  {
    name: "Mintos — Consumer Loan #ML-2847 (9.2% p.a.)",
    assetClass: "p2p_lending", currency: "EUR",
    currentPriceCents: 310000, buyRatio: 1.00, daysAgo: 400,
    qty: 1, platform: "Mintos",
    liquidityDays: 90, riskScore: 28, platformFeeRate: 0.01,
  },
  {
    name: "Mintos — Business Loan #ML-3391 (10.1% p.a.)",
    assetClass: "p2p_lending", currency: "EUR",
    currentPriceCents: 250000, buyRatio: 1.00, daysAgo: 350,
    qty: 1, platform: "Mintos",
    liquidityDays: 90, riskScore: 30, platformFeeRate: 0.01,
  },
  {
    name: "Bondora Go & Grow (6.75% p.a.)",
    assetClass: "p2p_lending", currency: "EUR",
    currentPriceCents: 200000, buyRatio: 1.00, daysAgo: 500,
    qty: 1, platform: "Bondora",
    liquidityDays: 1, riskScore: 22, platformFeeRate: 0.01,
  },
  {
    name: "EstateGuru — Real Estate Loan #EG-445 (10.5% p.a.)",
    assetClass: "p2p_lending", currency: "EUR",
    currentPriceCents: 150000, buyRatio: 1.00, daysAgo: 460,
    qty: 1, platform: "EstateGuru",
    liquidityDays: 365, riskScore: 35, platformFeeRate: 0.01,
  },
  {
    name: "Mintos — Mortgage Loan #ML-1023 (8.5% p.a.)",
    assetClass: "p2p_lending", currency: "EUR",
    currentPriceCents: 500000, buyRatio: 1.00, daysAgo: 600,
    qty: 1, platform: "Mintos",
    liquidityDays: 180, riskScore: 25, platformFeeRate: 0.01,
  },
  {
    name: "Twino — Short-Term Loan Portfolio (11% p.a.)",
    assetClass: "p2p_lending", currency: "EUR",
    currentPriceCents: 100000, buyRatio: 1.00, daysAgo: 280,
    qty: 1, platform: "Twino",
    liquidityDays: 30, riskScore: 32, platformFeeRate: 0.01,
  },
  {
    name: "PeerBerry — Consumer Loans EU (10.8% p.a.)",
    assetClass: "p2p_lending", currency: "EUR",
    currentPriceCents: 180000, buyRatio: 1.00, daysAgo: 320,
    qty: 1, platform: "PeerBerry",
    liquidityDays: 60, riskScore: 29, platformFeeRate: 0.01,
  },
  {
    name: "Reinvest24 — Rental Income #RI-88 (9% p.a.)",
    assetClass: "p2p_lending", currency: "EUR",
    currentPriceCents: 120000, buyRatio: 1.00, daysAgo: 410,
    qty: 1, platform: "Reinvest24",
    liquidityDays: 180, riskScore: 33, platformFeeRate: 0.01,
  },
  {
    name: "Mintos — Auto Loan #ML-7741 (8.9% p.a.)",
    assetClass: "p2p_lending", currency: "EUR",
    currentPriceCents: 80000, buyRatio: 1.00, daysAgo: 240,
    qty: 1, platform: "Mintos",
    liquidityDays: 60, riskScore: 27, platformFeeRate: 0.01,
  },
  {
    name: "Viainvest — Consumer Loan EU (12% p.a.)",
    assetClass: "p2p_lending", currency: "EUR",
    currentPriceCents: 60000, buyRatio: 1.00, daysAgo: 190,
    qty: 1, platform: "Viainvest",
    liquidityDays: 30, riskScore: 35, platformFeeRate: 0.01,
  },
  {
    name: "Bondora — Personal Loan EE (14% p.a.)",
    assetClass: "p2p_lending", currency: "EUR",
    currentPriceCents: 45000, buyRatio: 1.00, daysAgo: 150,
    qty: 1, platform: "Bondora",
    liquidityDays: 30, riskScore: 38, platformFeeRate: 0.01,
  },
  {
    name: "Debitum — SME Loan #DEB-312 (9.5% p.a.)",
    assetClass: "p2p_lending", currency: "EUR",
    currentPriceCents: 90000, buyRatio: 1.00, daysAgo: 380,
    qty: 1, platform: "Debitum",
    liquidityDays: 90, riskScore: 31, platformFeeRate: 0.01,
  },
  {
    name: "Lendermarket — Consumer Loan (13% p.a.)",
    assetClass: "p2p_lending", currency: "EUR",
    currentPriceCents: 70000, buyRatio: 1.00, daysAgo: 260,
    qty: 1, platform: "Lendermarket",
    liquidityDays: 30, riskScore: 36, platformFeeRate: 0.01,
  },
  {
    name: "Profitus — Real Estate Development (11.5% p.a.)",
    assetClass: "p2p_lending", currency: "EUR",
    currentPriceCents: 130000, buyRatio: 1.00, daysAgo: 440,
    qty: 1, platform: "Profitus",
    liquidityDays: 365, riskScore: 37, platformFeeRate: 0.01,
  },
  {
    name: "Mintos — Personal Loan PL (9.8% p.a.)",
    assetClass: "p2p_lending", currency: "EUR",
    currentPriceCents: 220000, buyRatio: 1.00, daysAgo: 550,
    qty: 1, platform: "Mintos",
    liquidityDays: 60, riskScore: 26, platformFeeRate: 0.01,
  },

  // ── Domain Names ─────────────────────────────────────────────────────────────
  {
    name: "crypto.finance",
    assetClass: "domain_names", currency: "USD",
    currentPriceCents: 320000, buyRatio: 0.60, daysAgo: 680,
    qty: 1, platform: "Sedo",
    liquidityDays: 120, riskScore: 55, platformFeeRate: 0.15,
  },
  {
    name: "ai.tools",
    assetClass: "domain_names", currency: "USD",
    currentPriceCents: 185000, buyRatio: 0.72, daysAgo: 540,
    qty: 1, platform: "Afternic",
    liquidityDays: 90, riskScore: 50, platformFeeRate: 0.20,
  },
  {
    name: "defi.capital",
    assetClass: "domain_names", currency: "USD",
    currentPriceCents: 410000, buyRatio: 0.55, daysAgo: 695,
    qty: 1, platform: "Sedo",
    liquidityDays: 180, riskScore: 58, platformFeeRate: 0.15,
  },
  {
    name: "health.coach",
    assetClass: "domain_names", currency: "USD",
    currentPriceCents: 92000, buyRatio: 0.80, daysAgo: 380,
    qty: 1, platform: "Afternic",
    liquidityDays: 90, riskScore: 48, platformFeeRate: 0.20,
  },
  {
    name: "web3.ventures",
    assetClass: "domain_names", currency: "USD",
    currentPriceCents: 145000, buyRatio: 0.75, daysAgo: 460,
    qty: 1, platform: "Sedo",
    liquidityDays: 120, riskScore: 52, platformFeeRate: 0.15,
  },
  {
    name: "invest.app",
    assetClass: "domain_names", currency: "USD",
    currentPriceCents: 280000, buyRatio: 0.68, daysAgo: 620,
    qty: 1, platform: "Sedo",
    liquidityDays: 120, riskScore: 50, platformFeeRate: 0.15,
  },
  {
    name: "luxury.shop",
    assetClass: "domain_names", currency: "USD",
    currentPriceCents: 58000, buyRatio: 0.85, daysAgo: 230,
    qty: 1, platform: "Afternic",
    liquidityDays: 60, riskScore: 45, platformFeeRate: 0.20,
  },
  {
    name: "solar.energy",
    assetClass: "domain_names", currency: "USD",
    currentPriceCents: 195000, buyRatio: 0.73, daysAgo: 500,
    qty: 1, platform: "Sedo",
    liquidityDays: 120, riskScore: 48, platformFeeRate: 0.15,
  },
  {
    name: "nft.gallery",
    assetClass: "domain_names", currency: "USD",
    currentPriceCents: 76000, buyRatio: 0.88, daysAgo: 170,
    qty: 1, platform: "Afternic",
    liquidityDays: 60, riskScore: 55, platformFeeRate: 0.20,
  },
  {
    name: "smart.city",
    assetClass: "domain_names", currency: "USD",
    currentPriceCents: 240000, buyRatio: 0.70, daysAgo: 570,
    qty: 1, platform: "Sedo",
    liquidityDays: 120, riskScore: 47, platformFeeRate: 0.15,
  },
  {
    name: "biotech.fund",
    assetClass: "domain_names", currency: "USD",
    currentPriceCents: 165000, buyRatio: 0.77, daysAgo: 430,
    qty: 1, platform: "Sedo",
    liquidityDays: 120, riskScore: 50, platformFeeRate: 0.15,
  },
  {
    name: "quantum.io",
    assetClass: "domain_names", currency: "USD",
    currentPriceCents: 120000, buyRatio: 0.82, daysAgo: 310,
    qty: 1, platform: "Afternic",
    liquidityDays: 90, riskScore: 48, platformFeeRate: 0.20,
  },
  {
    name: "meta.market",
    assetClass: "domain_names", currency: "USD",
    currentPriceCents: 98000, buyRatio: 0.86, daysAgo: 250,
    qty: 1, platform: "Afternic",
    liquidityDays: 60, riskScore: 52, platformFeeRate: 0.20,
  },
  {
    name: "space.travel",
    assetClass: "domain_names", currency: "USD",
    currentPriceCents: 210000, buyRatio: 0.74, daysAgo: 480,
    qty: 1, platform: "Sedo",
    liquidityDays: 120, riskScore: 53, platformFeeRate: 0.15,
  },
  {
    name: "digital.gold",
    assetClass: "domain_names", currency: "USD",
    currentPriceCents: 350000, buyRatio: 0.62, daysAgo: 660,
    qty: 1, platform: "Sedo",
    liquidityDays: 180, riskScore: 56, platformFeeRate: 0.15,
  },

  // ── Anime Cels ───────────────────────────────────────────────────────────────
  {
    name: "Dragon Ball Z — Goku Super Saiyan 3 (1994, Toei)",
    assetClass: "anime_cels", currency: "EUR",
    currentPriceCents: 92000, buyRatio: 0.70, daysAgo: 620,
    qty: 1, platform: "Heritage Auctions",
    liquidityDays: 90, riskScore: 62, platformFeeRate: 0.15,
    condition: "excellent",
  },
  {
    name: "Neon Genesis Evangelion — Unit-01 vs Angel (1995, Gainax)",
    assetClass: "anime_cels", currency: "EUR",
    currentPriceCents: 138000, buyRatio: 0.67, daysAgo: 680,
    qty: 1, platform: "Heritage Auctions",
    liquidityDays: 120, riskScore: 58, platformFeeRate: 0.15,
    condition: "excellent",
  },
  {
    name: "Sailor Moon — Usagi Transformation Sequence (1992, Toei)",
    assetClass: "anime_cels", currency: "EUR",
    currentPriceCents: 58000, buyRatio: 0.76, daysAgo: 530,
    qty: 1, platform: "Catawiki",
    liquidityDays: 90, riskScore: 60, platformFeeRate: 0.12,
    condition: "near_mint",
  },
  {
    name: "Cowboy Bebop — Spike Spiegel Action Scene (1998, Sunrise)",
    assetClass: "anime_cels", currency: "EUR",
    currentPriceCents: 82000, buyRatio: 0.72, daysAgo: 590,
    qty: 1, platform: "Heritage Auctions",
    liquidityDays: 90, riskScore: 60, platformFeeRate: 0.15,
    condition: "excellent",
  },
  {
    name: "Ghost in the Shell — Major Kusanagi (1995, Production I.G)",
    assetClass: "anime_cels", currency: "EUR",
    currentPriceCents: 145000, buyRatio: 0.65, daysAgo: 640,
    qty: 1, platform: "Heritage Auctions",
    liquidityDays: 120, riskScore: 57, platformFeeRate: 0.15,
    condition: "excellent",
  },
  {
    name: "Akira — Kaneda Motorcycle Sequence (1988, TMS)",
    assetClass: "anime_cels", currency: "EUR",
    currentPriceCents: 195000, buyRatio: 0.60, daysAgo: 695,
    qty: 1, platform: "Heritage Auctions",
    liquidityDays: 180, riskScore: 55, platformFeeRate: 0.15,
    condition: "good",
  },
  {
    name: "Nausicaä of the Valley of the Wind — Nausicaä (1984, Ghibli)",
    assetClass: "anime_cels", currency: "EUR",
    currentPriceCents: 225000, buyRatio: 0.63, daysAgo: 660,
    qty: 1, platform: "Heritage Auctions",
    liquidityDays: 180, riskScore: 53, platformFeeRate: 0.15,
    condition: "good",
  },
  {
    name: "One Piece — Luffy vs Crocodile (2001, Toei)",
    assetClass: "anime_cels", currency: "EUR",
    currentPriceCents: 34000, buyRatio: 0.82, daysAgo: 360,
    qty: 1, platform: "Catawiki",
    liquidityDays: 60, riskScore: 63, platformFeeRate: 0.12,
    condition: "excellent",
  },
  {
    name: "Dragon Ball — Kid Goku (1986, Toei Animation)",
    assetClass: "anime_cels", currency: "EUR",
    currentPriceCents: 48000, buyRatio: 0.78, daysAgo: 450,
    qty: 1, platform: "Catawiki",
    liquidityDays: 60, riskScore: 61, platformFeeRate: 0.12,
    condition: "excellent",
  },
  {
    name: "Cardcaptor Sakura — Capture Scene (1998, Madhouse)",
    assetClass: "anime_cels", currency: "EUR",
    currentPriceCents: 28000, buyRatio: 0.84, daysAgo: 300,
    qty: 1, platform: "Catawiki",
    liquidityDays: 60, riskScore: 63, platformFeeRate: 0.12,
    condition: "near_mint",
  },
  {
    name: "Macross DYRL? — Minmay Concert Scene (1984, Tatsunoko)",
    assetClass: "anime_cels", currency: "EUR",
    currentPriceCents: 62000, buyRatio: 0.74, daysAgo: 520,
    qty: 1, platform: "Heritage Auctions",
    liquidityDays: 90, riskScore: 60, platformFeeRate: 0.15,
    condition: "good",
  },
  {
    name: "Fullmetal Alchemist — Edward Elric Battle (2003, Bones)",
    assetClass: "anime_cels", currency: "EUR",
    currentPriceCents: 19000, buyRatio: 0.89, daysAgo: 200,
    qty: 1, platform: "Catawiki",
    liquidityDays: 45, riskScore: 64, platformFeeRate: 0.12,
    condition: "excellent",
  },
  {
    name: "Ruroni Kenshin — Final Battle Sequence (1996, Studio Deen)",
    assetClass: "anime_cels", currency: "EUR",
    currentPriceCents: 22000, buyRatio: 0.87, daysAgo: 240,
    qty: 1, platform: "Catawiki",
    liquidityDays: 45, riskScore: 64, platformFeeRate: 0.12,
    condition: "excellent",
  },
  {
    name: "Lupin III — Arsène Heist Scene (1971, TMS)",
    assetClass: "anime_cels", currency: "EUR",
    currentPriceCents: 115000, buyRatio: 0.68, daysAgo: 590,
    qty: 1, platform: "Heritage Auctions",
    liquidityDays: 120, riskScore: 58, platformFeeRate: 0.15,
    condition: "good",
  },
  {
    name: "Spirited Away — No-Face Scene (2001, Studio Ghibli)",
    assetClass: "anime_cels", currency: "EUR",
    currentPriceCents: 310000, buyRatio: 0.58, daysAgo: 690,
    qty: 1, platform: "Heritage Auctions",
    liquidityDays: 180, riskScore: 52, platformFeeRate: 0.15,
    condition: "excellent",
  },

  // ── Commodities ──────────────────────────────────────────────────────────────
  {
    name: "Gold (10 troy oz) — Physical Bullion",
    assetClass: "commodities", currency: "EUR",
    currentPriceCents: 2720000, buyRatio: 0.82, daysAgo: 600,
    qty: 1, platform: "Atkinsons Bullion",
    liquidityDays: 5, riskScore: 22, platformFeeRate: 0.01,
  },
  {
    name: "Gold (5 troy oz) — PAMP Suisse Bar",
    assetClass: "commodities", currency: "EUR",
    currentPriceCents: 1360000, buyRatio: 0.88, daysAgo: 350,
    qty: 1, platform: "Atkinsons Bullion",
    liquidityDays: 5, riskScore: 22, platformFeeRate: 0.01,
  },
  {
    name: "Gold (1 troy oz) — Maple Leaf",
    assetClass: "commodities", currency: "EUR",
    currentPriceCents: 272000, buyRatio: 0.91, daysAgo: 180,
    qty: 3, platform: "Atkinsons Bullion",
    liquidityDays: 5, riskScore: 22, platformFeeRate: 0.01,
  },
  {
    name: "Silver (100 troy oz) — COMEX Bar",
    assetClass: "commodities", currency: "EUR",
    currentPriceCents: 318000, buyRatio: 0.85, daysAgo: 430,
    qty: 1, platform: "Atkinsons Bullion",
    liquidityDays: 7, riskScore: 28, platformFeeRate: 0.02,
  },
  {
    name: "Silver (500 troy oz) — Physical Bullion",
    assetClass: "commodities", currency: "EUR",
    currentPriceCents: 1590000, buyRatio: 0.79, daysAgo: 550,
    qty: 1, platform: "Atkinsons Bullion",
    liquidityDays: 7, riskScore: 28, platformFeeRate: 0.02,
  },
  {
    name: "Platinum (1 troy oz) — Valcambi Bar",
    assetClass: "commodities", currency: "EUR",
    currentPriceCents: 97000, buyRatio: 0.93, daysAgo: 140,
    qty: 2, platform: "Atkinsons Bullion",
    liquidityDays: 10, riskScore: 35, platformFeeRate: 0.02,
  },
  {
    name: "Palladium (1 troy oz) — PAMP Suisse",
    assetClass: "commodities", currency: "EUR",
    currentPriceCents: 88000, buyRatio: 1.05, daysAgo: 480,
    qty: 1, platform: "Atkinsons Bullion",
    liquidityDays: 14, riskScore: 42, platformFeeRate: 0.02,
  },
  {
    name: "Gold (2 troy oz) — Krugerrand",
    assetClass: "commodities", currency: "EUR",
    currentPriceCents: 544000, buyRatio: 0.86, daysAgo: 310,
    qty: 1, platform: "Atkinsons Bullion",
    liquidityDays: 5, riskScore: 22, platformFeeRate: 0.01,
  },
  {
    name: "Silver (1000 troy oz) — LBMA Bar",
    assetClass: "commodities", currency: "EUR",
    currentPriceCents: 3180000, buyRatio: 0.76, daysAgo: 640,
    qty: 1, platform: "Atkinsons Bullion",
    liquidityDays: 7, riskScore: 28, platformFeeRate: 0.02,
  },
  {
    name: "Gold (1 troy oz) — Australian Kangaroo",
    assetClass: "commodities", currency: "EUR",
    currentPriceCents: 272000, buyRatio: 0.93, daysAgo: 160,
    qty: 2, platform: "Atkinsons Bullion",
    liquidityDays: 5, riskScore: 22, platformFeeRate: 0.01,
  },
  {
    name: "Rhodium (1 gram) — Certified",
    assetClass: "commodities", currency: "EUR",
    currentPriceCents: 15200, buyRatio: 1.08, daysAgo: 500,
    qty: 5, platform: "Atkinsons Bullion",
    liquidityDays: 21, riskScore: 55, platformFeeRate: 0.03,
  },
  {
    name: "Gold (20 troy oz) — Vault Storage",
    assetClass: "commodities", currency: "EUR",
    currentPriceCents: 5440000, buyRatio: 0.78, daysAgo: 680,
    qty: 1, platform: "Atkinsons Bullion",
    liquidityDays: 5, riskScore: 22, platformFeeRate: 0.01,
  },
  {
    name: "Silver (250 troy oz) — Sunshine Minting",
    assetClass: "commodities", currency: "EUR",
    currentPriceCents: 795000, buyRatio: 0.83, daysAgo: 400,
    qty: 1, platform: "Atkinsons Bullion",
    liquidityDays: 7, riskScore: 28, platformFeeRate: 0.02,
  },
  {
    name: "Platinum (5 troy oz) — PAMP Bar",
    assetClass: "commodities", currency: "EUR",
    currentPriceCents: 485000, buyRatio: 0.90, daysAgo: 260,
    qty: 1, platform: "Atkinsons Bullion",
    liquidityDays: 10, riskScore: 35, platformFeeRate: 0.02,
  },
  {
    name: "Gold (1/4 troy oz) — Britannia (×20)",
    assetClass: "commodities", currency: "EUR",
    currentPriceCents: 1360000, buyRatio: 0.89, daysAgo: 220,
    qty: 1, platform: "Atkinsons Bullion",
    liquidityDays: 5, riskScore: 23, platformFeeRate: 0.01,
  },

  // ── Sports Betting ───────────────────────────────────────────────────────────
  {
    name: "Man City vs Real Madrid — UCL Win (odds 2.10)",
    assetClass: "sports_betting", currency: "EUR",
    currentPriceCents: 42000, buyRatio: 0.48, daysAgo: 580,
    qty: 1, platform: "Betfair",
    liquidityDays: 1, riskScore: 82, platformFeeRate: 0.05,
  },
  {
    name: "Wimbledon 2025 — Djokovic Champion (odds 3.50)",
    assetClass: "sports_betting", currency: "EUR",
    currentPriceCents: 35000, buyRatio: 0.29, daysAgo: 280,
    qty: 1, platform: "Betfair",
    liquidityDays: 1, riskScore: 88, platformFeeRate: 0.05,
  },
  {
    name: "NBA Finals 2025 — Celtics Win (odds 2.80)",
    assetClass: "sports_betting", currency: "EUR",
    currentPriceCents: 56000, buyRatio: 0.36, daysAgo: 310,
    qty: 1, platform: "Betfair",
    liquidityDays: 1, riskScore: 85, platformFeeRate: 0.05,
  },
  {
    name: "Formula 1 2025 — Max Verstappen Champion (odds 1.90)",
    assetClass: "sports_betting", currency: "EUR",
    currentPriceCents: 38000, buyRatio: 0.53, daysAgo: 540,
    qty: 1, platform: "Betfair",
    liquidityDays: 1, riskScore: 80, platformFeeRate: 0.05,
  },
  {
    name: "Super Bowl LX — Chiefs Win (odds 2.20)",
    assetClass: "sports_betting", currency: "EUR",
    currentPriceCents: 44000, buyRatio: 0.45, daysAgo: 400,
    qty: 1, platform: "Betfair",
    liquidityDays: 1, riskScore: 83, platformFeeRate: 0.05,
  },
  {
    name: "World Cup 2026 — Brazil Winner (odds 6.00)",
    assetClass: "sports_betting", currency: "EUR",
    currentPriceCents: 30000, buyRatio: 0.17, daysAgo: 630,
    qty: 1, platform: "Betfair",
    liquidityDays: 1, riskScore: 92, platformFeeRate: 0.05,
  },
  {
    name: "Tour de France 2025 — Vingegaard Winner (odds 3.00)",
    assetClass: "sports_betting", currency: "EUR",
    currentPriceCents: 24000, buyRatio: 0.33, daysAgo: 195,
    qty: 1, platform: "Betfair",
    liquidityDays: 1, riskScore: 87, platformFeeRate: 0.05,
  },
  {
    name: "MMA — UFC 310 Main Event Accumulator",
    assetClass: "sports_betting", currency: "EUR",
    currentPriceCents: 15000, buyRatio: 0.67, daysAgo: 120,
    qty: 1, platform: "Betfair",
    liquidityDays: 1, riskScore: 90, platformFeeRate: 0.05,
  },
  {
    name: "La Liga 2025/26 — Real Madrid Title (odds 1.80)",
    assetClass: "sports_betting", currency: "EUR",
    currentPriceCents: 54000, buyRatio: 0.56, daysAgo: 460,
    qty: 1, platform: "Betfair",
    liquidityDays: 1, riskScore: 79, platformFeeRate: 0.05,
  },
  {
    name: "Grand Slam Tennis — Sinner Australian Open (odds 2.50)",
    assetClass: "sports_betting", currency: "EUR",
    currentPriceCents: 50000, buyRatio: 0.40, daysAgo: 340,
    qty: 1, platform: "Betfair",
    liquidityDays: 1, riskScore: 84, platformFeeRate: 0.05,
  },
  {
    name: "Premier League 2025/26 — Arsenal Title (odds 4.00)",
    assetClass: "sports_betting", currency: "EUR",
    currentPriceCents: 20000, buyRatio: 0.25, daysAgo: 490,
    qty: 1, platform: "Betfair",
    liquidityDays: 1, riskScore: 90, platformFeeRate: 0.05,
  },
  {
    name: "Olympics 2028 — USA Basketball Gold (odds 1.60)",
    assetClass: "sports_betting", currency: "EUR",
    currentPriceCents: 32000, buyRatio: 0.63, daysAgo: 150,
    qty: 1, platform: "Betfair",
    liquidityDays: 1, riskScore: 78, platformFeeRate: 0.05,
  },
  {
    name: "Rugby World Cup 2027 — New Zealand (odds 2.30)",
    assetClass: "sports_betting", currency: "EUR",
    currentPriceCents: 23000, buyRatio: 0.43, daysAgo: 270,
    qty: 1, platform: "Betfair",
    liquidityDays: 1, riskScore: 85, platformFeeRate: 0.05,
  },
  {
    name: "Cycling — Giro d'Italia 2025 Accumulator",
    assetClass: "sports_betting", currency: "EUR",
    currentPriceCents: 18000, buyRatio: 0.56, daysAgo: 220,
    qty: 1, platform: "Betfair",
    liquidityDays: 1, riskScore: 88, platformFeeRate: 0.05,
  },
  {
    name: "Esports — ESL One Major CS2 (odds 2.60)",
    assetClass: "sports_betting", currency: "EUR",
    currentPriceCents: 13000, buyRatio: 0.38, daysAgo: 95,
    qty: 1, platform: "Betfair",
    liquidityDays: 1, riskScore: 89, platformFeeRate: 0.05,
  },
];

// ─── Builder ─────────────────────────────────────────────────────────────────

export function generateSeedAssets(): Asset[] {
  // Always reset PRNG so IDs are identical on every call
  rng = makePrng(0xdeadbeef);

  return TEMPLATES.map((t): Asset => {
    const assetId = uid();
    const txId    = uid();

    const buyPriceCents = Math.round(t.currentPriceCents * t.buyRatio / t.qty) * 1;
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
      createdAt:         buyDate,
      updatedAt:         ANCHOR,
      transactions: [
        {
          id:                txId,
          assetId,
          type:              "buy",
          pricePerUnitCents: buyPriceCents,
          quantity:          t.qty,
          currency:          t.currency,
          feeCents:          Math.round(buyPriceCents * t.qty * t.platformFeeRate * 0.5),
          otherCostsCents:   0,
          date:              buyDate,
          platform:          t.platform,
        },
      ],
    };
  });
}

/** Returns true when this looks like a fresh (empty or nearly empty) portfolio */
export function portfolioNeedsSeed(assets: Asset[]): boolean {
  return assets.length === 0;
}
