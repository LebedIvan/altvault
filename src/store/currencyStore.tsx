"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export type DisplayCurrency = "EUR" | "USD" | "RUB";

/** Fallback static rates (EUR-based): how many display units = 1 EUR */
const FALLBACK_FROM_EUR: Record<DisplayCurrency, number> = {
  EUR: 1,
  USD: 1.09,
  RUB: 96,
};

/** Fallback static rates: how many EUR = 1 asset-native currency unit */
const FALLBACK_TO_EUR: Record<string, number> = {
  EUR: 1,
  USD: 1 / 1.09,
  GBP: 1 / 0.85,
};

export const CURRENCY_SYMBOLS: Record<DisplayCurrency, string> = {
  EUR: "€",
  USD: "$",
  RUB: "₽",
};

export const CURRENCY_LABELS: Record<DisplayCurrency, string> = {
  EUR: "EUR €",
  USD: "USD $",
  RUB: "RUB ₽",
};

function format(displayCents: number, display: DisplayCurrency): string {
  const abs = Math.abs(displayCents / 100);
  const sign = displayCents < 0 ? "−" : "";

  if (display === "EUR")
    return `${sign}${abs.toLocaleString("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (display === "USD")
    return `${sign}${abs.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  // RUB — no decimals
  return `${sign}${Math.round(abs).toLocaleString("ru-RU")} ₽`;
}

interface CurrencyStore {
  displayCurrency: DisplayCurrency;
  setDisplayCurrency: (c: DisplayCurrency) => void;
  /** Convert cents in assetCurrency → display currency cents */
  convertCents: (cents: number, assetCurrency?: string) => number;
  /** Convert + format in one call */
  fmtCents: (cents: number, assetCurrency?: string) => string;
  /** Live rates loaded from API (EUR-based) */
  fromEur: Record<string, number>;
  toEur: Record<string, number>;
}

const CurrencyContext = createContext<CurrencyStore | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>("EUR");
  const [fromEur, setFromEur] = useState<Record<string, number>>(FALLBACK_FROM_EUR);
  const [toEur, setToEur]     = useState<Record<string, number>>(FALLBACK_TO_EUR);

  // Persist display currency selection
  useEffect(() => {
    const saved = localStorage.getItem("vaulty_display_currency") as DisplayCurrency | null;
    if (saved && saved in FALLBACK_FROM_EUR) setDisplayCurrencyState(saved);
  }, []);

  // Fetch live exchange rates on mount
  useEffect(() => {
    fetch("/api/rates")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { rates: Record<string, number> } | null) => {
        if (!data?.rates) return;
        const { rates } = data;
        setFromEur({
          EUR: 1,
          USD: rates["USD"] ?? FALLBACK_FROM_EUR.USD,
          RUB: rates["RUB"] ?? FALLBACK_FROM_EUR.RUB,
        });
        setToEur({
          EUR: 1,
          USD: rates["USD"] ? 1 / rates["USD"] : FALLBACK_TO_EUR["USD"]!,
          GBP: rates["GBP"] ? 1 / rates["GBP"] : FALLBACK_TO_EUR["GBP"]!,
        });
      })
      .catch(() => {/* keep fallback rates */});
  }, []);

  const setDisplayCurrency = useCallback((c: DisplayCurrency) => {
    setDisplayCurrencyState(c);
    localStorage.setItem("vaulty_display_currency", c);
  }, []);

  const convertCents = useCallback(
    (cents: number, assetCurrency = "EUR"): number => {
      const toEurRate  = toEur[assetCurrency] ?? 1;
      const fromEurRate = fromEur[displayCurrency] ?? 1;
      return Math.round(cents * toEurRate * fromEurRate);
    },
    [displayCurrency, fromEur, toEur],
  );

  const fmtCents = useCallback(
    (cents: number, assetCurrency = "EUR"): string =>
      format(convertCents(cents, assetCurrency), displayCurrency),
    [convertCents, displayCurrency],
  );

  return (
    <CurrencyContext.Provider value={{ displayCurrency, setDisplayCurrency, convertCents, fmtCents, fromEur, toEur }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
