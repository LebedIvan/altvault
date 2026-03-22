/**
 * Seeds games_tech table with ~500 well-known items (games, consoles, phones, tech).
 * Prices are approximate real market values (CeX-style GBP × 100 for cexSellPriceCents,
 * PriceCharting-style USD × 100 for loosePriceCents).
 *
 * Usage:
 *   npx tsx scripts/seed-games-tech-static.ts
 */

import path from "path";
import fs from "fs";
import type { GamesTechRecord } from "../src/lib/gamesTechRecord";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

import { upsertGamesTech } from "../src/lib/gamesTechDb";

function log(msg: string) { process.stdout.write(`[${new Date().toISOString().slice(11,19)}] ${msg}\n`); }

// Helper: prices in real currency units → cents
function g(id: string, name: string, platform: string, cat: string,
  loose: number|null, cib: number|null, newP: number|null,
  cexSell: number|null, cexCash: number|null,
  year?: number|null): GamesTechRecord {
  return {
    id, name, platform, category: cat,
    loosePriceCents:   loose   ? Math.round(loose   * 100) : null,
    cibPriceCents:     cib     ? Math.round(cib     * 100) : null,
    newPriceCents:     newP    ? Math.round(newP    * 100) : null,
    priceUpdatedAt:    "2025-03-01T00:00:00.000Z",
    cexBoxId:          null,
    cexSellPriceCents: cexSell ? Math.round(cexSell * 100) : null,
    cexCashPriceCents: cexCash ? Math.round(cexCash * 100) : null,
    igdbId: null, description: null, genres: [], coverUrl: null,
    releaseYear: year ?? null, imageUrl: null, priceChartingUrl: null,
    sources: ["static"], lastSyncedAt: new Date().toISOString(),
  };
}

// ─── DATASET ──────────────────────────────────────────────────────────────────
// Format: g(id, name, platform, category, looseUSD, cibUSD, newUSD, cexSellGBP, cexCashGBP, year)

const RECORDS: GamesTechRecord[] = [

  // ══════════════════════════════════════════════════════════
  // CONSOLES (hardware)
  // ══════════════════════════════════════════════════════════

  g("hw-ps5-disc",     "PlayStation 5 (Disc)",          "PlayStation 5",   "console", null, null, 449.99, 380, 280, 2020),
  g("hw-ps5-digital",  "PlayStation 5 Digital",         "PlayStation 5",   "console", null, null, 349.99, 290, 220, 2020),
  g("hw-ps4-slim",     "PlayStation 4 Slim 500GB",      "PlayStation 4",   "console", 200,  220,  299,    165, 120, 2016),
  g("hw-ps4-pro",      "PlayStation 4 Pro 1TB",         "PlayStation 4",   "console", 250,  280,  399,    200, 150, 2016),
  g("hw-ps3-slim",     "PlayStation 3 Slim 320GB",      "PlayStation 3",   "console", 90,   110,  200,    55,  35,  2009),
  g("hw-ps2-fat",      "PlayStation 2 (Fat)",           "PlayStation 2",   "console", 80,   100,  200,    45,  30,  2000),
  g("hw-ps1",          "PlayStation 1 (Original)",      "PlayStation",     "console", 60,   80,   200,    35,  25,  1994),

  g("hw-xsx",          "Xbox Series X",                 "Xbox Series",     "console", null, null, 449.99, 350, 260, 2020),
  g("hw-xss",          "Xbox Series S",                 "Xbox Series",     "console", null, null, 249.99, 200, 150, 2020),
  g("hw-xone-s",       "Xbox One S 1TB",                "Xbox One",        "console", 120,  140,  299,    90,  65,  2016),
  g("hw-xone-x",       "Xbox One X 1TB",                "Xbox One",        "console", 180,  220,  499,    130, 100, 2017),
  g("hw-x360-slim",    "Xbox 360 Slim 250GB",           "Xbox 360",        "console", 60,   80,   200,    35,  25,  2010),
  g("hw-xbox-og",      "Xbox Original",                 "Xbox",            "console", 50,   70,   200,    30,  20,  2001),

  g("hw-switch-oled",  "Nintendo Switch OLED",          "Nintendo Switch", "console", 270,  290,  349.99, 230, 170, 2021),
  g("hw-switch-v2",    "Nintendo Switch (V2)",          "Nintendo Switch", "console", 200,  220,  299.99, 165, 120, 2019),
  g("hw-switch-lite",  "Nintendo Switch Lite",          "Nintendo Switch", "handheld",130,  150,  199.99, 100, 75,  2019),
  g("hw-wiiu",         "Wii U 32GB Premium",            "Wii U",           "console", 130,  160,  300,    80,  55,  2012),
  g("hw-wii",          "Nintendo Wii (White)",          "Wii",             "console", 40,   60,   200,    30,  20,  2006),
  g("hw-gamecube",     "Nintendo GameCube",             "GameCube",        "console", 90,   120,  350,    55,  40,  2001),
  g("hw-n64",          "Nintendo 64",                   "Nintendo 64",     "console", 80,   110,  350,    50,  35,  1996),
  g("hw-snes",         "Super Nintendo",                "Super Nintendo",  "console", 100,  130,  400,    60,  45,  1990),
  g("hw-nes",          "Nintendo Entertainment System", "NES",             "console", 80,   120,  500,    45,  30,  1985),
  g("hw-gba-sp",       "Game Boy Advance SP",           "Game Boy Advance","handheld",60,   80,   200,    40,  28,  2003),
  g("hw-gba",          "Game Boy Advance",              "Game Boy Advance","handheld",40,   55,   150,    30,  20,  2001),
  g("hw-gbc",          "Game Boy Color",                "Game Boy Color",  "handheld",55,   75,   200,    35,  25,  1998),
  g("hw-gb",           "Game Boy",                      "Game Boy",        "handheld",45,   65,   200,    30,  20,  1989),
  g("hw-nds-lite",     "Nintendo DS Lite",              "Nintendo DS",     "handheld",40,   55,   150,    30,  22,  2006),
  g("hw-3ds-xl",       "Nintendo 3DS XL",               "Nintendo 3DS",    "handheld",80,   100,  200,    60,  40,  2012),
  g("hw-3ds-new-xl",   "New Nintendo 3DS XL",           "Nintendo 3DS",    "handheld",100,  130,  250,    75,  55,  2015),
  g("hw-psp-3000",     "PSP 3000",                      "PSP",             "handheld",60,   80,   200,    35,  25,  2008),
  g("hw-psvita",       "PS Vita Slim",                  "PlayStation Vita","handheld",130,  160,  350,    90,  65,  2013),
  g("hw-dreamcast",    "Sega Dreamcast",                "Sega Dreamcast",  "console", 80,   110,  300,    55,  38,  1998),
  g("hw-saturn",       "Sega Saturn",                   "Sega Saturn",     "console", 120,  160,  500,    70,  50,  1994),
  g("hw-megadrive",    "Sega Mega Drive (Genesis)",     "Sega Genesis",    "console", 60,   85,   250,    40,  28,  1988),
  g("hw-steamdeck",    "Steam Deck 256GB",              "PC",              "handheld",null, null, 399,    320, 240, 2022),

  // ══════════════════════════════════════════════════════════
  // PS5 GAMES
  // ══════════════════════════════════════════════════════════

  g("ps5-demon-souls",   "Demon's Souls",                     "PlayStation 5", "game", 35, 40, 60,  18, 12, 2020),
  g("ps5-returnal",      "Returnal",                          "PlayStation 5", "game", 30, 35, 60,  15, 10, 2021),
  g("ps5-ratchet",       "Ratchet & Clank: Rift Apart",       "PlayStation 5", "game", 30, 35, 60,  18, 12, 2021),
  g("ps5-spiderman-mm",  "Marvel's Spider-Man: Miles Morales","PlayStation 5", "game", 25, 30, 50,  16, 11, 2020),
  g("ps5-spiderman2",    "Marvel's Spider-Man 2",             "PlayStation 5", "game", 40, 45, 70,  25, 17, 2023),
  g("ps5-gow-ragnarok",  "God of War Ragnarök",               "PlayStation 5", "game", 35, 40, 70,  22, 15, 2022),
  g("ps5-horizon-fw",    "Horizon Forbidden West",            "PlayStation 5", "game", 25, 30, 60,  16, 11, 2022),
  g("ps5-ff16",          "Final Fantasy XVI",                 "PlayStation 5", "game", 35, 40, 70,  22, 15, 2023),
  g("ps5-eldenring",     "Elden Ring",                        "PlayStation 5", "game", 30, 35, 60,  20, 14, 2022),
  g("ps5-astro",         "Astro's Playroom",                  "PlayStation 5", "game", null,null,null,null,null,2020),
  g("ps5-gran-turismo7", "Gran Turismo 7",                    "PlayStation 5", "game", 25, 30, 60,  16, 11, 2022),
  g("ps5-ghost-tsushima","Ghost of Tsushima Director's Cut",  "PlayStation 5", "game", 30, 35, 60,  20, 14, 2021),
  g("ps5-tlou1",         "The Last of Us Part I",             "PlayStation 5", "game", 35, 40, 70,  22, 15, 2022),
  g("ps5-ff7-rebirth",   "Final Fantasy VII Rebirth",         "PlayStation 5", "game", 45, 50, 70,  28, 20, 2024),
  g("ps5-stellar-blade", "Stellar Blade",                     "PlayStation 5", "game", 40, 45, 70,  25, 17, 2024),

  // ══════════════════════════════════════════════════════════
  // PS4 GAMES
  // ══════════════════════════════════════════════════════════

  g("ps4-tlou2",         "The Last of Us Part II",            "PlayStation 4", "game", 15, 18, 40,  8,  5,  2020),
  g("ps4-gow2018",       "God of War",                        "PlayStation 4", "game", 12, 15, 30,  6,  4,  2018),
  g("ps4-spiderman",     "Marvel's Spider-Man",               "PlayStation 4", "game", 12, 15, 30,  6,  4,  2018),
  g("ps4-rdr2",          "Red Dead Redemption 2",             "PlayStation 4", "game", 18, 22, 40,  10, 7,  2018),
  g("ps4-witcher3",      "The Witcher 3: Wild Hunt",          "PlayStation 4", "game", 10, 12, 25,  5,  3,  2015),
  g("ps4-bloodborne",    "Bloodborne",                        "PlayStation 4", "game", 25, 30, 70,  14, 10, 2015),
  g("ps4-persona5",      "Persona 5",                         "PlayStation 4", "game", 25, 30, 80,  14, 10, 2016),
  g("ps4-persona5r",     "Persona 5 Royal",                   "PlayStation 4", "game", 20, 25, 50,  12, 8,  2019),
  g("ps4-ff7r",          "Final Fantasy VII Remake",          "PlayStation 4", "game", 15, 18, 40,  8,  5,  2020),
  g("ps4-horizon",       "Horizon Zero Dawn",                 "PlayStation 4", "game", 8,  10, 20,  4,  3,  2017),
  g("ps4-ghosts",        "Ghost of Tsushima",                 "PlayStation 4", "game", 18, 22, 40,  10, 7,  2020),
  g("ps4-sekiro",        "Sekiro: Shadows Die Twice",         "PlayStation 4", "game", 25, 30, 60,  14, 10, 2019),
  g("ps4-ds3",           "Dark Souls III",                    "PlayStation 4", "game", 18, 22, 40,  10, 7,  2016),
  g("ps4-p4g",           "Persona 4 Golden",                  "PlayStation 4", "game", 20, 25, 60,  12, 8,  2020),
  g("ps4-ff15",          "Final Fantasy XV",                  "PlayStation 4", "game", 8,  10, 20,  4,  3,  2016),
  g("ps4-nioh",          "Nioh",                              "PlayStation 4", "game", 10, 12, 30,  5,  3,  2017),
  g("ps4-nier",          "NieR: Automata",                    "PlayStation 4", "game", 18, 22, 40,  10, 7,  2017),
  g("ps4-detroit",       "Detroit: Become Human",             "PlayStation 4", "game", 10, 12, 25,  5,  3,  2018),
  g("ps4-mgs5",          "Metal Gear Solid V: The Phantom Pain","PlayStation 4","game",8, 10, 20,   4,  3,  2015),
  g("ps4-uncharted4",    "Uncharted 4: A Thief's End",        "PlayStation 4", "game", 8,  10, 20,  4,  3,  2016),

  // ══════════════════════════════════════════════════════════
  // NINTENDO SWITCH GAMES
  // ══════════════════════════════════════════════════════════

  g("sw-botw",           "The Legend of Zelda: Breath of the Wild","Nintendo Switch","game",40, 45, 60, 28, 20, 2017),
  g("sw-totk",           "The Legend of Zelda: Tears of the Kingdom","Nintendo Switch","game",45,50,70, 32, 22, 2023),
  g("sw-mk8dx",          "Mario Kart 8 Deluxe",               "Nintendo Switch","game", 40, 45, 60, 28, 20, 2017),
  g("sw-smash",          "Super Smash Bros. Ultimate",         "Nintendo Switch","game", 40, 45, 60, 28, 20, 2018),
  g("sw-acnh",           "Animal Crossing: New Horizons",      "Nintendo Switch","game", 30, 35, 60, 20, 14, 2020),
  g("sw-sm-odyssey",     "Super Mario Odyssey",                "Nintendo Switch","game", 40, 45, 60, 28, 20, 2017),
  g("sw-pokemon-sv",     "Pokémon Scarlet",                    "Nintendo Switch","game", 35, 40, 60, 24, 17, 2022),
  g("sw-pokemon-vi",     "Pokémon Violet",                     "Nintendo Switch","game", 35, 40, 60, 24, 17, 2022),
  g("sw-pokemon-bdsp",   "Pokémon Brilliant Diamond",          "Nintendo Switch","game", 30, 35, 60, 20, 14, 2021),
  g("sw-xenoblade3",     "Xenoblade Chronicles 3",             "Nintendo Switch","game", 35, 40, 60, 24, 17, 2022),
  g("sw-fire-emblem3h",  "Fire Emblem: Three Houses",          "Nintendo Switch","game", 35, 40, 60, 24, 17, 2019),
  g("sw-metroid-dread",  "Metroid Dread",                      "Nintendo Switch","game", 35, 40, 60, 24, 17, 2021),
  g("sw-luigi-mansion3", "Luigi's Mansion 3",                  "Nintendo Switch","game", 35, 40, 60, 24, 17, 2019),
  g("sw-ring-fit",       "Ring Fit Adventure",                 "Nintendo Switch","game", 50, 60, 80, 35, 25, 2019),
  g("sw-splatoon3",      "Splatoon 3",                         "Nintendo Switch","game", 35, 40, 60, 24, 17, 2022),
  g("sw-bayonetta3",     "Bayonetta 3",                        "Nintendo Switch","game", 30, 35, 60, 20, 14, 2022),
  g("sw-astral-chain",   "Astral Chain",                       "Nintendo Switch","game", 35, 40, 60, 24, 17, 2019),
  g("sw-mario-rpg",      "Super Mario RPG",                    "Nintendo Switch","game", 40, 45, 60, 28, 20, 2023),
  g("sw-pikmin4",        "Pikmin 4",                           "Nintendo Switch","game", 35, 40, 60, 24, 17, 2023),

  // ══════════════════════════════════════════════════════════
  // XBOX GAMES
  // ══════════════════════════════════════════════════════════

  g("xb-halo-infinite",  "Halo Infinite",                     "Xbox Series",   "game", 15, 18, 60, 8,  5,  2021),
  g("xb-forza-h5",       "Forza Horizon 5",                   "Xbox Series",   "game", 20, 25, 60, 12, 8,  2021),
  g("xb-msfs2020",       "Microsoft Flight Simulator",        "Xbox Series",   "game", 25, 30, 70, 14, 10, 2022),
  g("xb-rdr2-xb",        "Red Dead Redemption 2 (Xbox)",      "Xbox One",      "game", 15, 18, 40, 8,  5,  2018),
  g("xb-cyberpunk",      "Cyberpunk 2077",                    "Xbox One",      "game", 10, 12, 30, 5,  3,  2020),

  // ══════════════════════════════════════════════════════════
  // RETRO GAMES — N64
  // ══════════════════════════════════════════════════════════

  g("n64-sm64",          "Super Mario 64",                    "Nintendo 64",   "game", 40, 80,  200, 30, 20, 1996),
  g("n64-oot",           "The Legend of Zelda: Ocarina of Time","Nintendo 64", "game", 35, 70,  180, 25, 17, 1998),
  g("n64-mm",            "The Legend of Zelda: Majora's Mask","Nintendo 64",   "game", 45, 90,  200, 32, 22, 2000),
  g("n64-goldeneye",     "GoldenEye 007",                     "Nintendo 64",   "game", 45, 80,  180, 32, 22, 1997),
  g("n64-mario-kart64",  "Mario Kart 64",                     "Nintendo 64",   "game", 40, 70,  150, 28, 20, 1996),
  g("n64-dk64",          "Donkey Kong 64",                    "Nintendo 64",   "game", 35, 65,  150, 25, 17, 1999),
  g("n64-conker",        "Conker's Bad Fur Day",              "Nintendo 64",   "game", 55, 95,  220, 40, 28, 2001),
  g("n64-banjokazooie",  "Banjo-Kazooie",                     "Nintendo 64",   "game", 40, 75,  180, 28, 20, 1998),
  g("n64-pokemon-stadium","Pokémon Stadium",                  "Nintendo 64",   "game", 35, 65,  150, 25, 17, 1999),

  // ══════════════════════════════════════════════════════════
  // RETRO — SNES
  // ══════════════════════════════════════════════════════════

  g("snes-chrono-trigger","Chrono Trigger",                   "Super Nintendo","game", 110, 200, 500, 70, 50, 1995),
  g("snes-earthbound",    "EarthBound",                       "Super Nintendo","game", 140, 350, 800, 90, 65, 1994),
  g("snes-zelda-lttp",    "The Legend of Zelda: A Link to the Past","Super Nintendo","game",50,90,200,35,25,1991),
  g("snes-super-mario-world","Super Mario World",             "Super Nintendo","game", 35, 65,  150, 25, 17, 1990),
  g("snes-mario-kart",    "Super Mario Kart",                 "Super Nintendo","game", 40, 75,  180, 28, 20, 1992),
  g("snes-dk-country",    "Donkey Kong Country",              "Super Nintendo","game", 25, 45,  120, 18, 12, 1994),
  g("snes-ff6",           "Final Fantasy VI",                 "Super Nintendo","game", 70, 130, 350, 45, 32, 1994),
  g("snes-smrpg",         "Super Mario RPG",                  "Super Nintendo","game", 60, 110, 280, 38, 27, 1996),

  // ══════════════════════════════════════════════════════════
  // RETRO — PS1
  // ══════════════════════════════════════════════════════════

  g("ps1-ff7",           "Final Fantasy VII",                 "PlayStation",   "game", 30, 55,  150, 20, 14, 1997),
  g("ps1-ff9",           "Final Fantasy IX",                  "PlayStation",   "game", 20, 40,  100, 14, 10, 2000),
  g("ps1-crash1",        "Crash Bandicoot",                   "PlayStation",   "game", 20, 35,  100, 14, 10, 1996),
  g("ps1-spyro",         "Spyro the Dragon",                  "PlayStation",   "game", 15, 30,  80,  10, 7,  1998),
  g("ps1-mgs",           "Metal Gear Solid",                  "PlayStation",   "game", 25, 45,  120, 16, 11, 1998),
  g("ps1-silent-hill",   "Silent Hill",                       "PlayStation",   "game", 60, 100, 300, 40, 28, 1999),

  // ══════════════════════════════════════════════════════════
  // RETRO — PS2
  // ══════════════════════════════════════════════════════════

  g("ps2-sh2",           "Silent Hill 2",                     "PlayStation 2", "game", 60, 90,  250, 40, 28, 2001),
  g("ps2-ico",           "Ico",                               "PlayStation 2", "game", 25, 45,  120, 16, 11, 2001),
  g("ps2-sotc",          "Shadow of the Colossus",            "PlayStation 2", "game", 22, 40,  100, 14, 10, 2005),
  g("ps2-persona4",      "Persona 4",                         "PlayStation 2", "game", 50, 80,  200, 32, 22, 2008),
  g("ps2-dmc3",          "Devil May Cry 3",                   "PlayStation 2", "game", 20, 35,  100, 14, 10, 2005),
  g("ps2-gta-vc",        "Grand Theft Auto: Vice City",       "PlayStation 2", "game", 15, 25,  60,  10, 7,  2002),
  g("ps2-gta-sa",        "Grand Theft Auto: San Andreas",     "PlayStation 2", "game", 18, 30,  80,  12, 8,  2004),
  g("ps2-kingdom-hearts","Kingdom Hearts",                    "PlayStation 2", "game", 18, 30,  80,  12, 8,  2002),

  // ══════════════════════════════════════════════════════════
  // RETRO — GAMEBOY / GBA
  // ══════════════════════════════════════════════════════════

  g("gb-pokemon-red",    "Pokémon Red Version",               "Game Boy",      "game", 55, 120, 350, 38, 27, 1998),
  g("gb-pokemon-blue",   "Pokémon Blue Version",              "Game Boy",      "game", 50, 110, 320, 35, 25, 1998),
  g("gb-pokemon-yellow", "Pokémon Yellow Version",            "Game Boy",      "game", 60, 130, 380, 42, 30, 1998),
  g("gbc-pokemon-gold",  "Pokémon Gold Version",              "Game Boy Color","game", 40, 90,  250, 28, 20, 2000),
  g("gbc-pokemon-silver","Pokémon Silver Version",            "Game Boy Color","game", 40, 90,  250, 28, 20, 2000),
  g("gba-pokemon-firered","Pokémon FireRed",                  "Game Boy Advance","game",40, 80, 220, 28, 20, 2004),
  g("gba-pokemon-em",    "Pokémon Emerald",                   "Game Boy Advance","game",65, 130, 350, 45, 32, 2004),
  g("nds-pokemon-plat",  "Pokémon Platinum Version",          "Nintendo DS",   "game", 85, 120, 280, 55, 38, 2008),
  g("nds-pokemon-hg",    "Pokémon HeartGold",                 "Nintendo DS",   "game", 80, 130, 300, 52, 36, 2009),
  g("nds-pokemon-ss",    "Pokémon SoulSilver",                "Nintendo DS",   "game", 80, 130, 300, 52, 36, 2009),
  g("3ds-pokemon-xy",    "Pokémon X",                         "Nintendo 3DS",  "game", 25, 40,  80,  18, 12, 2013),
  g("3ds-pokemon-sun",   "Pokémon Sun",                       "Nintendo 3DS",  "game", 20, 35,  70,  14, 10, 2016),
  g("3ds-zelda-mm3d",    "The Legend of Zelda: Majora's Mask 3D","Nintendo 3DS","game",35,55, 120, 24, 17, 2015),

  // ══════════════════════════════════════════════════════════
  // SEGA GAMES
  // ══════════════════════════════════════════════════════════

  g("dc-shenmue",        "Shenmue",                           "Sega Dreamcast","game", 25, 45,  120, 16, 11, 1999),
  g("dc-sonic-adventure","Sonic Adventure",                   "Sega Dreamcast","game", 15, 30,  80,  10, 7,  1998),
  g("dc-marvel-vs-capcom","Marvel vs. Capcom 2",             "Sega Dreamcast","game", 60, 100, 280, 40, 28, 2000),
  g("md-sonic",          "Sonic the Hedgehog",                "Sega Genesis",  "game", 15, 25,  80,  10, 7,  1991),
  g("md-sonic2",         "Sonic the Hedgehog 2",              "Sega Genesis",  "game", 10, 20,  60,  7,  5,  1992),
  g("md-street-fighter2","Street Fighter II",                 "Sega Genesis",  "game", 12, 22,  70,  8,  5,  1993),

  // ══════════════════════════════════════════════════════════
  // IPHONES
  // ══════════════════════════════════════════════════════════

  g("iphone-16-pro-1t",  "iPhone 16 Pro Max 1TB",             "iPhone",        "phone", null, null, 1599, 950, 720, 2024),
  g("iphone-16-pro",     "iPhone 16 Pro 256GB",               "iPhone",        "phone", null, null, 1099, 720, 540, 2024),
  g("iphone-16-256",     "iPhone 16 256GB",                   "iPhone",        "phone", null, null, 899,  570, 430, 2024),
  g("iphone-15-pro-max", "iPhone 15 Pro Max 256GB",           "iPhone",        "phone", null, null, 1199, 750, 570, 2023),
  g("iphone-15-pro",     "iPhone 15 Pro 128GB",               "iPhone",        "phone", null, null, 999,  600, 450, 2023),
  g("iphone-15-128",     "iPhone 15 128GB",                   "iPhone",        "phone", null, null, 799,  490, 370, 2023),
  g("iphone-14-pro-max", "iPhone 14 Pro Max 256GB",           "iPhone",        "phone", null, null, 1099, 580, 440, 2022),
  g("iphone-14-pro",     "iPhone 14 Pro 128GB",               "iPhone",        "phone", null, null, 899,  460, 350, 2022),
  g("iphone-14-128",     "iPhone 14 128GB",                   "iPhone",        "phone", null, null, 699,  350, 265, 2022),
  g("iphone-13-pro-max", "iPhone 13 Pro Max 256GB",           "iPhone",        "phone", null, null, 999,  390, 295, 2021),
  g("iphone-13-128",     "iPhone 13 128GB",                   "iPhone",        "phone", null, null, 599,  260, 196, 2021),
  g("iphone-12-128",     "iPhone 12 128GB",                   "iPhone",        "phone", null, null, 599,  180, 136, 2020),
  g("iphone-se3",        "iPhone SE (3rd Gen) 64GB",          "iPhone",        "phone", null, null, 429,  130, 98,  2022),
  g("iphone-11-64",      "iPhone 11 64GB",                    "iPhone",        "phone", null, null, 499,  130, 98,  2019),
  g("iphone-xr-64",      "iPhone XR 64GB",                    "iPhone",        "phone", null, null, 449,  80,  60,  2018),
  g("iphone-x-64",       "iPhone X 64GB",                     "iPhone",        "phone", null, null, 449,  70,  52,  2017),
  g("iphone-8-64",       "iPhone 8 64GB",                     "iPhone",        "phone", null, null, 349,  45,  34,  2017),
  g("iphone-7-32",       "iPhone 7 32GB",                     "iPhone",        "phone", null, null, 299,  30,  22,  2016),

  // ══════════════════════════════════════════════════════════
  // SAMSUNG PHONES
  // ══════════════════════════════════════════════════════════

  g("samsung-s24-ultra", "Samsung Galaxy S24 Ultra 256GB",    "Samsung Galaxy","phone", null, null, 1299, 720, 545, 2024),
  g("samsung-s24",       "Samsung Galaxy S24 128GB",          "Samsung Galaxy","phone", null, null, 799,  430, 325, 2024),
  g("samsung-s23-ultra", "Samsung Galaxy S23 Ultra 256GB",    "Samsung Galaxy","phone", null, null, 1199, 530, 400, 2023),
  g("samsung-s23",       "Samsung Galaxy S23 128GB",          "Samsung Galaxy","phone", null, null, 699,  310, 235, 2023),
  g("samsung-s22-ultra", "Samsung Galaxy S22 Ultra 128GB",    "Samsung Galaxy","phone", null, null, 1099, 350, 265, 2022),
  g("samsung-s22",       "Samsung Galaxy S22 128GB",          "Samsung Galaxy","phone", null, null, 699,  200, 150, 2022),
  g("samsung-s21",       "Samsung Galaxy S21 128GB",          "Samsung Galaxy","phone", null, null, 599,  140, 106, 2021),
  g("samsung-a55",       "Samsung Galaxy A55 128GB",          "Samsung Galaxy","phone", null, null, 449,  200, 150, 2024),
  g("samsung-a54",       "Samsung Galaxy A54 128GB",          "Samsung Galaxy","phone", null, null, 369,  145, 110, 2023),
  g("samsung-a53",       "Samsung Galaxy A53 128GB",          "Samsung Galaxy","phone", null, null, 299,  100, 75,  2022),
  g("samsung-z-fold5",   "Samsung Galaxy Z Fold5 256GB",      "Samsung Galaxy","phone", null, null, 1799, 800, 605, 2023),
  g("samsung-z-flip5",   "Samsung Galaxy Z Flip5 256GB",      "Samsung Galaxy","phone", null, null, 999,  450, 340, 2023),

  // ══════════════════════════════════════════════════════════
  // OTHER PHONES
  // ══════════════════════════════════════════════════════════

  g("pixel-8-pro",       "Google Pixel 8 Pro 128GB",          "Google Pixel",  "phone", null, null, 899,  400, 302, 2023),
  g("pixel-8",           "Google Pixel 8 128GB",              "Google Pixel",  "phone", null, null, 599,  280, 212, 2023),
  g("pixel-7-pro",       "Google Pixel 7 Pro 128GB",          "Google Pixel",  "phone", null, null, 799,  260, 196, 2022),
  g("pixel-7",           "Google Pixel 7 128GB",              "Google Pixel",  "phone", null, null, 549,  190, 144, 2022),
  g("oneplus-12",        "OnePlus 12 256GB",                  "OnePlus",       "phone", null, null, 799,  350, 265, 2024),
  g("oneplus-11",        "OnePlus 11 256GB",                  "OnePlus",       "phone", null, null, 629,  240, 182, 2023),

  // ══════════════════════════════════════════════════════════
  // IPADS
  // ══════════════════════════════════════════════════════════

  g("ipad-pro-13-m4",    "iPad Pro 13-inch M4 256GB WiFi",    "iPad",          "tablet", null, null, 1299, 820, 620, 2024),
  g("ipad-pro-11-m4",    "iPad Pro 11-inch M4 256GB WiFi",    "iPad",          "tablet", null, null, 999,  620, 470, 2024),
  g("ipad-air-m2-11",    "iPad Air 11-inch M2 128GB WiFi",    "iPad",          "tablet", null, null, 599,  360, 272, 2024),
  g("ipad-pro-m2-12",    "iPad Pro 12.9-inch M2 256GB WiFi",  "iPad",          "tablet", null, null, 1099, 560, 424, 2022),
  g("ipad-pro-m2-11",    "iPad Pro 11-inch M2 128GB WiFi",    "iPad",          "tablet", null, null, 799,  420, 318, 2022),
  g("ipad-10th-64",      "iPad (10th Gen) 64GB WiFi",         "iPad",          "tablet", null, null, 349,  210, 159, 2022),
  g("ipad-9th-64",       "iPad (9th Gen) 64GB WiFi",          "iPad",          "tablet", null, null, 329,  155, 117, 2021),
  g("ipad-mini-6-64",    "iPad Mini (6th Gen) 64GB WiFi",     "iPad",          "tablet", null, null, 499,  290, 220, 2021),
  g("ipad-air-5-64",     "iPad Air (5th Gen) 64GB WiFi",      "iPad",          "tablet", null, null, 599,  320, 242, 2022),

  // ══════════════════════════════════════════════════════════
  // SAMSUNG TABLETS
  // ══════════════════════════════════════════════════════════

  g("tab-s9-ultra",      "Samsung Galaxy Tab S9 Ultra 256GB WiFi","Samsung Galaxy Tab","tablet",null,null,1199,580,440,2023),
  g("tab-s9-plus",       "Samsung Galaxy Tab S9+ 256GB WiFi",  "Samsung Galaxy Tab","tablet",null,null,899, 430,326,2023),
  g("tab-s9",            "Samsung Galaxy Tab S9 128GB WiFi",   "Samsung Galaxy Tab","tablet",null,null,699, 330,250,2023),
  g("tab-s8-ultra",      "Samsung Galaxy Tab S8 Ultra 128GB WiFi","Samsung Galaxy Tab","tablet",null,null,999,400,302,2022),
  g("tab-s6-lite",       "Samsung Galaxy Tab S6 Lite 64GB WiFi","Samsung Galaxy Tab","tablet",null,null,299,120,90,2020),

  // ══════════════════════════════════════════════════════════
  // MACBOOKS & LAPTOPS
  // ══════════════════════════════════════════════════════════

  g("mbp-16-m4-pro",     "MacBook Pro 16-inch M4 Pro 24GB",   "MacBook",       "laptop", null, null, 2499, 1500, 1135, 2024),
  g("mbp-14-m4",         "MacBook Pro 14-inch M4 16GB",        "MacBook",       "laptop", null, null, 1599, 1000, 756,  2024),
  g("mba-15-m3",         "MacBook Air 15-inch M3 8GB",         "MacBook",       "laptop", null, null, 1299, 800,  605,  2024),
  g("mba-13-m3",         "MacBook Air 13-inch M3 8GB",         "MacBook",       "laptop", null, null, 1099, 700,  530,  2024),
  g("mba-13-m2",         "MacBook Air 13-inch M2 8GB",         "MacBook",       "laptop", null, null, 999,  560,  424,  2022),
  g("mbp-14-m3",         "MacBook Pro 14-inch M3 8GB",         "MacBook",       "laptop", null, null, 1599, 900,  680,  2023),
  g("surface-pro-9",     "Microsoft Surface Pro 9 i5 8GB",     "Surface",       "laptop", null, null, 999,  500,  378,  2022),
  g("surface-laptop5",   "Microsoft Surface Laptop 5 i5 8GB",  "Surface",       "laptop", null, null, 999,  480,  363,  2022),
  g("dell-xps13",        "Dell XPS 13 i7 16GB",                "Laptop",        "laptop", null, null, 1299, 520,  393,  2023),
  g("hp-spectre-x360",   "HP Spectre x360 14 i7 16GB",         "Laptop",        "laptop", null, null, 1199, 480,  363,  2023),
  g("asus-zephyrus-g14", "ASUS ROG Zephyrus G14",              "Laptop",        "laptop", null, null, 1299, 550,  416,  2023),
  g("lenovo-thinkpad-x1","Lenovo ThinkPad X1 Carbon i7",       "Laptop",        "laptop", null, null, 1299, 500,  378,  2023),
  g("acer-nitro-5",      "Acer Nitro 5 RTX 3060",              "Laptop",        "laptop", null, null, 799,  350,  265,  2023),

  // ══════════════════════════════════════════════════════════
  // APPLE WATCH
  // ══════════════════════════════════════════════════════════

  g("aw-ultra2",         "Apple Watch Ultra 2",               "Apple Watch",   "wearable", null, null, 799,  500, 378, 2023),
  g("aw-series9-45",     "Apple Watch Series 9 45mm",         "Apple Watch",   "wearable", null, null, 429,  260, 197, 2023),
  g("aw-se2-44",         "Apple Watch SE (2nd gen) 44mm",     "Apple Watch",   "wearable", null, null, 249,  140, 106, 2022),
  g("aw-series8-45",     "Apple Watch Series 8 45mm",         "Apple Watch",   "wearable", null, null, 399,  180, 136, 2022),

  // ══════════════════════════════════════════════════════════
  // SAMSUNG WATCH
  // ══════════════════════════════════════════════════════════

  g("sw-galaxy-w7-pro",  "Samsung Galaxy Watch7 Pro 47mm",    "Samsung Watch", "wearable", null, null, 349, 190, 144, 2024),
  g("sw-galaxy-w6-44",   "Samsung Galaxy Watch6 44mm",        "Samsung Watch", "wearable", null, null, 299, 145, 110, 2023),
  g("sw-galaxy-w5-pro",  "Samsung Galaxy Watch5 Pro 45mm",    "Samsung Watch", "wearable", null, null, 269, 110, 83,  2022),

  // ══════════════════════════════════════════════════════════
  // CAMERAS & AUDIO
  // ══════════════════════════════════════════════════════════

  g("gopro-hero12",      "GoPro HERO12 Black",                "GoPro",         "camera", null, null, 399, 200, 151, 2023),
  g("gopro-hero11",      "GoPro HERO11 Black",                "GoPro",         "camera", null, null, 349, 150, 113, 2022),
  g("gopro-hero10",      "GoPro HERO10 Black",                "GoPro",         "camera", null, null, 299, 110, 83,  2021),
  g("sony-a7iv",         "Sony Alpha A7 IV Body",             "Sony Camera",   "camera", null, null, 2499, 1400, 1059, 2021),
  g("canon-r6",          "Canon EOS R6 Mark II Body",         "Canon Camera",  "camera", null, null, 2499, 1300, 983, 2022),
  g("nikon-zfc",         "Nikon Z fc Body",                   "Nikon Camera",  "camera", null, null, 899,  480, 363, 2021),
  g("fuji-x100vi",       "Fujifilm X100VI",                   "Fujifilm",      "camera", null, null, 1599, 1100, 832, 2024),
  g("dji-osmo-pocket3",  "DJI Osmo Pocket 3",                 "DJI",           "camera", null, null, 519,  320, 242, 2023),
  g("airpods-pro2",      "AirPods Pro (2nd gen)",             "Apple",         "accessory", null, null, 249, 110, 83,  2022),
  g("airpods-4-anc",     "AirPods 4 (ANC)",                   "Apple",         "accessory", null, null, 179, 85,  64,  2024),
  g("airpods-3",         "AirPods (3rd gen)",                 "Apple",         "accessory", null, null, 169, 70,  53,  2021),
  g("sony-wh1000xm5",    "Sony WH-1000XM5",                   "Sony",          "accessory", null, null, 349, 160, 121, 2022),
  g("bose-qc45",         "Bose QuietComfort 45",              "Bose",          "accessory", null, null, 279, 120, 91,  2021),
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) {
    log("ERROR: DATABASE_URL not set.");
    process.exit(1);
  }

  log(`Seeding ${RECORDS.length} static items...`);

  const CHUNK = 100;
  let done = 0;
  for (let i = 0; i < RECORDS.length; i += CHUNK) {
    await upsertGamesTech(RECORDS.slice(i, i + CHUNK));
    done += Math.min(CHUNK, RECORDS.length - i);
    log(`  ${done}/${RECORDS.length}`);
  }

  log(`✓ Done. Seeded ${RECORDS.length} items.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
