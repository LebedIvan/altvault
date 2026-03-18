"use client";

import { useState } from "react";
import type { Lang, Variant } from "@/lib/i18n";
import { t } from "@/lib/i18n";

interface Props {
  lang:    Lang;
  variant: Variant; // reserved for future variant-specific pricing tweaks
  onTrack: (plan: "free" | "premium") => void;
}

const FREE_FEATS  = ["feat_free_1", "feat_free_2", "feat_free_3", "feat_free_4"] as const;
const PREM_FEATS  = ["feat_premium_1", "feat_premium_2", "feat_premium_3", "feat_premium_4", "feat_premium_5"] as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function LandingPricing({ lang, variant: _variant, onTrack }: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [plan, setPlan]   = useState<"free" | "premium">("free");
  const [msg, setMsg]     = useState("");

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
    <section id="pricing" className="px-6 py-20 border-t border-[#1C2640]">
      <div className="mx-auto max-w-4xl space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black tracking-tight text-[#E8F0FF] md:text-3xl">
            {t(lang, "pricing_title")}
          </h2>
          <p className="text-sm text-[#4E6080]">{t(lang, "pricing_sub")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Free */}
          <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#4E6080]">{t(lang, "plan_free")}</p>
              <p className="text-3xl font-black text-[#E8F0FF] mt-1">$0</p>
              <p className="text-xs text-[#4E6080] mt-1">{t(lang, "plan_free_desc")}</p>
            </div>
            <ul className="space-y-2">
              {FREE_FEATS.map(k => (
                <li key={k} className="flex items-start gap-2 text-xs text-[#B0C4DE]">
                  <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                  {t(lang, k)}
                </li>
              ))}
            </ul>
            {state === "success" && plan === "free" ? (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <span>✓</span> <span>Check your inbox!</span>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t(lang, "email_placeholder")}
                  className="w-full rounded-xl border border-[#1C2640] bg-[#080F1C] px-3 py-2.5 text-xs text-[#E8F0FF] placeholder-[#2A3A50] focus:border-[#F59E0B]/50 focus:outline-none"
                />
                <button
                  onClick={() => void submit("free")}
                  disabled={state === "loading"}
                  className="w-full rounded-xl border border-[#1C2640] py-2.5 text-xs font-bold text-[#4E6080] hover:text-[#E8F0FF] hover:border-[#2A3A50] transition-colors disabled:opacity-40"
                >
                  {state === "loading" && plan === "free" ? "…" : t(lang, "cta_free_plan")}
                </button>
              </div>
            )}
          </div>

          {/* Premium */}
          <div className="rounded-2xl border border-[#F59E0B]/30 bg-gradient-to-b from-[#F59E0B]/8 to-[#0E1830] p-6 space-y-5 relative overflow-hidden">
            <div className="absolute top-3 right-3 rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2.5 py-1 text-[9px] font-bold text-[#F59E0B] uppercase tracking-wider">
              {t(lang, "plan_premium_badge")}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#F59E0B]">{t(lang, "plan_premium")}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-black text-[#E8F0FF]">{t(lang, "plan_premium_price")}</p>
                <p className="text-xs text-[#4E6080] line-through">$49/yr</p>
              </div>
              <p className="text-xs text-[#4E6080] mt-1">{t(lang, "plan_premium_desc")}</p>
            </div>
            <ul className="space-y-2">
              {FREE_FEATS.map(k => (
                <li key={k} className="flex items-start gap-2 text-xs text-[#4E6080]">
                  <span className="text-[#2A3A50] mt-0.5 shrink-0">✓</span>
                  {t(lang, k)}
                </li>
              ))}
              {PREM_FEATS.map(k => (
                <li key={k} className="flex items-start gap-2 text-xs text-[#E8F0FF] font-semibold">
                  <span className="text-[#F59E0B] mt-0.5 shrink-0">✦</span>
                  {t(lang, k).replace("✦ ", "")}
                </li>
              ))}
            </ul>
            {state === "success" && plan === "premium" ? (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <span>✓</span> <span>Check your inbox!</span>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t(lang, "email_placeholder")}
                  className="w-full rounded-xl border border-[#F59E0B]/30 bg-[#080F1C] px-3 py-2.5 text-xs text-[#E8F0FF] placeholder-[#2A3A50] focus:border-[#F59E0B]/60 focus:outline-none"
                />
                <button
                  onClick={() => void submit("premium")}
                  disabled={state === "loading"}
                  className="w-full rounded-xl bg-[#F59E0B] py-3 text-xs font-black text-[#0B1120] hover:bg-[#FCD34D] transition-colors disabled:opacity-40"
                >
                  {state === "loading" && plan === "premium" ? "…" : t(lang, "cta_premium_plan")}
                </button>
              </div>
            )}
            {state === "error" && <p className="text-xs text-red-400">{msg}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
