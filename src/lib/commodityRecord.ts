export type MetalSymbol = "XAU" | "XAG" | "XPT" | "XPD" | "XRH";

export interface CommodityRecord {
  symbol: MetalSymbol;
  name: string;                        // "Gold", "Silver", "Platinum", "Palladium", "Rhodium"
  pricePerOzEurCents: number | null;
  pricePerOzUsdCents: number | null;
  priceUpdatedAt: string | null;
  yahooTicker: string | null;          // "GC=F", "SI=F", null for XRH
  unit: string;                        // "troy_oz"
  lastSyncedAt: string;
}
