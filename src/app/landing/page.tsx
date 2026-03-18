import Link from "next/link";
import Image from "next/image";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import { PreRegisterForm } from "@/components/landing/PreRegisterForm";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-bg" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono" });

// ── Fetch real metals prices from Yahoo Finance ─────────────────────────────
type TickerItem = { icon: string; name: string; price: string; change: string; pos: boolean };

async function fetchMetals(): Promise<TickerItem[]> {
  const pairs: Array<{ symbol: string; yahoo: string; icon: string; name: string }> = [
    { symbol: "XAU", yahoo: "GC=F", icon: "⚡", name: "Gold XAU/USD" },
    { symbol: "XAG", yahoo: "SI=F", icon: "🥈", name: "Silver XAG/USD" },
    { symbol: "XPT", yahoo: "PL=F", icon: "💠", name: "Platinum XPT" },
    { symbol: "XPD", yahoo: "PA=F", icon: "🔩", name: "Palladium XPD" },
  ];

  const results = await Promise.allSettled(
    pairs.map(async ({ yahoo, icon, name }) => {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahoo}?interval=1d&range=2d`,
        { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, next: { revalidate: 1800 } },
      );
      if (!res.ok) throw new Error("bad response");
      const json = (await res.json()) as {
        chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; previousClose?: number } }> };
      };
      const meta = json?.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice ?? 0;
      const prev = meta?.previousClose ?? price;
      const pct = prev ? ((price - prev) / prev) * 100 : 0;
      return {
        icon,
        name,
        price: `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
        change: `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`,
        pos: pct >= 0,
      } satisfies TickerItem;
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<TickerItem> => r.status === "fulfilled")
    .map((r) => r.value);
}

const staticItems: TickerItem[] = [
  { icon: "🃏", name: "Charizard Base #4", price: "$4,200", change: "+142%", pos: true },
  { icon: "🧱", name: "LEGO Taj Mahal", price: "$340", change: "+89%", pos: true },
  { icon: "🎮", name: "AK-47 Safari Mesh", price: "$89.50", change: "−2.1%", pos: false },
  { icon: "📚", name: "ASM #300 CGC 9.8", price: "$780", change: "+22%", pos: true },
  { icon: "💎", name: "MTG Black Lotus", price: "$12,000", change: "+5%", pos: true },
  { icon: "🏆", name: "Gretzky RC PSA 10", price: "$3,200", change: "+18%", pos: true },
];

const freeFeatures = ["Track all asset classes", "Real-time price feeds", "Basic P&L + ROI charts", "No account required for demo"];
const premiumFeatures = ["AI portfolio analyst (unlimited)", "Advanced analytics & health score", "Price snapshots & trend history", "All asset classes + live feeds", "Priority support", "Early-bird rate locked forever"];

// ── Page ────────────────────────────────────────────────────────────────────
export default async function LandingPage() {
  const metalItems = await fetchMetals();
  const allTicker = [...metalItems, ...staticItems];

  return (
    <div className={`${bricolage.variable} ${mono.variable} min-h-screen bg-[#0B1120] text-[#E8F0FF]`}>
      <style>{`
        :root { --amber: #F59E0B; --amber-bright: #FCD34D; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes floatA { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes floatB { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes drawLine { from{stroke-dashoffset:900} to{stroke-dashoffset:0} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .fb  { font-family: var(--font-bg); }
        .fm  { font-family: var(--font-mono); }
        .afu { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .d1{animation-delay:.05s} .d2{animation-delay:.18s} .d3{animation-delay:.32s}
        .d4{animation-delay:.48s} .d5{animation-delay:.64s} .d6{animation-delay:.82s}
        .fa { animation: floatA 5s ease-in-out infinite; }
        .fb2{ animation: floatB 6.5s ease-in-out infinite 1.2s; }
        .chart-path { stroke-dasharray: 900; animation: drawLine 2.4s ease-out 1s both; }
        .tick { animation: ticker 40s linear infinite; }
        .blink { animation: blink 2s ease-in-out infinite; }
        .grid-bg {
          background-image:
            linear-gradient(rgba(245,158,11,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,158,11,0.05) 1px, transparent 1px);
          background-size: 56px 56px;
        }
        .card-bg { background: #0E1830; border-color: #1C2640; }
        .card-bg:hover { background: #111E38; }
        .mockup-shadow {
          box-shadow:
            0 0 0 1px rgba(245,158,11,0.1),
            0 32px 80px rgba(0,0,0,0.7),
            0 0 100px rgba(245,158,11,0.05);
        }
        .pill-shadow { box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06); }
        .amber-glow  { box-shadow: 0 0 60px rgba(245,158,11,0.1); }
      `}</style>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#0B1120]/95 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Vaulty" width={28} height={28} className="rounded-lg" />
            <span className="fb font-bold text-[15px] text-[#E8F0FF]">Vaulty</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="fm text-[11px] text-[#4E6080] hover:text-[#F59E0B] transition-colors uppercase tracking-widest">
              Sign in
            </Link>
            <Link href="#access" className="fm text-[11px] bg-[#F59E0B] hover:bg-[#FCD34D] text-[#0B1120] px-4 py-2 rounded font-semibold uppercase tracking-widest transition-colors">
              Early Access
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative grid-bg min-h-[calc(100vh-56px)] flex items-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/3 w-[700px] h-[500px] rounded-full bg-[#F59E0B]/[0.06] blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[#3B6FFF]/[0.05] blur-[100px]" />
        </div>

        {/* watermark */}
        <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <span className="fb font-extrabold text-[18vw] text-[#F59E0B]/[0.025] whitespace-nowrap tracking-tighter">VAULT</span>
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-16 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-14 items-center">

            {/* LEFT */}
            <div>
              <div className="afu d1 inline-flex items-center gap-2 border border-[#F59E0B]/20 bg-[#F59E0B]/8 px-3.5 py-1.5 rounded-full mb-10">
                <span className="blink w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                <span className="fm text-[10px] text-[#F59E0B] uppercase tracking-[0.22em] font-medium">Early access · limited spots</span>
              </div>

              <h1 className="afu d2 fb font-extrabold leading-[1.04] tracking-tight mb-7 text-[#E8F0FF]">
                <span className="block text-[3.8rem] sm:text-[4.4rem]">All your</span>
                <span className="block text-[3.8rem] sm:text-[4.4rem] text-[#F59E0B]">alternative</span>
                <span className="block text-[3.8rem] sm:text-[4.4rem]">investments.</span>
              </h1>

              <p className="afu d3 fb text-[#7A90B0] text-[16px] leading-relaxed mb-10 max-w-[400px]">
                Pokémon cards, LEGO sets, CS2 skins, gold, comics — live prices,
                P&amp;L analytics and an AI analyst in one dashboard.
              </p>

              <div className="afu d4 grid grid-cols-3 gap-4 mb-12 max-w-[380px]">
                {[
                  { v: "10+", l: "Asset classes" },
                  { v: "Live", l: "Price feeds" },
                  { v: "AI", l: "Analyst built-in" },
                ].map(({ v, l }) => (
                  <div key={l} className="border border-[#1C2640] rounded-xl p-4 bg-[#0E1830]">
                    <div className="fb font-extrabold text-xl text-[#FCD34D]">{v}</div>
                    <div className="fm text-[9px] text-[#3E5070] mt-1 uppercase tracking-widest">{l}</div>
                  </div>
                ))}
              </div>

              <div id="access" className="afu d5 scroll-mt-20">
                <PreRegisterForm />
              </div>
            </div>

            {/* RIGHT — mock dashboard */}
            <div className="afu d6 relative hidden lg:block">

              {/* Float pill: AI insight */}
              <div className="fa absolute -top-8 -left-6 z-20 pill-shadow bg-[#0E1830] border border-[#1C2640] rounded-2xl px-4 py-3 w-60">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🤖</span>
                  <span className="fm text-[9px] text-[#F59E0B] uppercase tracking-wider font-medium">AI Analyst</span>
                </div>
                <p className="fm text-[11px] text-[#7A90B0] leading-relaxed">
                  Your LEGO holdings outperform gold by <span className="text-[#4ADE80]">+34%</span> YTD. Consider rebalancing.
                </p>
              </div>

              {/* Float pill: price alert */}
              <div className="fb2 absolute -bottom-6 -right-4 z-20 pill-shadow bg-[#0E1830] border border-[#1C2640] rounded-2xl px-4 py-3 w-52">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="fm text-[9px] text-[#3E5070] uppercase tracking-wider">Price alert</span>
                  <span className="blink w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
                </div>
                <div className="fb text-[12px] text-[#E8F0FF] font-semibold">Charizard Holo #4</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="fm text-[13px] text-[#FCD34D] font-semibold">$4,200</span>
                  <span className="fm text-[10px] text-[#4ADE80]">↑ +142%</span>
                </div>
              </div>

              {/* Browser frame */}
              <div className="mockup-shadow rounded-2xl bg-[#080F1C] overflow-hidden"
                style={{ transform: "perspective(1200px) rotateY(-3deg) rotateX(1deg)" }}>

                {/* Chrome */}
                <div className="bg-[#0D1627] border-b border-white/[0.05] px-4 py-3 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                    <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                    <div className="w-3 h-3 rounded-full bg-[#28CA41]" />
                  </div>
                  <div className="flex-1 bg-[#050C18] rounded-md px-3 py-1.5 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#4ADE80]/50" />
                    <span className="fm text-[10px] text-[#2A3A50]">vaulty.app/portfolio</span>
                  </div>
                </div>

                {/* App nav */}
                <div className="border-b border-white/[0.04] px-5 py-2.5 flex items-center justify-between bg-[#080F1C]">
                  <div className="flex items-center gap-2">
                    <Image src="/logo.png" alt="Vaulty" width={18} height={18} className="rounded" />
                    <span className="fb font-bold text-[12px] text-[#E8F0FF]">Vaulty</span>
                  </div>
                  <div className="flex gap-4">
                    {["Portfolio", "Terminal", "Analyst"].map((t, i) => (
                      <span key={t} className={`fm text-[10px] uppercase tracking-wider ${i === 0 ? "text-[#F59E0B]" : "text-[#2A3A50]"}`}>{t}</span>
                    ))}
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#F59E0B]/20 flex items-center justify-center">
                    <span className="fm text-[8px] text-[#F59E0B] font-semibold">JD</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 bg-[#080F1C]">
                  {/* KPIs */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: "Portfolio Value", value: "$12,480", sub: "+$964 all time", color: "text-[#4ADE80]" },
                      { label: "Today's P&L", value: "+$184", sub: "+1.49% today", color: "text-[#4ADE80]" },
                      { label: "Best Performer", value: "Charizard", sub: "+142% ROI", color: "text-[#FCD34D]" },
                    ].map(({ label, value, sub, color }) => (
                      <div key={label} className="rounded-xl bg-[#0D1627] border border-[#162035] p-3.5">
                        <div className="fm text-[9px] text-[#2A3A50] uppercase tracking-wider mb-2">{label}</div>
                        <div className="fb font-bold text-[15px] text-[#E8F0FF] leading-none mb-1">{value}</div>
                        <div className={`fm text-[9px] ${color}`}>{sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Chart */}
                  <div className="rounded-xl bg-[#0D1627] border border-[#162035] p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="fm text-[9px] text-[#2A3A50] uppercase tracking-wider">Portfolio trend · 12 months</span>
                      <span className="fm text-[9px] text-[#4ADE80]">↑ +8.4%</span>
                    </div>
                    <svg viewBox="0 0 400 72" className="w-full h-14" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,64 C15,60 25,55 42,50 C58,45 68,52 86,44 C103,36 113,42 130,32 C148,22 157,28 174,20 C191,12 200,18 218,12 C236,6 245,10 262,6 C279,2 290,5 310,3 C330,1 355,3 400,2"
                        fill="none" stroke="#F59E0B" strokeWidth="1.5" className="chart-path"
                      />
                      <path
                        d="M0,64 C15,60 25,55 42,50 C58,45 68,52 86,44 C103,36 113,42 130,32 C148,22 157,28 174,20 C191,12 200,18 218,12 C236,6 245,10 262,6 C279,2 290,5 310,3 C330,1 355,3 400,2 L400,72 L0,72 Z"
                        fill="url(#cg2)"
                      />
                    </svg>
                  </div>

                  {/* Table */}
                  <div className="rounded-xl bg-[#0D1627] border border-[#162035] overflow-hidden">
                    <div className="grid grid-cols-4 px-4 py-2 border-b border-[#162035]">
                      {["Asset", "Type", "Value", "ROI"].map(h => (
                        <span key={h} className="fm text-[8px] text-[#1E2E42] uppercase tracking-widest">{h}</span>
                      ))}
                    </div>
                    {[
                      { name: "Charizard Holo #4", type: "Pokémon TCG", val: "$4,200", roi: "+142%", pos: true },
                      { name: "Taj Mahal 10182", type: "LEGO", val: "$340", roi: "+89%", pos: true },
                      { name: "Gold — 1 oz", type: "XAU Metal", val: "$2,341", roi: "+12%", pos: true },
                      { name: "AK-47 Safari Mesh", type: "CS2 Skin", val: "$89", roi: "−8%", pos: false },
                    ].map(({ name, type, val, roi, pos }, i) => (
                      <div key={i} className={`grid grid-cols-4 px-4 py-2.5 ${i < 3 ? "border-b border-[#0F1A2C]" : ""}`}>
                        <span className="fm text-[10px] text-[#B0C4DE] font-medium truncate pr-2">{name}</span>
                        <span className="fm text-[9px] text-[#2A3A50] uppercase tracking-wide">{type}</span>
                        <span className="fm text-[10px] text-[#B0C4DE]">{val}</span>
                        <span className={`fm text-[10px] font-medium ${pos ? "text-[#4ADE80]" : "text-[#F87171]"}`}>{roi}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER — реальные данные ── */}
      <div className="border-y border-[#1C2640] bg-[#080F1C] py-3 overflow-hidden">
        <div className="flex tick gap-0 whitespace-nowrap">
          {[...allTicker, ...allTicker].map(({ icon, name, price, change, pos }, i) => (
            <div key={i} className="inline-flex items-center gap-2.5 px-5 border-r border-[#1C2640]">
              <span className="text-sm">{icon}</span>
              <span className="fm text-[11px] text-[#4E6080] uppercase tracking-wider">{name}</span>
              <span className="fm text-[12px] text-[#B0C4DE] font-medium">{price}</span>
              <span className={`fm text-[11px] font-semibold ${pos ? "text-[#4ADE80]" : "text-[#F87171]"}`}>{change}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section className="max-w-6xl mx-auto px-6 py-28">
        <div className="mb-16">
          <div className="fm text-[10px] text-[#F59E0B] uppercase tracking-[0.25em] mb-3">ASSET.001</div>
          <h2 className="fb font-extrabold text-[2.8rem] sm:text-5xl text-[#E8F0FF] leading-tight mb-4">
            Every alternative asset,<br />one dashboard.
          </h2>
          <p className="fb text-[#4E6080] text-[16px]">Real-time prices from the sources that actually matter.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#1C2640]">
          {[
            { icon: "🃏", code: "TCG", title: "Trading Cards", desc: "Pokémon, MTG, sports cards — live prices from TCGPlayer, Scryfall and eBay sold listings." },
            { icon: "🧱", code: "LEGO", title: "LEGO Sets", desc: "Valuations, retirement status, and historical appreciation for every set in your collection." },
            { icon: "🎮", code: "CS2", title: "CS2 Skins", desc: "Steam marketplace prices with wear grade tracking and full portfolio P&L." },
            { icon: "⚡", code: "XAU", title: "Precious Metals", desc: "Gold, silver, platinum, palladium — spot prices refreshed in real time." },
            { icon: "📚", code: "MISC", title: "Comics & More", desc: "Comics, domain names, music royalties, anime cels — if it's alternative, we track it." },
            { icon: "🤖", code: "AI", title: "AI Analyst", desc: "Claude-powered analysis with diversification tips, risk scoring, and rebalancing ideas." },
          ].map(({ icon, code, title, desc }) => (
            <div key={title} className="bg-[#0B1120] p-8 hover:bg-[#0E1830] transition-colors group cursor-default">
              <div className="flex items-start justify-between mb-6">
                <span className="text-3xl">{icon}</span>
                <span className="fm text-[9px] text-[#1C2640] group-hover:text-[#F59E0B] transition-colors tracking-[0.25em] uppercase">{code}</span>
              </div>
              <h3 className="fb font-bold text-[17px] text-[#E8F0FF] mb-2.5">{title}</h3>
              <p className="fm text-[12px] text-[#4E6080] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="grid-bg border-y border-[#1C2640] py-28" id="pricing">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <div className="fm text-[10px] text-[#F59E0B] uppercase tracking-[0.25em] mb-3">ASSET.002</div>
            <h2 className="fb font-extrabold text-[2.8rem] sm:text-5xl text-[#E8F0FF] leading-tight mb-4">
              Simple,<br />honest pricing.
            </h2>
            <p className="fb text-[#4E6080] text-[16px]">Lock in the early-bird price before we launch publicly.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
            {/* Free */}
            <div className="border border-[#1C2640] bg-[#0E1830] rounded-2xl p-8">
              <div className="fm text-[9px] text-[#3E5070] uppercase tracking-[0.22em] mb-8">Free forever</div>
              <div className="fb font-extrabold text-5xl text-[#E8F0FF] mb-1">$0</div>
              <div className="fm text-[10px] text-[#243040] mb-10 tracking-wider">No credit card required</div>
              <ul className="space-y-3.5 mb-10">
                {freeFeatures.map(f => (
                  <li key={f} className="flex gap-3 fm text-[12px] text-[#5A7090]">
                    <span className="text-[#F59E0B] shrink-0">—</span>{f}
                  </li>
                ))}
              </ul>
              <a href="#access" className="block text-center border border-[#1C2640] hover:border-[#F59E0B]/30 text-[#3E5070] hover:text-[#E8F0FF] fm text-[10px] uppercase tracking-[0.2em] font-semibold px-6 py-3.5 rounded-xl transition-colors">
                Join free
              </a>
            </div>

            {/* Premium */}
            <div className="relative border border-[#F59E0B]/20 bg-[#0E1830] rounded-2xl p-8 amber-glow">
              <div className="absolute top-4 right-4 fm text-[8px] bg-[#F59E0B] text-[#0B1120] font-bold px-2.5 py-1 rounded tracking-[0.15em] uppercase">
                BEST VALUE
              </div>
              <div className="fm text-[9px] text-[#F59E0B] uppercase tracking-[0.22em] mb-8">Premium · Early Bird</div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="fb font-extrabold text-5xl text-[#FCD34D]">$5</span>
                <span className="fm text-[10px] text-[#2A3A50] tracking-wider">/ year</span>
              </div>
              <div className="fm text-[10px] text-[#2A3A50] mb-10 tracking-wider">&lt;$0.42/month · locked in forever</div>
              <ul className="space-y-3.5 mb-10">
                {premiumFeatures.map(f => (
                  <li key={f} className="flex gap-3 fm text-[12px] text-[#8AABCC]">
                    <span className="text-[#F59E0B] shrink-0">✓</span>{f}
                  </li>
                ))}
              </ul>
              <a href="#access" className="block text-center bg-[#F59E0B] hover:bg-[#FCD34D] text-[#0B1120] fm text-[10px] uppercase tracking-[0.2em] font-semibold px-6 py-3.5 rounded-xl transition-colors">
                Get Premium · $5/year
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 border-t border-[#1C2640]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Vaulty" width={22} height={22} className="rounded" />
            <span className="fb font-bold text-sm text-[#E8F0FF]">Vaulty</span>
          </div>
          <p className="fm text-[10px] text-[#1C2640] tracking-wider">© 2026 Vaulty. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/login" className="fm text-[10px] text-[#243040] hover:text-[#F59E0B] transition-colors uppercase tracking-widest">Sign in</Link>
            <Link href="/register" className="fm text-[10px] text-[#243040] hover:text-[#F59E0B] transition-colors uppercase tracking-widest">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
