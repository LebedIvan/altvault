export interface PokemonCardRecord {
  id: string;              // TCGdex card ID (e.g. "swsh1-1")
  name: string;
  localId: string;         // card number within set
  setId: string | null;
  setName: string | null;
  serieName: string | null;
  releaseDate: string | null; // "YYYY/MM/DD"
  rarity: string | null;
  hp: number | null;
  types: string[];
  imageSmallUrl: string | null;
  imageLargeUrl: string | null;
  priceEurCents: number | null; // cardmarket
  priceUsdCents: number | null; // tcgplayer
  priceUpdatedAt: string | null;
  lang: "en" | "ja";
  lastSyncedAt: string;
}
