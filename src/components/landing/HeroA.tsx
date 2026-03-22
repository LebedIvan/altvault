"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

interface Props {
  lang:    Lang;
  variant: "a";
  onTrack: (plan: "free" | "premium") => void;
}

const ASSETS = [
  { label: "LEGO 10307", price: "$489", change: "+12.4%", up: true },
  { label: "Charizard VMAX PSA 10", price: "$2,840", change: "+8.1%", up: true },
  { label: "AK-47 Redline FT", price: "$68", change: "-2.3%", up: false },
  { label: "Gold 1oz", price: "$2,418", change: "+0.8%", up: true },
  { label: "LEGO 75313 AT-AT", price: "$780", change: "+31.2%", up: true },
  { label: "Topps Chrome Mahomes RC", price: "$190", change: "+5.5%", up: true },
];

export function HeroA({ lang, onTrack }: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [plan, setPlan] = useState<"free" | "premium">("free");
  const [msg, setMsg] = useState("");

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

  return (
    <section className="relative overflow-hidden px-6 py-20 md:py-28">
      {/* Background grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#1C264015_1px,transparent_1px),linear-gradient(to_bottom,#1C264015_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#F59E0B]/5 blur-[120px] rounded-full hidden md:block" />

      <div className="relative mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">

          {/* Left: text + CTA */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
              <span className="text-xs font-semibold text-[#F59E0B]">{t(lang, "hero_a_social")}</span>
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight text-[#E8F0FF] md:text-5xl lg:text-[52px]">
              {t(lang, "hero_a_headline")}
            </h1>

            <p className="text-base text-[#4E6080] leading-relaxed md:text-lg max-w-md">
              {t(lang, "hero_a_sub")}
            </p>

            {/* Email form */}
            {state === "success" ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <span className="text-emerald-400">✓</span>
                <p className="text-sm text-emerald-400 font-semibold">You're on the list! Check your inbox.</p>
              </div>
            ) : (
              <div className="space-y-2">
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
                    className="whitespace-nowrap rounded-xl border border-[#1C2640] bg-[#0E1830] px-5 py-3 text-sm font-semibold text-[#4E6080] hover:text-[#E8F0FF] transition-colors disabled:opacity-40"
                  >
                    {state === "loading" && plan === "free" ? "…" : t(lang, "cta_free")}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void submit("premium")}
                    disabled={state === "loading"}
                    className="text-sm font-semibold text-[#F59E0B] hover:text-[#FCD34D] transition-colors"
                  >
                    {state === "loading" && plan === "premium" ? "…" : t(lang, "hero_a_hook")}
                  </button>
                </div>
                {state === "error" && <p className="text-xs text-red-400">{msg}</p>}
                <p className="text-xs text-[#2A3A50]">{t(lang, "no_spam")}</p>
              </div>
            )}
          </div>

          {/* Right: dashboard mock */}
          <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] overflow-hidden shadow-2xl shadow-black/50">
            <div className="border-b border-[#1C2640] px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F87171]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FCD34D]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#4ADE80]" />
              </div>
              <span className="text-[10px] text-[#2A3A50] ml-2">vaulty.app — Portfolio</span>
            </div>

            {/* Portfolio header */}
            <div className="px-4 py-3 border-b border-[#1C2640] flex items-center justify-between">
              <div>
                <p className="text-[9px] text-[#4E6080] uppercase tracking-wider">Total Value</p>
                <p className="text-xl font-black text-[#E8F0FF]">$12,847</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-[#4E6080] uppercase tracking-wider">P&L All Time</p>
                <p className="text-base font-bold text-emerald-400">+$3,241 (+33.7%)</p>
              </div>
            </div>

            {/* Asset rows */}
            <div className="divide-y divide-[#1C2640]">
              {ASSETS.map((a, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                    <span className="text-xs text-[#B0C4DE]">{a.label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-[#E8F0FF]">{a.price}</span>
                    <span className={clsx("text-xs font-bold w-14 text-right", a.up ? "text-emerald-400" : "text-red-400")}>
                      {a.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 text-center">
              <p className="text-[9px] text-[#2A3A50]">Vaulty · 10 asset classes · Real-time prices</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
