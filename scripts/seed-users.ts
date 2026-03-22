/**
 * One-time seed: migrate data/users.json + data/preregistrations.json → Neon
 * Usage: npx tsx scripts/seed-users.ts
 */

import path from "path";
import fs from "fs";

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

import { db, users, preregistrations } from "../src/lib/db";

function log(msg: string) {
  process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] ${msg}\n`);
}

async function main() {
  // Migrate users
  const usersPath = path.join(process.cwd(), "data", "users.json");
  if (fs.existsSync(usersPath)) {
    const raw = JSON.parse(fs.readFileSync(usersPath, "utf8")) as Array<{
      id: string; email: string; name?: string; passwordHash: string;
      emailVerified?: boolean; verifyToken?: string | null;
      plan?: string; stripeCustomerId?: string | null;
    }>;
    if (raw.length > 0) {
      for (const u of raw) {
        await db.insert(users).values({
          id:            u.id,
          email:         u.email,
          name:          u.name ?? "",
          passwordHash:  u.passwordHash,
          emailVerified: u.emailVerified ?? false,
          verifyToken:   u.verifyToken ?? null,
          plan:          u.plan ?? "free",
          stripeCustomerId: u.stripeCustomerId ?? null,
        }).onConflictDoNothing();
      }
      log(`✓ Migrated ${raw.length} users`);
    } else {
      log("No users to migrate");
    }
  }

  // Migrate preregistrations
  const preregsPath = path.join(process.cwd(), "data", "preregistrations.json");
  if (fs.existsSync(preregsPath)) {
    const raw = JSON.parse(fs.readFileSync(preregsPath, "utf8")) as Array<{
      id: string; email: string; plan?: string; paid?: boolean;
      stripeSessionId?: string | null; registeredAt?: string;
    }>;
    if (raw.length > 0) {
      for (const r of raw) {
        await db.insert(preregistrations).values({
          id:              r.id,
          email:           r.email,
          plan:            (r.plan ?? "free") as "free" | "premium",
          paid:            r.paid ?? false,
          stripeSessionId: r.stripeSessionId ?? null,
        }).onConflictDoNothing();
      }
      log(`✓ Migrated ${raw.length} preregistrations`);
    } else {
      log("No preregistrations to migrate");
    }
  }

  log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
