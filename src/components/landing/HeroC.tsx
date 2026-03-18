"use client";

import { useState, useEffect } from "react";
import { clsx } from "clsx";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

interface Props {
  lang:    Lang;
  variant: "c";
  onTrack: (plan: "free" | "premium") => void;
}

const STEPS = [
  "Scanning LEGO retirement calendar…",
  "Analyzing Pokémon market trends…",
  "Calculating risk-adjusted returns…",
  "Running Monte Carlo (10,000 runs)…",
  "Optimizing allocation ratios…",
  "Portfolio ready. ✓",
];

const ALLOC = [
  { label: "LEGO Sets",     pct: 35, color: "#F59E0B", ret: "+42%" },
  { label: "Pokémon TCG",   pct: 20, color: "#EF4444", ret: "+28%" },
  { label: "Precious Metals",pct: 20, color: "#D97706", ret: "+12%" },
  { label: "CS2 Skins",     pct: 15, color: "#3B82F6", ret: "+35%" },
  { label: "Sports Cards",  pct: 10, color: "#06B6D4", ret: "+18%" },
];

// Simple donut SVG
function MiniDonut({ alloc }: { alloc: typeof ALLOC }) {
  const cx = 60; const cy = 60; const R = 44; const r = 28;
  let cum = 0;
  const slices = alloc.map(a => { const s = cum; cum += a.pct; return { ...a, start: s, end: cum }; });
  function arc(s: number, e: number) {
    const toRad = (p: number) => ((p / 100) * 360 - 90) * (Math.PI / 180);
    const x1 = cx + R * Math.cos(toRad(s)); const y1 = cy + R * Math.sin(toRad(s));
    const x2 = cx + R * Math.cos(toRad(e)); const y2 = cy + R * Math.sin(toRad(e));
    const ix1 = cx + r * Math.cos(toRad(s)); const iy1 = cy + r * Math.sin(toRad(s));
    const ix2 = cx + r * Math.cos(toRad(e)); const iy2 = cy + r * Math.sin(toRad(e));
    const lg = e - s > 50 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${lg} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${r} ${r} 0 ${lg} 0 ${ix1} ${iy1} Z`;
  }
  return (
    <svg width={120} height={120} className="shrink-0">
      {slices.map(s => <path key={s.label} d={arc(s.start, s.end)} fill={s.color} stroke="#0E1830" strokeWidth={1.5} />)}
      <text x={cx} y={cy - 5} textAnchor="middle" fill="#E8F0FF" fontSize={11} fontWeight="700">+24%</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#4E6080" fontSize={8}>per year</text>
    </svg>
  );
}

export function HeroC({ lang, onTrack }: Props) {
  const [email, setEmail]       = useState("");
  const [state, setState]       = useState<"idle" | "loading" | "success" | "error">("idle");
  const [formPlan, setFormPlan] = useState<"free" | "premium">("premium");
  const [msg, setMsg]           = useState("");
  const [step, setStep]         = useState(0);
  const [done, setDone]         = useState(false);

  // Auto-run Merlin animation
  useEffect(() => {
    if (done) return;
    const iv = setInterval(() => {
      setStep(prev => {
        if (prev >= STEPS.length - 1) { clearInterval(iv); setDone(true); return prev; }
        return prev + 1;
      });
    }, 600);
    return () => clearInterval(iv);
  }, [done]);

  async function submit(selectedPlan: "free" | "premium") {
    if (!email.includes("@")) { setMsg("Enter a valid email"); setState("error"); return; }
    setFormPlan(selectedPlan);
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
    <section className="relative overflow-hidden px-6 py-16 md:py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-radial from-[#F59E0B]/8 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">

          {/* Left: headline + form */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-1.5">
              <span className="text-[#F59E0B] font-black text-sm">◆ MERLIN</span>
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight text-[#E8F0FF] md:text-5xl">
              {t(lang, "hero_c_headline")}
            </h1>

            <p className="text-base text-[#4E6080] leading-relaxed md:text-lg">
              {t(lang, "hero_c_sub")}
            </p>

            {/* Early bird badge */}
            <div className="inline-flex items-center gap-2 rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/8 px-3 py-2">
              <span className="text-sm text-[#F59E0B] font-semibold">{t(lang, "hero_c_badge")}</span>
              <span className="rounded-full bg-[#F59E0B]/20 px-2 py-0.5 text-[10px] font-bold text-[#F59E0B]">
                47 {t(lang, "hero_c_spots")}
              </span>
            </div>

            {/* Form */}
            {state === "success" ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <span className="text-emerald-400">✓</span>
                <p className="text-sm text-emerald-400 font-semibold">You're in! Check your inbox.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && void submit("premium")}
                  placeholder={t(lang, "email_placeholder")}
                  className="w-full rounded-xl border border-[#1C2640] bg-[#0E1830] px-4 py-3 text-sm text-[#E8F0FF] placeholder-[#2A3A50] focus:border-[#F59E0B]/60 focus:outline-none"
                />
                <button
                  onClick={() => void submit("premium")}
                  disabled={state === "loading"}
                  className="w-full rounded-xl bg-[#F59E0B] py-3.5 text-sm font-black text-[#0B1120] hover:bg-[#FCD34D] transition-all disabled:opacity-40"
                >
                  {state === "loading" && formPlan === "premium" ? "…" : t(lang, "cta_premium")}
                </button>
                <button
                  onClick={() => void submit("free")}
                  disabled={state === "loading"}
                  className="w-full py-2 text-sm text-[#4E6080] hover:text-[#B0C4DE] transition-colors"
                >
                  {state === "loading" && formPlan === "free" ? "…" : t(lang, "cta_secondary")}
                </button>
                {state === "error" && <p className="text-xs text-red-400">{msg}</p>}
                <p className="text-[10px] text-[#2A3A50] text-center">{t(lang, "no_spam")}</p>
              </div>
            )}

            <p className="text-xs text-[#2A3A50]">{t(lang, "hero_c_social")}</p>
          </div>

          {/* Right: Merlin terminal mock */}
          <div className="rounded-2xl border border-[#1C2640] bg-[#0E1830] overflow-hidden shadow-2xl shadow-[#F59E0B]/5">
            {/* Terminal header */}
            <div className="border-b border-[#1C2640] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[#F59E0B] font-black text-xs">◆ MERLIN</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
              </div>
              <span className="text-[9px] text-[#2A3A50] font-mono">$5,000 · 3Y · moderate</span>
            </div>

            {/* Steps */}
            <div className="px-4 py-4 space-y-2 font-mono border-b border-[#1C2640]">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5 text-[11px]">
                  {i < step ? (
                    <span className="text-emerald-400 shrink-0">✓</span>
                  ) : i === step ? (
                    <span className="h-2.5 w-2.5 rounded-full border border-[#4E6080] border-t-[#F59E0B] animate-spin shrink-0" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1C2640] shrink-0 ml-0.5" />
                  )}
                  <span className={clsx(i < step ? "text-[#4E6080]" : i === step ? "text-[#E8F0FF]" : "text-[#1C2640]")}>
                    {s}
                  </span>
                </div>
              ))}
            </div>

            {/* Result (shown when done) */}
            <div className={clsx("px-4 py-4 space-y-3 transition-opacity duration-500", done ? "opacity-100" : "opacity-0")}>
              <div className="flex items-center gap-4">
                <MiniDonut alloc={ALLOC} />
                <div className="space-y-2 flex-1 min-w-0">
                  {ALLOC.map(a => (
                    <div key={a.label} className="flex items-center gap-2 text-[10px]">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: a.color }} />
                      <span className="text-[#4E6080] truncate">{a.label}</span>
                      <span className="ml-auto font-bold text-emerald-400 shrink-0">{a.ret}</span>
                      <span className="font-semibold text-[#E8F0FF] w-7 text-right shrink-0">{a.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 text-[10px]">
                <div className="flex-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-center">
                  <p className="text-[#4E6080]">Expected</p>
                  <p className="font-black text-emerald-400">+24%/yr</p>
                </div>
                <div className="flex-1 rounded-lg border border-[#1C2640] bg-[#080F1C] p-2 text-center">
                  <p className="text-[#4E6080]">3Y Value</p>
                  <p className="font-black text-[#E8F0FF]">$9,320</p>
                </div>
                <div className="flex-1 rounded-lg border border-[#1C2640] bg-[#080F1C] p-2 text-center">
                  <p className="text-[#4E6080]">Risk Score</p>
                  <p className="font-black text-amber-400">55/100</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
