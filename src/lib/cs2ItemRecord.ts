export interface Cs2ItemRecord {
  marketHashName: string;      // Steam canonical ID (e.g. "AK-47 | Redline (Field-Tested)")
  weaponType: string | null;   // "AK-47", "AWP", "Knife", "Gloves"
  skinName: string | null;     // "Redline", "Dragon Lore"
  exterior: string | null;     // "Factory New"|"Minimal Wear"|"Field-Tested"|"Well-Worn"|"Battle-Scarred"
  rarity: string | null;       // "Covert"|"Classified"|"Restricted"|"Mil-Spec"|"Industrial"|"Consumer"
  isStatTrak: boolean;
  isSouvenir: boolean;
  iconUrl: string | null;
  suggestedPriceCents: number | null; // Skinport suggested price (EUR cents)
  minPriceCents: number | null;       // cheapest active listing (EUR cents)
  priceUpdatedAt: string | null;
  lastSyncedAt: string;
}
