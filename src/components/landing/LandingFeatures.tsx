import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

interface Props { lang: Lang }

const FEATURES = [
  { titleKey: "feat_lego_title",    descKey: "feat_lego_desc",    icon: "🧱", accent: "#F59E0B" },
  { titleKey: "feat_pokemon_title", descKey: "feat_pokemon_desc", icon: "🃏", accent: "#EF4444" },
  { titleKey: "feat_cs2_title",     descKey: "feat_cs2_desc",     icon: "🎮", accent: "#3B82F6" },
  { titleKey: "feat_metals_title",  descKey: "feat_metals_desc",  icon: "⚡", accent: "#D97706" },
  { titleKey: "feat_ai_title",      descKey: "feat_ai_desc",      icon: "🤖", accent: "#F59E0B" },
  { titleKey: "feat_sports_title",  descKey: "feat_sports_desc",  icon: "📚", accent: "#10B981" },
] as const;

export function LandingFeatures({ lang }: Props) {
  return (
    <section className="px-6 py-20 border-t border-[#1C2640]">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-10 text-center text-2xl font-black tracking-tight text-[#E8F0FF] md:text-3xl">
          {t(lang, "features_title")}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.titleKey}
              className="group rounded-2xl border border-[#1C2640] bg-[#0E1830] p-5 transition-colors hover:border-[#2A3A50]"
            >
              <div
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl text-lg"
                style={{ background: `${f.accent}15`, border: `1px solid ${f.accent}25` }}
              >
                {f.icon}
              </div>
              <h3 className="mb-1.5 text-sm font-bold text-[#E8F0FF]">
                {t(lang, f.titleKey)}
              </h3>
              <p className="text-xs text-[#4E6080] leading-relaxed">
                {t(lang, f.descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
