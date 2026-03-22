"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { z } from "zod";
import { AssetSchema } from "@/types/asset";
import type { Asset, Transaction } from "@/types/asset";
import { generateSeedAssets, portfolioNeedsSeed } from "@/data/seedPortfolio";

const DEFAULT_KEY = "vaulty_portfolio_v1";
const SYNC_DEBOUNCE_MS = 1500; // wait 1.5s after last change before syncing

interface PortfolioStore {
  assets: Asset[];
  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  removeAsset: (id: string) => void;
  updatePrice: (id: string, priceCents: number) => void;
  addTransaction: (assetId: string, tx: Transaction) => void;
  resetToDemo: () => void;
  isLoaded: boolean;
}

const PortfolioContext = createContext<PortfolioStore | null>(null);

function loadFromStorage(key: string): Asset[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    const result = z.array(AssetSchema).safeParse(parsed);
    if (result.success) return result.data;
    console.warn("Portfolio data invalid, resetting:", result.error);
    return [];
  } catch {
    return [];
  }
}

function saveToStorage(key: string, assets: Asset[]) {
  try {
    localStorage.setItem(key, JSON.stringify(assets));
  } catch {
    console.error("Failed to save portfolio to localStorage");
  }
}

/** Fetch portfolio from server. Returns null if unauthenticated or error. */
async function loadFromServer(): Promise<Asset[] | null> {
  try {
    const res = await fetch("/api/portfolio", { credentials: "include" });
    if (res.status === 401) return null; // not logged in
    if (!res.ok) return null;
    const body = await res.json() as { assets: unknown[] };
    const result = z.array(AssetSchema).safeParse(body.assets);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** Save portfolio to server. No-op if unauthenticated. */
async function saveToServer(assets: Asset[]): Promise<boolean> {
  try {
    const res = await fetch("/api/portfolio", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assets }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

interface PortfolioProviderProps {
  children: ReactNode;
  /** localStorage key — change this to isolate portfolios per user */
  storageKey?: string;
  /** if true, seed with demo data when storage is empty */
  seedIfEmpty?: boolean;
}

export function PortfolioProvider({
  children,
  storageKey = DEFAULT_KEY,
  seedIfEmpty = false,
}: PortfolioProviderProps) {
  const [assets, setAssets]     = useState<Asset[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  // Whether we're logged in (server sync enabled)
  const [isAuthed, setIsAuthed] = useState(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load on mount: try server first, fall back to localStorage
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // 1. Try server
      const serverAssets = await loadFromServer();
      if (cancelled) return;

      if (serverAssets !== null) {
        // Authenticated — use server data as source of truth
        setIsAuthed(true);
        if (serverAssets.length === 0) {
          // First login: migrate localStorage to server if it has data
          const local = loadFromStorage(storageKey);
          if (local.length > 0 && !portfolioNeedsSeed(local)) {
            setAssets(local);
            // Push local data up to server
            saveToServer(local).catch(() => {});
          } else if (seedIfEmpty) {
            const seed = generateSeedAssets();
            setAssets(seed);
            saveToStorage(storageKey, seed);
            saveToServer(seed).catch(() => {});
          } else {
            setAssets([]);
          }
        } else {
          setAssets(serverAssets);
          // Keep localStorage in sync for offline use
          saveToStorage(storageKey, serverAssets);
        }
      } else {
        // Unauthenticated — use localStorage only
        const stored = loadFromStorage(storageKey);
        if (seedIfEmpty && portfolioNeedsSeed(stored)) {
          const seed = generateSeedAssets();
          setAssets(seed);
          saveToStorage(storageKey, seed);
        } else {
          setAssets(stored);
        }
      }

      if (!cancelled) setIsLoaded(true);
    }

    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist on every change
  useEffect(() => {
    if (!isLoaded) return;
    saveToStorage(storageKey, assets);

    // Debounced server sync for authenticated users
    if (isAuthed) {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        saveToServer(assets).catch(() => {});
      }, SYNC_DEBOUNCE_MS);
    }
  }, [assets, isLoaded, isAuthed, storageKey]);

  const addAsset = useCallback((asset: Asset) => {
    setAssets((prev) => [...prev, asset]);
    // Pre-warm market price cache so first asset page load shows data immediately
    if (asset.name) {
      const params = new URLSearchParams({
        assetClass: asset.assetClass,
        name: asset.name,
        ...(asset.externalId ? { externalId: asset.externalId } : {}),
      });
      fetch(`/api/prices/sources?${params}`).catch(() => {/* fire and forget */});
    }
  }, []);

  const updateAsset = useCallback((id: string, patch: Partial<Asset>) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date() } : a)),
    );
  }, []);

  const removeAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addTransaction = useCallback((assetId: string, tx: Transaction) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === assetId
          ? { ...a, transactions: [...a.transactions, tx], updatedAt: new Date() }
          : a,
      ),
    );
  }, []);

  const resetToDemo = useCallback(() => {
    const seed = generateSeedAssets();
    setAssets(seed);
    saveToStorage(storageKey, seed);
    if (isAuthed) saveToServer(seed).catch(() => {});
  }, [storageKey, isAuthed]);

  const updatePrice = useCallback((id: string, priceCents: number) => {
    const today = new Date().toISOString().slice(0, 10);
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const snapshots = (a.priceSnapshots ?? []).filter((s) => s.date !== today);
        snapshots.push({ date: today, priceCents });
        return { ...a, currentPriceCents: priceCents, priceSnapshots: snapshots, updatedAt: new Date() };
      }),
    );
  }, []);

  return (
    <PortfolioContext.Provider
      value={{ assets, addAsset, updateAsset, removeAsset, updatePrice, addTransaction, resetToDemo, isLoaded }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used within PortfolioProvider");
  return ctx;
}
