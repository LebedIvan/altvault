/**
 * Server-only auth helpers. Uses Neon DB + bcryptjs + jsonwebtoken.
 * Import only inside API route handlers (not client components).
 */
import bcrypt from "bcryptjs";
import jwt    from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { db, users } from "./db";
import { eq } from "drizzle-orm";

// ─── Config ───────────────────────────────────────────────────────────────────

const JWT_SECRET  = process.env.JWT_SECRET ?? "vaulty-dev-secret";
const COOKIE_NAME = "vaulty_token";
const DEMO_COOKIE = "vaulty_demo";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StoredUser = typeof users.$inferSelect;

export interface AuthUser {
  id:    string;
  email: string;
  name:  string;
}

// ─── User DB (Neon) ───────────────────────────────────────────────────────────

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createUser(email: string, name: string, password: string): Promise<StoredUser> {
  const norm = email.toLowerCase().trim();
  const existing = await findUserByEmail(norm);
  if (existing) throw new Error("EMAIL_TAKEN");

  const [user] = await db.insert(users).values({
    id:            crypto.randomUUID(),
    email:         norm,
    name:          name.trim(),
    passwordHash:  bcrypt.hashSync(password, 10),
    emailVerified: false,
    verifyToken:   crypto.randomUUID(),
  }).returning();
  return user!;
}

export async function verifyUserEmail(token: string): Promise<StoredUser | null> {
  const rows = await db.select().from(users).where(eq(users.verifyToken, token)).limit(1);
  const user = rows[0];
  if (!user || user.emailVerified) return null;
  const [updated] = await db.update(users)
    .set({ emailVerified: true, verifyToken: null })
    .where(eq(users.id, user.id))
    .returning();
  return updated ?? null;
}

export async function createPasswordResetToken(email: string): Promise<{ user: StoredUser; token: string } | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const token = crypto.randomUUID();
  const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  await db.update(users)
    .set({ resetToken: token, resetTokenExpiry: expiry })
    .where(eq(users.id, user.id));

  return { user, token };
}

export async function findOrCreateGoogleUser(googleId: string, email: string, name: string): Promise<StoredUser> {
  // 1. Look up by googleId
  const byGoogle = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
  if (byGoogle[0]) return byGoogle[0];

  // 2. Email already exists → link Google to that account
  const byEmail = await findUserByEmail(email);
  if (byEmail) {
    const [updated] = await db.update(users)
      .set({ googleId, emailVerified: true })
      .where(eq(users.id, byEmail.id))
      .returning();
    return updated!;
  }

  // 3. Create new Google user (no password)
  const [user] = await db.insert(users).values({
    id:            crypto.randomUUID(),
    email:         email.toLowerCase().trim(),
    name:          name.trim(),
    passwordHash:  "",          // Google users have no password
    emailVerified: true,
    googleId,
  }).returning();
  return user!;
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const rows = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
  const user = rows[0];
  if (!user || !user.resetTokenExpiry) return false;

  const expired = new Date(user.resetTokenExpiry) < new Date();
  if (expired) return false;

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  await db.update(users)
    .set({ passwordHash, resetToken: null, resetTokenExpiry: null })
    .where(eq(users.id, user.id));

  return true;
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// ─── JWT ──────────────────────────────────────────────────────────────────────

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "30d" },
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const p = jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string };
    return { id: p.id, email: p.email, name: p.name };
  } catch {
    return null;
  }
}

// ─── Request helpers ──────────────────────────────────────────────────────────

export function getUserFromRequest(req: NextRequest): AuthUser | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function isDemoRequest(req: NextRequest): boolean {
  return req.cookies.get(DEMO_COOKIE)?.value === "1";
}

export { COOKIE_NAME, DEMO_COOKIE };
