export type SportType = "basketball" | "football" | "hockey" | "american_football";

export interface SportsCardRecord {
  id: string;              // PriceCharting product ID
  sport: SportType;
  name: string;            // e.g. "LeBron James"
  fullName: string | null; // e.g. "LeBron James RC — 2003-04 Topps #111"
  setName: string | null;
  year: number | null;
  playerName: string | null;
  cardNumber: string | null;
  loosePriceCents: number | null;  // ungraded (USD cents)
  gradedPriceCents: number | null; // PSA 10 (USD cents)
  imageUrl: string | null;
  priceChartingUrl: string | null;
  priceUpdatedAt: string | null;
  lastSyncedAt: string;
}
