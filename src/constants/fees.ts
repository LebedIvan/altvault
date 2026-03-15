/** Default platform fee rates by asset class (decimal). Override per-asset as needed. */
export const DEFAULT_PLATFORM_FEE_RATES: Record<string, number> = {
  trading_cards:   0.025,  // TCGPlayer / Cardmarket ~2.5%
  lego:            0.10,   // eBay ~10%
  cs2_skins:       0.15,   // Steam Market 15%
  music_royalties: 0.05,
  p2p_lending:     0.01,
  domain_names:    0.10,   // Sedo / Afternic ~10%
  anime_cels:      0.12,
  commodities:     0.015,
  sports_betting:  0.00,   // no platform fee (spread-based)
} as const;

export const DAYS_PER_YEAR = 365;
