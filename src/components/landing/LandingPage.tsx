"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Lang, Variant } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { HeroA } from "./HeroA";

const HeroB           = dynamic(() => import("./HeroB").then(m => m.HeroB));
const HeroC           = dynamic(() => import("./HeroC").then(m => m.HeroC));
const LandingFeatures = dynamic(() => import("./LandingFeatures").then(m => m.LandingFeatures));
const LandingPricing  = dynamic(() => import("./LandingPricing").then(m => m.LandingPricing));

interface Props {
  lang:    Lang;
  variant: Variant;
  utmSrc:  string;
}

// ─── Analytics tracker ────────────────────────────────────────────────────────

function useTrack(lang: Lang, variant: Variant, utmSrc: string) {
  const tracked = useRef(false);

  function track(eventType: "pageview" | "conversion" | "paid", plan?: "free" | "premium") {
    void fetch("/api/analytics/track", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ t: eventType, v: variant, lang, src: utmSrc, plan }),
    }).catch(() => {});
  }

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    track("pageview");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (plan: "free" | "premium") => track("conversion", plan);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LandingPage({ lang, variant, utmSrc }: Props) {
  const trackConversion = useTrack(lang, variant, utmSrc);

  return (
    <div className="min-h-screen bg-[#0B1120] text-[#E8F0FF]">

      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-[#1C2640]/50 bg-[#0C1222]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Vaulty" className="h-7 w-7 rounded-lg object-cover" />
            <span className="text-sm font-black tracking-tight text-[#E8F0FF]">Vaulty</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg border border-[#1C2640] px-3 py-1.5 text-xs text-[#4E6080] hover:text-[#E8F0FF] transition-colors"
            >
              {t(lang, "nav_signin")}
            </Link>
            <Link
              href="/"
              className="rounded-lg bg-[#F59E0B] px-3 py-1.5 text-xs font-bold text-[#0B1120] hover:bg-[#FCD34D] transition-colors"
            >
              {t(lang, "nav_try")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — rendered by variant */}
      {variant === "a" && <HeroA lang={lang} variant="a" onTrack={trackConversion} />}
      {variant === "b" && <HeroB lang={lang} variant="b" onTrack={trackConversion} />}
      {variant === "c" && <HeroC lang={lang} variant="c" onTrack={trackConversion} />}

      {/* Features */}
      <LandingFeatures lang={lang} />

      {/* Pricing */}
      <LandingPricing lang={lang} variant={variant} onTrack={trackConversion} />

      {/* Footer */}
      <footer className="border-t border-[#1C2640] px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Vaulty" className="h-5 w-5 rounded object-cover" />
            <p className="text-xs text-[#2A3A50]">{t(lang, "footer_copy")}</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#2A3A50]">
            <Link href="/login"    className="hover:text-[#4E6080] transition-colors">{t(lang, "footer_signin")}</Link>
            <Link href="/register" className="hover:text-[#4E6080] transition-colors">{t(lang, "footer_register")}</Link>
            <Link href="/terminal" className="hover:text-[#4E6080] transition-colors">{t(lang, "footer_terminal")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
