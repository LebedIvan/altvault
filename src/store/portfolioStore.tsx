"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { z } from "zod";
import { AssetSchema } from "@/types/asset";
import type { Asset, Transaction } from "@/types/asset";
import { generateSeedAssets, portfolioNeedsSeed } from "@/data/seedPortfolio";

const DEFAULT_KEY = "vaulty_portfolio_v1";

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
  const [assets, setAssets]   = useState<Asset[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load on mount (re-runs if storageKey changes via React key on parent)
  useEffect(() => {
    const stored = loadFromStorage(storageKey);
    if (seedIfEmpty && portfolioNeedsSeed(stored)) {
      const seed = generateSeedAssets();
      setAssets(seed);
      saveToStorage(storageKey, seed);
    } else {
      setAssets(stored);
    }
    setIsLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist on every change
  useEffect(() => {
    if (isLoaded) saveToStorage(storageKey, assets);
  }, [assets, isLoaded, storageKey]);

  const addAsset = useCallback((asset: Asset) => {
    setAssets((prev) => [...prev, asset]);
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
  }, [storageKey]);

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
