"use client";

import { useState, useEffect } from "react";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

interface Props {
  lang:    Lang;
  variant: "b";
  onTrack: (plan: "free" | "premium") => void;
}

const TICKER_ITEMS = [
  { label: "LEGO 10307 Eiffel Tower", change: "+340%", up: true },
  { label: "Charizard Base Set PSA 10", change: "+2,800%", up: true },
  { label: "Pokémon Booster Box 1st Ed.", change: "+1,200%", up: true },
  { label: "LEGO 75313 AT-AT (Retired)", change: "+82%", up: true },
  { label: "AK-47 Fire Serpent FN", change: "+280%", up: true },
  { label: "Mahomes RC Topps Chrome", change: "+420%", up: true },
  { label: "LEGO 10294 Titanic (Retired)", change: "+65%", up: true },
  { label: "Gold 5Y Performance", change: "+54%", up: true },
  { label: "Silver 5Y Performance", change: "+31%", up: true },
  { label: "MTG Black Lotus LP", change: "+1,900%", up: true },
];

const BIG_STATS = [
  { asset: "LEGO", pct: "+340%", period: "5Y avg", color: "#F59E0B" },
  { asset: "Pokémon", pct: "+280%", period: "5Y avg", color: "#EF4444" },
  { asset: "CS2 Skins", pct: "+180%", period: "3Y avg", color: "#3B82F6" },
  { asset: "Gold", pct: "+54%", period: "5Y avg", color: "#D97706" },
];

export function HeroB({ lang, onTrack }: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [plan, setPlan] = useState<"free" | "premium">("free");
  const [msg, setMsg] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 40);
    return () => clearInterval(iv);
  }, []);

  async function submit(selectedPlan: "free" | "premium") {
    if (!email.includes("@")) { setMsg("Enter a valid email"); setState("error"); return; }
    setPlan(selectedPlan);
    setState("loading");
    try {
      if (selectedPlan === "premium") {
        const r = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        onTrack("premium");
        window.location.href = d.url;
        return;
      }
      const r = await fetch("/api/preregister", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, plan: "free" }) });
      if (!r.ok) throw new Error((await r.json()).error);
      onTrack("free");
      setState("success");
    } catch (e: unknown) {
      setState("error");
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  // Scrolling ticker offset
  const totalWidth = TICKER_ITEMS.length * 240;
  const offset = (tick * 0.4) % totalWidth;

  return (
    <section className="relative overflow-hidden px-6 py-16 md:py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0B1120] via-[#080F1C] to-[#0B1120]" />

      <div className="relative mx-auto max-w-5xl space-y-12">

        {/* Headline */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400">{t(lang, "hero_b_social")}</span>
          </div>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-[#E8F0FF] md:text-5xl lg:text-[56px]">
            {t(lang, "hero_b_headline")}
          </h1>
          <p className="text-base text-[#4E6080] leading-relaxed md:text-lg">
            {t(lang, "hero_b_sub")}
          </p>
        </div>

        {/* Big stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {BIG_STATS.map((s) => (
            <div key={s.asset} className="rounded-2xl border border-[#1C2640] bg-[#0E1830] p-4 text-center">
              <p className="text-[10px] uppercase tracking-widest text-[#4E6080] mb-1">{s.asset}</p>
              <p className="text-3xl font-black" style={{ color: s.color }}>{s.pct}</p>
              <p className="text-[9px] text-[#2A3A50] mt-1">{s.period}</p>
            </div>
          ))}
        </div>

        {/* Scrolling ticker */}
        <div className="rounded-xl border border-[#1C2640] bg-[#080F1C] py-2.5 overflow-hidden">
          <div className="flex gap-0" style={{ transform: `translateX(-${offset}px)`, width: totalWidth * 2 }}>
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0 px-5 border-r border-[#1C2640]" style={{ width: 240 }}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-[10px] text-[#4E6080] truncate font-mono">{item.label}</span>
                <span className="ml-auto text-[10px] font-bold text-emerald-400 shrink-0">{item.change}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-lg mx-auto space-y-3">
          {state === "success" ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <span className="text-emerald-400">✓</span>
              <p className="text-sm text-emerald-400 font-semibold">You're on the list! Check your inbox.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && void submit("free")}
                  placeholder={t(lang, "email_placeholder")}
                  className="flex-1 rounded-xl border border-[#1C2640] bg-[#0E1830] px-4 py-3 text-sm text-[#E8F0FF] placeholder-[#2A3A50] focus:border-[#F59E0B]/50 focus:outline-none"
                />
                <button
                  onClick={() => void submit("free")}
                  disabled={state === "loading"}
                  className="whitespace-nowrap rounded-xl bg-[#F59E0B] px-5 py-3 text-sm font-bold text-[#0B1120] hover:bg-[#FCD34D] transition-colors disabled:opacity-40"
                >
                  {state === "loading" && plan === "free" ? "…" : t(lang, "cta_returns")}
                </button>
              </div>
              <div className="text-center">
                <button
                  onClick={() => void submit("premium")}
                  disabled={state === "loading"}
                  className="text-sm text-[#F59E0B] hover:text-[#FCD34D] transition-colors"
                >
                  {state === "loading" && plan === "premium" ? "…" : t(lang, "hero_b_hook")}
                </button>
              </div>
              {state === "error" && <p className="text-xs text-red-400 text-center">{msg}</p>}
              <p className="text-xs text-[#2A3A50] text-center">{t(lang, "no_spam")}</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
