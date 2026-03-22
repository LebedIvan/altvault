export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

export interface GameSuggestion {
  id:               string;
  name:             string;
  fullName:         string;
  platform:         string;
  loosePriceCents:  number | null;
  cibPriceCents:    number | null;
  newPriceCents:    number | null;
  priceCents:       number | null;
  currency:         "USD";
  imageSmall:       null;
  imageLarge:       null;
}

// Gaming platform keywords to filter PriceCharting results
const GAME_PLATFORMS = [
  "playstation", "xbox", "nintendo", "gameboy", "gamecube", "wii", "switch",
  "sega", "dreamcast", "atari", "n64", "snes", "nes", "gba", "nds", "3ds",
  "psp", "vita", "game boy", "ps1", "ps2", "ps3", "ps4", "ps5",
];

function isGamingPlatform(consoleName: string): boolean {
  const lower = consoleName.toLowerCase();
  return GAME_PLATFORMS.some((p) => lower.includes(p));
}

// ─── Static fallback (25 popular items) ───────────────────────────────────────

const STATIC_GAMES: GameSuggestion[] = [
  { id: "static-ps5",        name: "PlayStation 5 Console",              fullName: "PlayStation 5 Console · Sony",                    platform: "PlayStation 5",  loosePriceCents: 42000, cibPriceCents: 45000,  newPriceCents: 49900,  priceCents: 42000, currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-ps4",        name: "PlayStation 4 Console",              fullName: "PlayStation 4 Console · Sony",                    platform: "PlayStation 4",  loosePriceCents: 15000, cibPriceCents: 17000,  newPriceCents: 22000,  priceCents: 15000, currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-switch-oled",name: "Nintendo Switch OLED",               fullName: "Nintendo Switch OLED · Nintendo",                 platform: "Nintendo Switch",loosePriceCents: 27000, cibPriceCents: 29000,  newPriceCents: 34999,  priceCents: 27000, currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-switch",     name: "Nintendo Switch",                    fullName: "Nintendo Switch · Nintendo",                      platform: "Nintendo Switch",loosePriceCents: 20000, cibPriceCents: 22000,  newPriceCents: 29900,  priceCents: 20000, currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-gamecube",   name: "GameCube Console",                   fullName: "GameCube Console · Nintendo",                     platform: "GameCube",       loosePriceCents: 9000,  cibPriceCents: 14000,  newPriceCents: 35000,  priceCents: 9000,  currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-ps2slim",    name: "PS2 Slim Console",                   fullName: "PS2 Slim Console · Sony",                         platform: "PlayStation 2",  loosePriceCents: 7000,  cibPriceCents: 9500,   newPriceCents: 20000,  priceCents: 7000,  currency: "USD", imageSmall: null, imageLarge: null },
  { id: "45654",             name: "Chibi-Robo!",                        fullName: "Chibi-Robo! · GameCube",                          platform: "GameCube",       loosePriceCents: 14000, cibPriceCents: 9000,   newPriceCents: 22000,  priceCents: 14000, currency: "USD", imageSmall: null, imageLarge: null },
  { id: "52883",             name: "Pokemon Platinum Version",           fullName: "Pokemon Platinum Version · Nintendo DS",          platform: "Nintendo DS",    loosePriceCents: 8500,  cibPriceCents: 12000,  newPriceCents: 28000,  priceCents: 8500,  currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-goldeneye",  name: "GoldenEye 007",                     fullName: "GoldenEye 007 · Nintendo 64",                     platform: "Nintendo 64",    loosePriceCents: 4500,  cibPriceCents: 8000,   newPriceCents: 18000,  priceCents: 4500,  currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-conker",     name: "Conker's Bad Fur Day",               fullName: "Conker's Bad Fur Day · Nintendo 64",              platform: "Nintendo 64",    loosePriceCents: 5500,  cibPriceCents: 9500,   newPriceCents: 22000,  priceCents: 5500,  currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-sh2",        name: "Silent Hill 2",                     fullName: "Silent Hill 2 · PlayStation 2",                   platform: "PlayStation 2",  loosePriceCents: 6000,  cibPriceCents: 9000,   newPriceCents: 25000,  priceCents: 6000,  currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-ico",        name: "Ico",                               fullName: "Ico · PlayStation 2",                             platform: "PlayStation 2",  loosePriceCents: 2500,  cibPriceCents: 4500,   newPriceCents: 12000,  priceCents: 2500,  currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-katamari",   name: "Katamari Damacy",                   fullName: "Katamari Damacy · PlayStation 2",                 platform: "PlayStation 2",  loosePriceCents: 1800,  cibPriceCents: 3000,   newPriceCents: 8000,   priceCents: 1800,  currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-sotc",       name: "Shadow of the Colossus",            fullName: "Shadow of the Colossus · PlayStation 2",          platform: "PlayStation 2",  loosePriceCents: 2200,  cibPriceCents: 4000,   newPriceCents: 10000,  priceCents: 2200,  currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-metroid",    name: "Metroid Prime Trilogy",             fullName: "Metroid Prime Trilogy · Wii",                     platform: "Wii",            loosePriceCents: 7000,  cibPriceCents: 11000,  newPriceCents: 30000,  priceCents: 7000,  currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-pokemon-snap","name": "New Pokemon Snap",               fullName: "New Pokemon Snap · Nintendo Switch",              platform: "Nintendo Switch",loosePriceCents: 3500,  cibPriceCents: 4500,   newPriceCents: 5999,   priceCents: 3500,  currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-earthbound", name: "EarthBound",                        fullName: "EarthBound · Super Nintendo",                     platform: "Super Nintendo", loosePriceCents: 14000, cibPriceCents: 35000,  newPriceCents: 80000,  priceCents: 14000, currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-chrono",     name: "Chrono Trigger",                    fullName: "Chrono Trigger · Super Nintendo",                 platform: "Super Nintendo", loosePriceCents: 11000, cibPriceCents: 20000,  newPriceCents: 50000,  priceCents: 11000, currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-zelda-oot",  name: "The Legend of Zelda: Ocarina of Time", fullName: "The Legend of Zelda: Ocarina of Time · Nintendo 64", platform: "Nintendo 64", loosePriceCents: 3500, cibPriceCents: 7000, newPriceCents: 18000, priceCents: 3500, currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-mario64",    name: "Super Mario 64",                    fullName: "Super Mario 64 · Nintendo 64",                    platform: "Nintendo 64",    loosePriceCents: 4000,  cibPriceCents: 8000,   newPriceCents: 20000,  priceCents: 4000,  currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-pokemon-red","name": "Pokemon Red Version",             fullName: "Pokemon Red Version · Game Boy",                  platform: "Game Boy",       loosePriceCents: 5500,  cibPriceCents: 12000,  newPriceCents: 35000,  priceCents: 5500,  currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-pokemon-gold","name": "Pokemon Gold Version",           fullName: "Pokemon Gold Version · Game Boy Color",           platform: "Game Boy Color", loosePriceCents: 4000,  cibPriceCents: 9000,   newPriceCents: 25000,  priceCents: 4000,  currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-halo",       name: "Halo: Combat Evolved",              fullName: "Halo: Combat Evolved · Xbox",                     platform: "Xbox",           loosePriceCents: 1200,  cibPriceCents: 2000,   newPriceCents: 6000,   priceCents: 1200,  currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-xbox360",    name: "Xbox 360 Console",                  fullName: "Xbox 360 Console · Microsoft",                    platform: "Xbox 360",       loosePriceCents: 5000,  cibPriceCents: 7000,   newPriceCents: 15000,  priceCents: 5000,  currency: "USD", imageSmall: null, imageLarge: null },
  { id: "static-dreamcast",  name: "Sega Dreamcast Console",            fullName: "Sega Dreamcast Console · Sega",                   platform: "Sega Dreamcast", loosePriceCents: 8000,  cibPriceCents: 12000,  newPriceCents: 30000,  priceCents: 8000,  currency: "USD", imageSmall: null, imageLarge: null },
];

function searchStatic(q: string): GameSuggestion[] {
  const lower = q.toLowerCase();
  return STATIC_GAMES.filter(
    (g) => g.name.toLowerCase().includes(lower) || g.platform.toLowerCase().includes(lower)
  ).slice(0, 10);
}

// ─── PriceCharting API ────────────────────────────────────────────────────────

async function searchPriceCharting(q: string): Promise<GameSuggestion[]> {
  const apiKey = process.env.PRICECHARTING_API_KEY;
  if (!apiKey) return [];

  const url = `https://www.pricecharting.com/api/products?q=${encodeURIComponent(q)}&id=${apiKey}&status=price`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];

  const data = await res.json() as {
    products?: Array<{
      id: string;
      "product-name": string;
      "console-name": string;
      "loose-price": number;
      "cib-price": number;
      "new-price": number;
    }>;
  };

  return (data.products ?? [])
    .filter((p) => isGamingPlatform(p["console-name"]))
    .slice(0, 10)
    .map((p) => {
      const loose = p["loose-price"] ? Math.round(p["loose-price"]) : null;
      const cib   = p["cib-price"]   ? Math.round(p["cib-price"])   : null;
      const newP  = p["new-price"]   ? Math.round(p["new-price"])   : null;
      return {
        id:              String(p.id),
        name:            p["product-name"],
        fullName:        `${p["product-name"]} · ${p["console-name"]}`,
        platform:        p["console-name"],
        loosePriceCents: loose,
        cibPriceCents:   cib,
        newPriceCents:   newP,
        priceCents:      loose ?? cib ?? newP,
        currency:        "USD" as const,
        imageSmall:      null,
        imageLarge:      null,
      };
    });
}

// ─── eBay Finding API fallback ────────────────────────────────────────────────

async function searchEbay(q: string): Promise<GameSuggestion[]> {
  const appId = process.env.EBAY_APP_ID;
  if (!appId) return [];

  const url = new URL("https://svcs.ebay.com/services/search/FindingService/v1");
  url.searchParams.set("OPERATION-NAME",        "findItemsByKeywords");
  url.searchParams.set("SERVICE-VERSION",       "1.0.0");
  url.searchParams.set("SECURITY-APPNAME",      appId);
  url.searchParams.set("RESPONSE-DATA-FORMAT",  "JSON");
  url.searchParams.set("keywords",              `${q} game`);
  url.searchParams.set("itemFilter(0).name",    "Condition");
  url.searchParams.set("itemFilter(0).value",   "3000"); // Used
  url.searchParams.set("paginationInput.entriesPerPage", "10");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return [];

  const data = await res.json() as {
    findItemsByKeywordsResponse?: Array<{
      searchResult?: Array<{ item?: Array<{ title: string[]; sellingStatus: Array<{ currentPrice: Array<{ __value__: string }> }> }> }>;
    }>;
  };

  const items = data?.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item ?? [];
  return items.slice(0, 8).map((item, i) => {
    const title      = item.title?.[0] ?? "Unknown";
    const priceStr   = item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ ?? "0";
    const priceCents = Math.round(parseFloat(priceStr) * 100);
    return {
      id:              `ebay-${i}-${Date.now()}`,
      name:            title,
      fullName:        title,
      platform:        "eBay",
      loosePriceCents: priceCents,
      cibPriceCents:   null,
      newPriceCents:   null,
      priceCents,
      currency:        "USD" as const,
      imageSmall:      null,
      imageLarge:      null,
    };
  });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [], source: "static" });
  }

  // 1. PriceCharting
  try {
    const pcResults = await searchPriceCharting(q);
    if (pcResults.length > 0) {
      return NextResponse.json({ suggestions: pcResults, source: "pricecharting" });
    }
  } catch { /* fall through */ }

  // 2. eBay Finding API
  try {
    const ebayResults = await searchEbay(q);
    if (ebayResults.length > 0) {
      return NextResponse.json({ suggestions: ebayResults, source: "ebay" });
    }
  } catch { /* fall through */ }

  // 3. Static fallback
  const staticResults = searchStatic(q);
  return NextResponse.json({ suggestions: staticResults, source: "static" });
}
