import type { Currency } from "@/types/asset";

const EUR_FORMATTER = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  EUR: EUR_FORMATTER,
  USD: USD_FORMATTER,
  GBP: new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
};

/** Format integer cents as a currency string. */
export function formatCents(cents: number, currency: Currency = "EUR"): string {
  return FORMATTERS[currency].format(cents / 100);
}

/** Format a decimal as a percentage with sign. */
export function formatPct(value: number, decimals = 1): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(decimals)}%`;
}

/** Format a decimal ROI as an annualized percentage. */
export function formatROI(roi: number): string {
  return formatPct(roi);
}

/** Format a date as DD/MM/YYYY (Spanish locale). */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-ES").format(date);
}

/** Classify a P&L value as positive, negative, or neutral for styling. */
export function pnlClass(cents: number): "positive" | "negative" | "neutral" {
  if (cents > 0) return "positive";
  if (cents < 0) return "negative";
  return "neutral";
}

export const ASSET_CLASS_LABELS: Record<string, string> = {
  trading_cards:            "Trading Cards",
  basketball_cards:         "Basketball Cards",
  football_cards:           "Football Cards",
  hockey_cards:             "Hockey Cards",
  american_football_cards:  "American Football Cards",
  comics:                   "Comics",
  lego:                     "LEGO",
  cs2_skins:                "CS2 Skins",
  music_royalties:          "Music Royalties",
  p2p_lending:              "P2P Lending",
  domain_names:             "Domain Names",
  anime_cels:               "Anime Cels",
  commodities:              "Commodities",
  sports_betting:           "Sports Betting",
};

export const ASSET_CLASS_COLORS: Record<string, string> = {
  trading_cards:            "#6366f1",
  basketball_cards:         "#f97316",
  football_cards:           "#22c55e",
  hockey_cards:             "#38bdf8",
  american_football_cards:  "#a855f7",
  comics:                   "#f43f5e",
  lego:                     "#f59e0b",
  cs2_skins:                "#ef4444",
  music_royalties:          "#10b981",
  p2p_lending:              "#3b82f6",
  domain_names:             "#8b5cf6",
  anime_cels:               "#ec4899",
  commodities:              "#f97316",
  sports_betting:           "#14b8a6",
};
