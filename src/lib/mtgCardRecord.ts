export interface MtgCardRecord {
  id: string;              // Scryfall UUID
  oracleId: string | null;
  name: string;
  setCode: string;         // e.g. "lea"
  setName: string | null;
  collectorNumber: string | null;
  rarity: string | null;   // "common"|"uncommon"|"rare"|"mythic"|"special"|"bonus"
  releasedAt: string | null; // "YYYY-MM-DD"
  manaCost: string | null;
  typeLine: string | null;
  oracleText: string | null;
  edhrecRank: number | null;
  imageSmallUrl: string | null;
  imageLargeUrl: string | null;
  imagePngUrl: string | null;
  priceEurCents: number | null;
  priceEurFoilCents: number | null;
  priceUsdCents: number | null;
  priceUsdFoilCents: number | null;
  priceUpdatedAt: string | null;
  tcgplayerUrl: string | null;
  cardmarketUrl: string | null;
  lastSyncedAt: string;
}
