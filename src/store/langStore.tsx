"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Lang } from "@/lib/i18n";

interface LangStore {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LangContext = createContext<LangStore | null>(null);

function readCookieLang(): Lang {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|;\s*)vaulty_lang=([^;]+)/);
  const v = m?.[1];
  if (v === "ru" || v === "es" || v === "en") return v;
  return "en";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Hydrate from cookie on mount
  useEffect(() => {
    setLangState(readCookieLang());
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.cookie = `vaulty_lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }, []);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangStore {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
