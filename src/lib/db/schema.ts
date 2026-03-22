import {
  pgTable, text, integer, boolean, real, timestamp, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── LEGO Sets ─────────────────────────────────────────────────────────────────

export const legoSets = pgTable("lego_sets", {
  setNumber:             text("set_number").primaryKey(),
  name:                  text("name").notNull(),
  theme:                 text("theme").notNull().default(""),
  themeId:               integer("theme_id"),
  year:                  integer("year"),
  pieces:                integer("pieces"),
  imageUrl:              text("image_url"),
  brickowlId:            text("brickowl_id"),
  brickowlUrl:           text("brickowl_url"),
  marketPriceGbp:        real("market_price_gbp"),
  marketPriceUpdatedAt:  timestamp("market_price_updated_at", { mode: "string" }),
  launchDate:            text("launch_date"),
  exitDate:              text("exit_date"),
  msrpUsd:               real("msrp_usd"),
  msrpGbp:               real("msrp_gbp"),
  msrpEur:               real("msrp_eur"),
  rebrickableUrl:        text("rebrickable_url"),
  bricksetUrl:           text("brickset_url").notNull().default(""),
  sources:               jsonb("sources").$type<string[]>().default([]),
  lastSyncedAt:          timestamp("last_synced_at", { mode: "string" }).defaultNow(),
}, (t) => ({
  themeIdx:  index("lego_sets_theme_idx").on(t.theme),
  yearIdx:   index("lego_sets_year_idx").on(t.year),
  exitIdx:   index("lego_sets_exit_idx").on(t.exitDate),
}));

// ─── Users ─────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id:            text("id").primaryKey(),
  email:         text("email").notNull(),
  name:          text("name").notNull().default(""),
  passwordHash:  text("password_hash").notNull(),
  createdAt:     timestamp("created_at", { mode: "string" }).defaultNow(),
  emailVerified: boolean("email_verified").default(false),
  verifyToken:   text("verify_token"),
  plan:               text("plan").default("free"),  // "free" | "premium"
  stripeCustomerId:   text("stripe_customer_id"),
  resetToken:         text("reset_token"),
  resetTokenExpiry:   timestamp("reset_token_expiry", { mode: "string" }),
  googleId:           text("google_id"),
}, (t) => ({
  emailIdx:    uniqueIndex("users_email_idx").on(t.email),
  googleIdIdx: index("users_google_id_idx").on(t.googleId),
}));

// ─── Pre-registrations ─────────────────────────────────────────────────────────

export const preregistrations = pgTable("preregistrations", {
  id:              text("id").primaryKey(),
  email:           text("email").notNull(),
  plan:            text("plan").notNull().default("free"),
  paid:            boolean("paid").default(false),
  stripeSessionId: text("stripe_session_id"),
  registeredAt:    timestamp("registered_at", { mode: "string" }).defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex("preregs_email_idx").on(t.email),
}));

// ─── A/B Analytics events ──────────────────────────────────────────────────────

export const abEvents = pgTable("ab_events", {
  id:        integer("id").generatedByDefaultAsIdentity().primaryKey(),
  eventType: text("event_type").notNull(),  // "pageview" | "conversion" | "paid"
  variant:   text("variant").notNull(),     // "a" | "b" | "c"
  lang:      text("lang").notNull(),        // "en" | "ru" | "es"
  src:       text("src").default("direct"),
  plan:      text("plan"),                  // "free" | "premium"
  sessionId: text("session_id"),
  ip:        text("ip"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
}, (t) => ({
  variantIdx: index("ab_events_variant_idx").on(t.variant),
  typeIdx:    index("ab_events_type_idx").on(t.eventType),
}));

// ─── Games & Tech ──────────────────────────────────────────────────────────────

export const gamesTech = pgTable("games_tech", {
  id:                text("id").primaryKey(),          // PriceCharting product ID or "static-xxx"
  name:              text("name").notNull(),
  platform:          text("platform").notNull(),       // "PlayStation 2", "Nintendo 64", etc.
  category:          text("category").notNull().default("game"), // "game" | "console" | "handheld" | "accessory"
  loosePriceCents:   integer("loose_price_cents"),
  cibPriceCents:     integer("cib_price_cents"),
  newPriceCents:     integer("new_price_cents"),
  priceUpdatedAt:    text("price_updated_at"),
  releaseYear:       integer("release_year"),
  imageUrl:          text("image_url"),
  priceChartingUrl:  text("pricecharting_url"),
  cexBoxId:          text("cex_box_id"),
  cexSellPriceCents: integer("cex_sell_price_cents"),
  cexCashPriceCents: integer("cex_cash_price_cents"),
  igdbId:            integer("igdb_id"),
  description:       text("description"),
  genres:            jsonb("genres").$type<string[]>().default([]),
  coverUrl:          text("cover_url"),
  sources:           jsonb("sources").$type<string[]>().default([]),
  lastSyncedAt:      timestamp("last_synced_at", { mode: "string" }).defaultNow(),
}, (t) => ({
  platformIdx: index("games_tech_platform_idx").on(t.platform),
  categoryIdx: index("games_tech_category_idx").on(t.category),
  nameIdx:     index("games_tech_name_idx").on(t.name),
}));

// ─── eBay cache ────────────────────────────────────────────────────────────────

export const ebayCache = pgTable("ebay_cache", {
  query:     text("query").primaryKey(),
  data:      jsonb("data").$type<Record<string, unknown>>().notNull(),
  expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
});

// ─── Skinport cache ────────────────────────────────────────────────────────────

export const skinportCache = pgTable("skinport_cache", {
  marketHashName:      text("market_hash_name").primaryKey(),
  suggestedPriceCents: integer("suggested_price_cents"),
  minPriceCents:       integer("min_price_cents"),
  recentSales:         jsonb("recent_sales").$type<Array<{ date: string; price: number; currency: string; title: string }>>(),
  expiresAt:           timestamp("expires_at", { mode: "string" }).notNull(),
  updatedAt:           timestamp("updated_at", { mode: "string" }).defaultNow(),
});

// ─── Pokémon Cards ─────────────────────────────────────────────────────────────

export const pokemonCards = pgTable("pokemon_cards", {
  id:             text("id").primaryKey(),          // TCGdex card ID (e.g. "swsh1-1")
  name:           text("name").notNull(),
  localId:        text("local_id").notNull(),       // card number within set
  setId:          text("set_id"),
  setName:        text("set_name"),
  serieName:      text("serie_name"),
  releaseDate:    text("release_date"),             // "YYYY/MM/DD"
  rarity:         text("rarity"),
  hp:             integer("hp"),
  types:          jsonb("types").$type<string[]>().default([]),
  imageSmallUrl:  text("image_small_url"),
  imageLargeUrl:  text("image_large_url"),
  priceEurCents:  integer("price_eur_cents"),       // cardmarket
  priceUsdCents:  integer("price_usd_cents"),       // tcgplayer
  priceUpdatedAt: timestamp("price_updated_at", { mode: "string" }),
  lang:           text("lang").notNull().default("en"), // "en" | "ja"
  lastSyncedAt:   timestamp("last_synced_at", { mode: "string" }).defaultNow(),
}, (t) => ({
  nameIdx:   index("pokemon_cards_name_idx").on(t.name),
  setIdx:    index("pokemon_cards_set_idx").on(t.setId),
  rarityIdx: index("pokemon_cards_rarity_idx").on(t.rarity),
}));

// ─── MTG Cards ─────────────────────────────────────────────────────────────────

export const mtgCards = pgTable("mtg_cards", {
  id:                text("id").primaryKey(),       // Scryfall UUID
  oracleId:          text("oracle_id"),
  name:              text("name").notNull(),
  setCode:           text("set_code").notNull(),    // e.g. "lea"
  setName:           text("set_name"),
  collectorNumber:   text("collector_number"),
  rarity:            text("rarity"),                // "common"|"uncommon"|"rare"|"mythic"
  releasedAt:        text("released_at"),           // "YYYY-MM-DD"
  manaCost:          text("mana_cost"),
  typeLine:          text("type_line"),
  oracleText:        text("oracle_text"),
  edhrecRank:        integer("edhrec_rank"),
  imageSmallUrl:     text("image_small_url"),
  imageLargeUrl:     text("image_large_url"),
  imagePngUrl:       text("image_png_url"),
  priceEurCents:     integer("price_eur_cents"),
  priceEurFoilCents: integer("price_eur_foil_cents"),
  priceUsdCents:     integer("price_usd_cents"),
  priceUsdFoilCents: integer("price_usd_foil_cents"),
  priceUpdatedAt:    timestamp("price_updated_at", { mode: "string" }),
  tcgplayerUrl:      text("tcgplayer_url"),
  cardmarketUrl:     text("cardmarket_url"),
  lastSyncedAt:      timestamp("last_synced_at", { mode: "string" }).defaultNow(),
}, (t) => ({
  nameIdx:   index("mtg_cards_name_idx").on(t.name),
  oracleIdx: index("mtg_cards_oracle_id_idx").on(t.oracleId),
  setIdx:    index("mtg_cards_set_idx").on(t.setCode),
  rarityIdx: index("mtg_cards_rarity_idx").on(t.rarity),
}));

// ─── Sports Cards ──────────────────────────────────────────────────────────────

export const sportsCards = pgTable("sports_cards", {
  id:               text("id").primaryKey(),        // PriceCharting product ID
  sport:            text("sport").notNull(),         // "basketball"|"football"|"hockey"|"american_football"
  name:             text("name").notNull(),
  fullName:         text("full_name"),              // e.g. "LeBron James RC — 2003-04 Topps #111"
  setName:          text("set_name"),
  year:             integer("year"),
  playerName:       text("player_name"),
  cardNumber:       text("card_number"),
  loosePriceCents:  integer("loose_price_cents"),   // ungraded (USD cents)
  gradedPriceCents: integer("graded_price_cents"),  // PSA 10 (USD cents)
  imageUrl:         text("image_url"),
  priceChartingUrl: text("pricecharting_url"),
  priceUpdatedAt:   timestamp("price_updated_at", { mode: "string" }),
  lastSyncedAt:     timestamp("last_synced_at", { mode: "string" }).defaultNow(),
}, (t) => ({
  sportIdx:     index("sports_cards_sport_idx").on(t.sport),
  nameIdx:      index("sports_cards_name_idx").on(t.name),
  playerIdx:    index("sports_cards_player_idx").on(t.playerName),
  sportNameIdx: index("sports_cards_sport_name_idx").on(t.sport, t.name),
}));

// ─── Comics ────────────────────────────────────────────────────────────────────

export const comics = pgTable("comics", {
  cvId:           text("cv_id").primaryKey(),        // ComicVine issue ID
  volumeName:     text("volume_name").notNull(),     // e.g. "Amazing Fantasy"
  volumeCvId:     text("volume_cv_id"),
  issueNumber:    text("issue_number").notNull(),    // text: can be "½", "Annual 1"
  name:           text("name"),                     // story title
  publisher:      text("publisher"),
  coverDate:      text("cover_date"),               // "YYYY-MM-DD"
  coverImageUrl:  text("cover_image_url"),
  description:    text("description"),
  isKeyIssue:     boolean("is_key_issue").notNull().default(false),
  keyIssueReason: text("key_issue_reason"),
  characters:     jsonb("characters").$type<string[]>().default([]),
  storyArcs:      jsonb("story_arcs").$type<string[]>().default([]),
  cvUrl:          text("cv_url"),
  sources:        jsonb("sources").$type<string[]>().default([]),
  lastSyncedAt:   timestamp("last_synced_at", { mode: "string" }).defaultNow(),
}, (t) => ({
  volumeIdx:    index("comics_volume_name_idx").on(t.volumeName),
  publisherIdx: index("comics_publisher_idx").on(t.publisher),
  keyIdx:       index("comics_key_issue_idx").on(t.isKeyIssue),
  coverDateIdx: index("comics_cover_date_idx").on(t.coverDate),
}));

// ─── CS2 Items ─────────────────────────────────────────────────────────────────

export const cs2Items = pgTable("cs2_items", {
  marketHashName:      text("market_hash_name").primaryKey(), // Steam canonical ID
  weaponType:          text("weapon_type"),
  skinName:            text("skin_name"),
  exterior:            text("exterior"),            // "Factory New"|"Minimal Wear"|etc.
  rarity:              text("rarity"),              // "Covert"|"Classified"|etc.
  isStatTrak:          boolean("is_stat_trak").notNull().default(false),
  isSouvenir:          boolean("is_souvenir").notNull().default(false),
  iconUrl:             text("icon_url"),
  suggestedPriceCents: integer("suggested_price_cents"), // Skinport EUR cents
  minPriceCents:       integer("min_price_cents"),       // cheapest listing EUR cents
  priceUpdatedAt:      timestamp("price_updated_at", { mode: "string" }),
  lastSyncedAt:        timestamp("last_synced_at", { mode: "string" }).defaultNow(),
}, (t) => ({
  weaponIdx:   index("cs2_items_weapon_idx").on(t.weaponType),
  rarityIdx:   index("cs2_items_rarity_idx").on(t.rarity),
  exteriorIdx: index("cs2_items_exterior_idx").on(t.exterior),
  nameIdx:     index("cs2_items_name_idx").on(t.skinName),
}));

// ─── Commodities ───────────────────────────────────────────────────────────────

export const commodities = pgTable("commodities", {
  symbol:             text("symbol").primaryKey(),  // XAU|XAG|XPT|XPD|XRH
  name:               text("name").notNull(),       // "Gold"|"Silver"|etc.
  pricePerOzEurCents: integer("price_per_oz_eur_cents"),
  pricePerOzUsdCents: integer("price_per_oz_usd_cents"),
  priceUpdatedAt:     timestamp("price_updated_at", { mode: "string" }),
  yahooTicker:        text("yahoo_ticker"),         // "GC=F", null for XRH
  unit:               text("unit").notNull().default("troy_oz"),
  lastSyncedAt:       timestamp("last_synced_at", { mode: "string" }).defaultNow(),
});

// ─── Portfolio assets (server-side storage) ────────────────────────────────────

export const portfolioAssets = pgTable("portfolio_assets", {
  id:         text("id").primaryKey(),                                              // asset UUID
  userId:     text("user_id").notNull(),
  data:       jsonb("data").$type<Record<string, unknown>>().notNull(),             // full Asset object
  createdAt:  timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt:  timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (t) => ({
  userIdx: index("portfolio_assets_user_idx").on(t.userId),
}));

// ─── Portfolio snapshots ───────────────────────────────────────────────────────

export const portfolioSnapshots = pgTable("portfolio_snapshots", {
  id:        integer("id").generatedByDefaultAsIdentity().primaryKey(),
  userId:    text("user_id").notNull(),
  date:      text("date").notNull(),        // "YYYY-MM-DD"
  valueCents: integer("value_cents").notNull(),
  costCents:  integer("cost_cents").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
}, (t) => ({
  userDateIdx: uniqueIndex("snapshots_user_date_idx").on(t.userId, t.date),
}));
