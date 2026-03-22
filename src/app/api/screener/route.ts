export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export interface ScreenerItem {
  id: string;
  name: string;
  category: "pokemon" | "mtg" | "cs2";
  set: string;
  rarity: string;
  priceEur: number | null;
  priceUsd: number | null;
  volume: number | null;      // sales/listings count
  imageUrl: string | null;
  change7d: number | null;    // fraction, null if unavailable
  change30d: number | null;
  sourceUrl: string | null;
}

// ─── MTG via Scryfall ─────────────────────────────────────────────────────────

interface ScryfallCard {
  id: string;
  name: string;
  set_name: string;
  rarity: string;
  prices: { eur?: string; usd?: string };
  image_uris?: { small?: string };
  card_faces?: Array<{ image_uris?: { small?: string } }>;
  scryfall_uri: string;
}

async function fetchMtg(): Promise<ScreenerItem[]> {
  const items: ScreenerItem[] = [];
  try {
    // Fetch two pages of expensive cards sorted by EUR price
    const pages = await Promise.all([1, 2].map((page) =>
      fetch(
        `https://api.scryfall.com/cards/search?q=eur>2&order=eur&dir=desc&page=${page}`,
        { headers: { "User-Agent": "Vaulty/1.0" }, next: { revalidate: 3600 } },
      ).then((r) => r.ok ? r.json() : null).catch(() => null),
    ));

    for (const page of pages) {
      for (const c of (page?.data ?? []) as ScryfallCard[]) {
        const eur = c.prices.eur ? parseFloat(c.prices.eur) : null;
        const usd = c.prices.usd ? parseFloat(c.prices.usd) : null;
        const img = c.image_uris?.small ?? c.card_faces?.[0]?.image_uris?.small ?? null;
        items.push({
          id: `mtg-${c.id}`,
          name: c.name,
          category: "mtg",
          set: c.set_name,
          rarity: c.rarity.charAt(0).toUpperCase() + c.rarity.slice(1),
          priceEur: eur,
          priceUsd: usd,
          volume: null,
          imageUrl: img,
          change7d: null,
          change30d: null,
          sourceUrl: c.scryfall_uri,
        });
      }
    }
  } catch { /* silent */ }
  return items;
}

// ─── CS2 via Steam Market ─────────────────────────────────────────────────────

interface SteamAsset {
  name: string;
  sell_price: number;    // in cents (EUR or USD depending on region)
  sell_listings: number;
  asset_description?: { icon_url?: string };
}

async function fetchCs2(): Promise<ScreenerItem[]> {
  const items: ScreenerItem[] = [];
  try {
    // Fetch top items by price, excluding cases/capsules/stickers
    const res = await fetch(
      "https://steamcommunity.com/market/search/render/?appid=730&sort_column=price&sort_dir=desc&start=0&count=100&norender=1",
      {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return items;
    const data = await res.json();

    for (const asset of (data.results ?? []) as SteamAsset[]) {
      const name: string = asset.name ?? "";
      // Skip cases, capsules, sticker capsules, grafitti, music kits
      if (/Case|Capsule|Graffiti|Music Kit|Souvenir Package/i.test(name)) continue;

      const priceUsd = asset.sell_price ? asset.sell_price / 100 : null;
      const iconUrl = asset.asset_description?.icon_url
        ? `https://community.akamai.steamstatic.com/economy/image/${asset.asset_description.icon_url}/96fx96f`
        : null;

      // Detect rarity from name patterns
      let rarity = "Unknown";
      if (/StatTrak/i.test(name)) rarity = "StatTrak™";
      else if (/★/i.test(name)) rarity = "★ Knife / Gloves";
      else if (/Souvenir/i.test(name)) rarity = "Souvenir";
      else if (/Sticker/i.test(name)) rarity = "Sticker";
      else rarity = "Skin";

      // Detect weapon type as "set"
      const weaponMatch = name.match(/^(★ StatTrak™ |★ |StatTrak™ )?([^|]+)/);
      const weapon = weaponMatch?.[2]?.trim() ?? "Unknown";

      items.push({
        id: `cs2-${name}`,
        name,
        category: "cs2",
        set: weapon,
        rarity,
        priceEur: null,
        priceUsd,
        volume: asset.sell_listings ?? null,
        imageUrl: iconUrl,
        change7d: null,
        change30d: null,
        sourceUrl: `https://steamcommunity.com/market/listings/730/${encodeURIComponent(name)}`,
      });
    }
  } catch { /* silent */ }
  return items;
}

// ─── Pokemon via pokemontcg.io ─────────────────────────────────────────────────

interface PokemonCard {
  id: string;
  name: string;
  set: { name: string };
  rarity?: string;
  images: { small?: string };
  cardmarket?: {
    prices?: {
      averageSellPrice?: number;
      avg7?: number;
      avg30?: number;
    };
  };
}

async function fetchPokemon(): Promise<ScreenerItem[]> {
  const items: ScreenerItem[] = [];
  const key = process.env.POKEMON_TCG_API_KEY ?? "";
  try {
    const headers: Record<string, string> = { "User-Agent": "Vaulty/1.0" };
    if (key) headers["X-Api-Key"] = key;

    const res = await fetch(
      "https://api.pokemontcg.io/v2/cards?orderBy=-cardmarket.prices.averageSellPrice&q=cardmarket.prices.averageSellPrice:[5 TO *]&pageSize=100&select=id,name,set,rarity,images,cardmarket",
      { headers, signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } },
    );
    if (!res.ok) return items;
    const data = await res.json();

    for (const c of (data.data ?? []) as PokemonCard[]) {
      const current = c.cardmarket?.prices?.averageSellPrice ?? null;
      const avg7    = c.cardmarket?.prices?.avg7 ?? null;
      const avg30   = c.cardmarket?.prices?.avg30 ?? null;
      const change7d  = current && avg7  && avg7  > 0 ? (current - avg7)  / avg7  : null;
      const change30d = current && avg30 && avg30 > 0 ? (current - avg30) / avg30 : null;

      items.push({
        id: `poke-${c.id}`,
        name: c.name,
        category: "pokemon",
        set: c.set?.name ?? "Unknown",
        rarity: c.rarity ?? "Unknown",
        priceEur: current,
        priceUsd: null,
        volume: null,
        imageUrl: c.images?.small ?? null,
        change7d,
        change30d,
        sourceUrl: `https://www.cardmarket.com/en/Pokemon/Cards/Search?searchString=${encodeURIComponent(c.name)}`,
      });
    }
  } catch { /* silent */ }
  return items;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET() {
  const [mtg, cs2, pokemon] = await Promise.all([
    fetchMtg(),
    fetchCs2(),
    fetchPokemon(),
  ]);

  const items = [...pokemon, ...mtg, ...cs2];

  return NextResponse.json({
    items,
    total: items.length,
    fetchedAt: new Date().toISOString(),
  });
}
