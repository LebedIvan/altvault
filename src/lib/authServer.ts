/**
 * Server-only auth helpers. Uses Node.js fs + bcryptjs + jsonwebtoken.
 * Import only inside API route handlers (not client components).
 */
import fs   from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import jwt    from "jsonwebtoken";
import type { NextRequest } from "next/server";

// ─── Config ───────────────────────────────────────────────────────────────────

const USERS_PATH  = path.join(process.cwd(), "data", "users.json");
const JWT_SECRET  = process.env.JWT_SECRET ?? "vaulty-dev-secret";
const COOKIE_NAME = "vaulty_token";
const DEMO_COOKIE = "vaulty_demo";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredUser {
  id:            string;
  email:         string;
  name:          string;
  passwordHash:  string;
  createdAt:     string;
  emailVerified: boolean;
  verifyToken:   string | null;
}

export interface AuthUser {
  id:    string;
  email: string;
  name:  string;
}

// ─── User DB (flat JSON file) ─────────────────────────────────────────────────

function readUsers(): StoredUser[] {
  try {
    const raw = fs.readFileSync(USERS_PATH, "utf-8");
    const users = JSON.parse(raw) as StoredUser[];
    // Migrate legacy users that predate email verification
    return users.map((u) => ({
      ...u,
      // Trust existing users — they registered before this feature existed
      emailVerified: u.emailVerified ?? true,
      verifyToken:   u.verifyToken   ?? null,
    }));
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]): void {
  const dir = path.dirname(USERS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), "utf-8");
}

export function findUserByEmail(email: string): StoredUser | null {
  return readUsers().find((u) => u.email === email.toLowerCase().trim()) ?? null;
}

export function findUserById(id: string): StoredUser | null {
  return readUsers().find((u) => u.id === id) ?? null;
}

export function createUser(email: string, name: string, password: string): StoredUser {
  const users = readUsers();
  const norm  = email.toLowerCase().trim();
  if (users.find((u) => u.email === norm)) throw new Error("EMAIL_TAKEN");

  const user: StoredUser = {
    id:            crypto.randomUUID(),
    email:         norm,
    name:          name.trim(),
    passwordHash:  bcrypt.hashSync(password, 10),
    createdAt:     new Date().toISOString(),
    emailVerified: false,
    verifyToken:   crypto.randomUUID(),
  };
  users.push(user);
  writeUsers(users);
  return user;
}

export function verifyUserEmail(token: string): StoredUser | null {
  const users = readUsers();
  const user  = users.find((u) => u.verifyToken === token && !u.emailVerified);
  if (!user) return null;
  user.emailVerified = true;
  user.verifyToken   = null;
  writeUsers(users);
  return user;
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
