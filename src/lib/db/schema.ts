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
  sources:           jsonb("sources").$type<string[]>().default([]),
  lastSyncedAt:      timestamp("last_synced_at", { mode: "string" }).defaultNow(),
}, (t) => ({
  platformIdx: index("games_tech_platform_idx").on(t.platform),
  categoryIdx: index("games_tech_category_idx").on(t.category),
  nameIdx:     index("games_tech_name_idx").on(t.name),
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
