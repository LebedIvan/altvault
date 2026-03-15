import type { Suggestion } from "@/components/ui/AutocompleteInput";

// ─── LEGO ─────────────────────────────────────────────────────────────────────

export const LEGO_SUGGESTIONS: Suggestion[] = [
  { label: "10497 Galaxy Explorer",           value: "LEGO 10497 Galaxy Explorer",           externalId: "10497", meta: "Icons · 1254 pieces" },
  { label: "10307 Eiffel Tower",              value: "LEGO 10307 Eiffel Tower",               externalId: "10307", meta: "Icons · 10001 pieces" },
  { label: "10305 Lion Knights' Castle",      value: "LEGO 10305 Lion Knights' Castle",       externalId: "10305", meta: "Icons · 4514 pieces" },
  { label: "75313 AT-AT",                     value: "LEGO 75313 AT-AT",                      externalId: "75313", meta: "Star Wars · 6785 pieces" },
  { label: "10294 Titanic",                   value: "LEGO 10294 Titanic",                    externalId: "10294", meta: "Icons · 9090 pieces" },
  { label: "10317 Land Rover Defender 90",    value: "LEGO 10317 Land Rover Defender 90",     externalId: "10317", meta: "Icons · 2336 pieces" },
  { label: "10323 PAC-MAN Arcade",            value: "LEGO 10323 PAC-MAN Arcade",             externalId: "10323", meta: "Icons · 2651 pieces" },
  { label: "42171 Mercedes-AMG F1",           value: "LEGO 42171 Mercedes-AMG F1",            externalId: "42171", meta: "Technic · 1642 pieces" },
  { label: "21332 The Globe",                 value: "LEGO 21332 The Globe",                  externalId: "21332", meta: "Ideas · 2585 pieces" },
  { label: "10281 Bonsai Tree",               value: "LEGO 10281 Bonsai Tree",                externalId: "10281", meta: "Icons · 878 pieces" },
  { label: "10311 Orchid",                    value: "LEGO 10311 Orchid",                     externalId: "10311", meta: "Icons · 608 pieces" },
  { label: "43217 Up House",                  value: "LEGO 43217 Up House",                   externalId: "43217", meta: "Disney · 598 pieces" },
  { label: "76252 Batcave Shadow Box",        value: "LEGO 76252 Batcave Shadow Box",         externalId: "76252", meta: "DC · 3981 pieces" },
  { label: "75341 The Razor Crest",           value: "LEGO 75341 The Razor Crest",            externalId: "75341", meta: "Star Wars · 6187 pieces" },
  { label: "10302 Optimus Prime",             value: "LEGO 10302 Optimus Prime",              externalId: "10302", meta: "Icons · 1508 pieces" },
  { label: "21343 Viking Village",            value: "LEGO 21343 Viking Village",             externalId: "21343", meta: "Ideas · 2103 pieces" },
  { label: "10318 Concorde",                  value: "LEGO 10318 Concorde",                   externalId: "10318", meta: "Icons · 2083 pieces" },
  { label: "10320 Eldorado Fortress",         value: "LEGO 10320 Eldorado Fortress",          externalId: "10320", meta: "Icons · 2509 pieces" },
  { label: "75367 Venator-Class Republic Attack Cruiser", value: "LEGO 75367 Venator",       externalId: "75367", meta: "Star Wars · 5374 pieces" },
  { label: "76241 Hulk Mech Armor",           value: "LEGO 76241 Hulk Mech Armor",            externalId: "76241", meta: "Marvel · 138 pieces" },
];

// ─── Pokémon (most sought-after graded cards) ─────────────────────────────────

export const POKEMON_SUGGESTIONS: Suggestion[] = [
  { label: "Charizard 4/102 Base Set",        value: "Charizard Base Set PSA",     externalId: "PSA-Charizard-Base-Holo",    meta: "Base Set 1999 · Holo Rare" },
  { label: "Charizard 1st Edition Base Set",  value: "Charizard 1st Ed Base PSA",  externalId: "PSA-Charizard-1st-Base",     meta: "1st Edition · Most valuable" },
  { label: "Pikachu Illustrator",             value: "Pikachu Illustrator PSA",    externalId: "PSA-Pikachu-Illustrator",    meta: "Promo 1997 · Rarest card" },
  { label: "Blastoise 2/102 Base Set",        value: "Blastoise Base Set PSA",     externalId: "PSA-Blastoise-Base-Holo",    meta: "Base Set 1999 · Holo Rare" },
  { label: "Venusaur 15/102 Base Set",        value: "Venusaur Base Set PSA",      externalId: "PSA-Venusaur-Base-Holo",     meta: "Base Set 1999 · Holo Rare" },
  { label: "Lugia 9/111 Neo Genesis",         value: "Lugia Neo Genesis PSA",      externalId: "PSA-Lugia-Neo-Genesis",      meta: "Neo Genesis 2000 · Holo Rare" },
  { label: "Mewtwo 10/102 Base Set",          value: "Mewtwo Base Set PSA",        externalId: "PSA-Mewtwo-Base-Holo",       meta: "Base Set 1999" },
  { label: "Umbreon 173/173 Gold Star",       value: "Umbreon Gold Star PSA",      externalId: "PSA-Umbreon-Gold-Star",      meta: "POP Series 5 · Ultra Rare" },
  { label: "Espeon 016/P-P Gold Star",        value: "Espeon Gold Star PSA",       externalId: "PSA-Espeon-Gold-Star",       meta: "Promo · Ultra Rare" },
  { label: "Rayquaza Gold Star 107/107",      value: "Rayquaza Gold Star PSA",     externalId: "PSA-Rayquaza-Gold-Star",     meta: "EX Deoxys · Ultra Rare" },
  { label: "Charizard VMAX 74/73 Secret",     value: "Charizard VMAX Secret PSA",  externalId: "PSA-Charizard-VMAX-Secret",  meta: "Champion's Path · Alt Art" },
  { label: "Umbreon VMAX Alt Art 215/203",    value: "Umbreon VMAX Alt Art PSA",   externalId: "PSA-Umbreon-VMAX-Alt",       meta: "Evolving Skies" },
];

// ─── MTG (most valuable singles) ─────────────────────────────────────────────

export const MTG_SUGGESTIONS: Suggestion[] = [
  { label: "Black Lotus Alpha",         value: "Black Lotus Alpha BGS",       externalId: "MTG-Black-Lotus-Alpha",    meta: "Alpha 1993 · Power Nine" },
  { label: "Mox Sapphire Alpha",        value: "Mox Sapphire Alpha BGS",      externalId: "MTG-Mox-Sapphire-Alpha",   meta: "Alpha 1993 · Power Nine" },
  { label: "Ancestral Recall Alpha",    value: "Ancestral Recall Alpha BGS",  externalId: "MTG-Ancestral-Alpha",      meta: "Alpha 1993 · Power Nine" },
  { label: "Timetwister Alpha",         value: "Timetwister Alpha BGS",       externalId: "MTG-Timetwister-Alpha",    meta: "Alpha 1993 · Power Nine" },
  { label: "Underground Sea Revised",   value: "Underground Sea Revised BGS", externalId: "MTG-Underground-Sea-Rev",  meta: "Revised 1994 · Dual Land" },
  { label: "Volcanic Island Revised",   value: "Volcanic Island Revised BGS", externalId: "MTG-Volcanic-Island-Rev",  meta: "Revised 1994 · Dual Land" },
  { label: "Tarmogoyf Future Sight",    value: "Tarmogoyf Future Sight",      externalId: "MTG-Tarmogoyf-FS",         meta: "Future Sight 2007" },
];

// ─── One Piece ────────────────────────────────────────────────────────────────

export const ONE_PIECE_SUGGESTIONS: Suggestion[] = [
  { label: "Monkey D. Luffy OP01-120 SEC",  value: "Luffy OP01-120 PSA",   externalId: "OP01-120", meta: "Romance Dawn · SEC" },
  { label: "Roronoa Zoro OP01-121 SEC",     value: "Zoro OP01-121 PSA",    externalId: "OP01-121", meta: "Romance Dawn · SEC" },
  { label: "Nami OP02-119 SEC",             value: "Nami OP02-119 PSA",    externalId: "OP02-119", meta: "Paramount War · SEC" },
  { label: "Whitebeard OP03-116 SEC",       value: "Whitebeard OP03-116",  externalId: "OP03-116", meta: "Pillars of Strength · SEC" },
  { label: "Yamato OP06-119 SEC",           value: "Yamato OP06-119 PSA",  externalId: "OP06-119", meta: "Wings of the Captain · SEC" },
];

// ─── Commodities ─────────────────────────────────────────────────────────────

export const COMMODITY_SUGGESTIONS: Suggestion[] = [
  { label: "Silver 1oz Maple Leaf",     value: "Silver 1oz Maple Leaf",    externalId: "SILVER-MAPLE-1OZ",      meta: "Royal Canadian Mint · .9999" },
  { label: "Silver 1oz American Eagle", value: "Silver 1oz American Eagle",externalId: "SILVER-EAGLE-1OZ",      meta: "US Mint · .999" },
  { label: "Silver 1oz Britannia",      value: "Silver 1oz Britannia",     externalId: "SILVER-BRITANNIA-1OZ",  meta: "Royal Mint · .999" },
  { label: "Silver 1oz Philharmonic",   value: "Silver 1oz Philharmonic",  externalId: "SILVER-PHIL-1OZ",       meta: "Austrian Mint · .999" },
  { label: "Gold 1oz American Eagle",   value: "Gold 1oz American Eagle",  externalId: "GOLD-EAGLE-1OZ",        meta: "US Mint · .9167" },
  { label: "Gold 1oz Maple Leaf",       value: "Gold 1oz Maple Leaf",      externalId: "GOLD-MAPLE-1OZ",        meta: "Royal Canadian Mint · .9999" },
  { label: "Gold 1oz Krugerrand",       value: "Gold 1oz Krugerrand",      externalId: "GOLD-KRUGERRAND-1OZ",   meta: "South African Mint · .9167" },
  { label: "Platinum 1oz American Eagle", value: "Platinum 1oz Eagle",     externalId: "PLATINUM-EAGLE-1OZ",    meta: "US Mint · .9995" },
];

// ─── Domains ─────────────────────────────────────────────────────────────────

export const DOMAIN_SUGGESTIONS: Suggestion[] = [
  { label: ".com domain",   value: "Domain .com",   externalId: "", meta: "Generic TLD" },
  { label: ".io domain",    value: "Domain .io",    externalId: "", meta: "Tech TLD" },
  { label: ".ai domain",    value: "Domain .ai",    externalId: "", meta: "AI / premium TLD" },
  { label: ".xyz domain",   value: "Domain .xyz",   externalId: "", meta: "Generic TLD" },
  { label: ".co domain",    value: "Domain .co",    externalId: "", meta: "Colombia / startup TLD" },
];

// ─── Music royalties ──────────────────────────────────────────────────────────

export const ROYALTY_SUGGESTIONS: Suggestion[] = [
  { label: "Spotify streaming royalty share", value: "Spotify Royalty Share",    meta: "Streaming · Monthly income" },
  { label: "YouTube Content ID royalty",      value: "YouTube Content ID Share", meta: "Video streaming" },
  { label: "Sync licensing deal",             value: "Sync License Share",       meta: "Film / TV / ads" },
  { label: "Master recording share",          value: "Master Recording Share",   meta: "Ownership stake" },
  { label: "Publishing catalog share",        value: "Publishing Catalog Share", meta: "Songwriting royalties" },
];

// ─── P2P Lending ─────────────────────────────────────────────────────────────

export const P2P_SUGGESTIONS: Suggestion[] = [
  { label: "Mintos loan note",        value: "Mintos Loan Note",     meta: "EUR · avg 9-11% APR" },
  { label: "Bondora Go & Grow",       value: "Bondora Go & Grow",    meta: "EUR · 6.75% APR target" },
  { label: "PeerBerry loan",          value: "PeerBerry Loan",       meta: "EUR · avg 10-12% APR" },
  { label: "Estateguru mortgage note",value: "Estateguru Mortgage",  meta: "EUR · real-estate backed" },
  { label: "Reinvest24 property",     value: "Reinvest24 Property",  meta: "EUR · rental income" },
];

// ─── Router: get suggestions by asset class ───────────────────────────────────

export function getStaticSuggestions(assetClass: string): Suggestion[] {
  switch (assetClass) {
    case "lego":            return LEGO_SUGGESTIONS;
    case "trading_cards":   return [...POKEMON_SUGGESTIONS, ...MTG_SUGGESTIONS, ...ONE_PIECE_SUGGESTIONS];
    case "commodities":     return COMMODITY_SUGGESTIONS;
    case "domain_names":    return DOMAIN_SUGGESTIONS;
    case "music_royalties": return ROYALTY_SUGGESTIONS;
    case "p2p_lending":     return P2P_SUGGESTIONS;
    default:                return [];
  }
}
