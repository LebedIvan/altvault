"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type AuthMode = "loading" | "user" | "demo" | "none";

export interface AuthUser {
  id:    string;
  email: string;
  name:  string;
}

interface AuthState {
  mode:   AuthMode;
  user:   AuthUser | null;
  logout: () => Promise<void>;
  /** key used for portfolioStore localStorage isolation */
  storageKey: string;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AuthMode>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json() as Promise<{ mode: AuthMode; user: AuthUser | null }>)
      .then(({ mode: m, user: u }) => {
        setMode(m === "none" ? "none" : m);
        setUser(u);
      })
      .catch(() => setMode("none"));
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setMode("none");
    setUser(null);
    router.push("/login");
  }, [router]);

  const storageKey = user
    ? `vaulty_portfolio_${user.id}`
    : "vaulty_portfolio_demo";

  return (
    <AuthContext.Provider value={{ mode, user, logout, storageKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
