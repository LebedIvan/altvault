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
import type { Asset } from "@/types/asset";

const STORAGE_KEY = "altvault_portfolio_v1";

interface PortfolioStore {
  assets: Asset[];
  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  removeAsset: (id: string) => void;
  updatePrice: (id: string, priceCents: number) => void;
  isLoaded: boolean;
}

const PortfolioContext = createContext<PortfolioStore | null>(null);

function loadFromStorage(): Asset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

function saveToStorage(assets: Asset[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  } catch {
    console.error("Failed to save portfolio to localStorage");
  }
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage only on client
  useEffect(() => {
    setAssets(loadFromStorage());
    setIsLoaded(true);
  }, []);

  // Persist on every change (after initial load)
  useEffect(() => {
    if (isLoaded) saveToStorage(assets);
  }, [assets, isLoaded]);

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

  const updatePrice = useCallback((id: string, priceCents: number) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, currentPriceCents: priceCents, updatedAt: new Date() } : a,
      ),
    );
  }, []);

  return (
    <PortfolioContext.Provider
      value={{ assets, addAsset, updateAsset, removeAsset, updatePrice, isLoaded }}
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
