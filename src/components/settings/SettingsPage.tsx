"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { useUser, getInitials } from "@/store/userStore";
import { useAuth } from "@/store/authStore";
import { useCurrency, CURRENCY_LABELS, type DisplayCurrency } from "@/store/currencyStore";
import { usePortfolio } from "@/store/portfolioStore";
import { useLang } from "@/store/langStore";
import { t, type Lang } from "@/lib/i18n";

type Section = "profile" | "display" | "notifications" | "data" | "about";

const AVATAR_COLORS: { key: string; bg: string; ring: string }[] = [
  { key: "sky",    bg: "bg-sky-500",     ring: "ring-sky-400"    },
  { key: "violet", bg: "bg-violet-500",  ring: "ring-violet-400" },
  { key: "emerald",bg: "bg-emerald-500", ring: "ring-emerald-400"},
  { key: "amber",  bg: "bg-amber-500",   ring: "ring-amber-400"  },
  { key: "rose",   bg: "bg-rose-500",    ring: "ring-rose-400"   },
  { key: "slate",  bg: "bg-slate-500",   ring: "ring-slate-400"  },
];

function avatarBg(colorKey: string) {
  return AVATAR_COLORS.find((c) => c.key === colorKey)?.bg ?? "bg-sky-500";
}
function avatarRing(colorKey: string) {
  return AVATAR_COLORS.find((c) => c.key === colorKey)?.ring ?? "ring-sky-400";
}

// ─── Section panels ───────────────────────────────────────────────────────────

function ProfileSection() {
  const { profile, updateProfile } = useUser();
  const { lang } = useLang();
  const [name, setName]   = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    updateProfile({ name: name.trim(), email: email.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="fb text-lg font-semibold text-[#E8F0FF] mb-1">{t(lang, "settings_profile_title")}</h2>
        <p className="fm text-sm text-[#4E6080]">{t(lang, "settings_profile_sub")}</p>
      </div>

      {/* Avatar picker */}
      <div className="flex items-center gap-5">
        <div className={clsx(
          "flex h-16 w-16 items-center justify-center rounded-full text-xl font-black text-white ring-2",
          avatarBg(profile.avatarColor),
          avatarRing(profile.avatarColor),
        )}>
          {getInitials(profile.name)}
        </div>
        <div>
          <p className="fm text-xs text-[#4E6080] mb-2">{t(lang, "settings_avatar_color")}</p>
          <div className="flex gap-2">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c.key}
                onClick={() => updateProfile({ avatarColor: c.key })}
                className={clsx(
                  "h-7 w-7 rounded-full transition-all",
                  c.bg,
                  profile.avatarColor === c.key
                    ? "ring-2 ring-white ring-offset-2 ring-offset-[#0E1830] scale-110"
                    : "opacity-60 hover:opacity-100",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4 max-w-md">
        <div>
          <label className="fm block text-sm text-[#4E6080] mb-1.5">{t(lang, "settings_email_label")}</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-[#1C2640] bg-[#080F1C] px-4 py-2.5 text-sm text-[#E8F0FF] placeholder:text-[#2A3A50] focus:border-[#F59E0B]/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="fm block text-sm text-[#4E6080] mb-1.5">{t(lang, "settings_name_label")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ivan Ivanov"
            className="w-full rounded-lg border border-[#1C2640] bg-[#080F1C] px-4 py-2.5 text-sm text-[#E8F0FF] placeholder:text-[#2A3A50] focus:border-[#F59E0B]/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="rounded-lg bg-[#F59E0B] px-5 py-2 text-sm font-semibold text-[#0B1120] hover:bg-[#FCD34D] transition-colors"
        >
          {t(lang, "settings_save")}
        </button>
        {saved && <span className="fm text-sm text-[#4ADE80]">{t(lang, "settings_saved")}</span>}
      </div>
    </div>
  );
}

const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English",  flag: "🇬🇧" },
  { code: "ru", label: "Русский",  flag: "🇷🇺" },
  { code: "es", label: "Español",  flag: "🇪🇸" },
];

function DisplaySection() {
  const { displayCurrency, setDisplayCurrency } = useCurrency();
  const { lang, setLang } = useLang();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="fb text-lg font-semibold text-[#E8F0FF] mb-1">{t(lang, "settings_display_title")}</h2>
        <p className="fm text-sm text-[#4E6080]">{t(lang, "settings_display_sub")}</p>
      </div>

      <div className="max-w-md space-y-6">
        {/* Language picker */}
        <div>
          <label className="fm block text-sm text-[#4E6080] mb-2">{t(lang, "settings_language")}</label>
          <div className="grid grid-cols-3 gap-2">
            {LANGS.map(({ code, label, flag }) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={clsx(
                  "rounded-lg border px-4 py-3 text-sm font-medium text-left transition-colors flex items-center gap-2",
                  lang === code
                    ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                    : "border-[#1C2640] bg-[#080F1C] text-[#4E6080] hover:border-[#3E5070] hover:text-[#B0C4DE]",
                )}
              >
                <span>{flag}</span>
                {label}
              </button>
            ))}
          </div>
          <p className="fm text-xs text-[#4E6080] mt-2">{t(lang, "settings_lang_note")}</p>
        </div>

        {/* Currency picker */}
        <div>
          <label className="fm block text-sm text-[#4E6080] mb-2">{t(lang, "settings_currency_label")}</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(CURRENCY_LABELS) as [DisplayCurrency, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setDisplayCurrency(key)}
                className={clsx(
                  "rounded-lg border px-4 py-3 text-sm font-medium text-left transition-colors",
                  displayCurrency === key
                    ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                    : "border-[#1C2640] bg-[#080F1C] text-[#4E6080] hover:border-[#3E5070] hover:text-[#B0C4DE]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#1C2640] bg-[#080F1C] p-4">
          <p className="fm text-xs text-[#4E6080]">{t(lang, "settings_currency_note")}</p>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
        checked ? "bg-[#F59E0B]" : "bg-[#1C2640]",
      )}
    >
      <span
        className={clsx(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

function NotificationsSection() {
  const { profile, updateNotifications } = useUser();
  const { lang } = useLang();
  const n = profile.notifications;

  const items = [
    { key: "priceAlerts"  as const, labelKey: "settings_notif_title_prices" as const, descKey: "settings_notif_desc_prices" as const },
    { key: "weeklyReport" as const, labelKey: "settings_notif_title_weekly" as const, descKey: "settings_notif_desc_weekly" as const },
    { key: "assetUpdates" as const, labelKey: "settings_notif_title_updates" as const, descKey: "settings_notif_desc_updates" as const },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="fb text-lg font-semibold text-[#E8F0FF] mb-1">{t(lang, "settings_notif_title_section")}</h2>
        <p className="fm text-sm text-[#4E6080]">{t(lang, "settings_notif_sub")}</p>
      </div>
      <div className="max-w-lg space-y-3">
        {items.map(({ key, labelKey, descKey }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-xl border border-[#1C2640] bg-[#0E1830] px-5 py-4"
          >
            <div>
              <p className="text-sm font-medium text-[#E8F0FF]">{t(lang, labelKey)}</p>
              <p className="fm text-xs text-[#4E6080] mt-0.5">{t(lang, descKey)}</p>
            </div>
            <Toggle checked={n[key]} onChange={(v) => updateNotifications({ [key]: v })} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DataSection() {
  const { assets } = usePortfolio();
  const { storageKey } = useAuth();
  const { lang } = useLang();
  const [exported, setExported] = useState(false);

  function handleExport() {
    const data = JSON.stringify(assets, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `vaulty-portfolio-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  }

  function handleClearPortfolio() {
    if (confirm(t(lang, "settings_clear_confirm"))) {
      localStorage.removeItem(storageKey);
      window.location.href = "/app";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="fb text-lg font-semibold text-[#E8F0FF] mb-1">{t(lang, "settings_data_title")}</h2>
        <p className="fm text-sm text-[#4E6080]">{t(lang, "settings_data_sub")}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-lg">
        {[
          { labelKey: "settings_assets_count" as const, value: assets.length },
          { labelKey: "settings_tx_count" as const,     value: assets.reduce((s, a) => s + a.transactions.length, 0) },
          { labelKey: "settings_classes_count" as const,value: new Set(assets.map((a) => a.assetClass)).size },
        ].map(({ labelKey, value }) => (
          <div key={labelKey} className="rounded-xl border border-[#1C2640] bg-[#0E1830] p-4 text-center">
            <p className="fb text-2xl font-black text-[#E8F0FF]">{value}</p>
            <p className="fm text-xs text-[#4E6080] mt-1">{t(lang, labelKey)}</p>
          </div>
        ))}
      </div>

      <div className="max-w-lg space-y-3">
        <div className="rounded-xl border border-[#1C2640] bg-[#0E1830] p-5">
          <p className="fb text-sm font-medium text-[#E8F0FF] mb-1">{t(lang, "settings_export_title")}</p>
          <p className="fm text-xs text-[#4E6080] mb-4">{t(lang, "settings_export_desc")}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="rounded-lg border border-[#1C2640] bg-[#080F1C] px-4 py-2 text-sm font-medium text-[#B0C4DE] hover:border-[#3E5070] hover:text-[#E8F0FF] transition-colors"
            >
              {t(lang, "settings_export_btn")}
            </button>
            {exported && <span className="fm text-sm text-[#4ADE80]">{t(lang, "settings_export_done")}</span>}
          </div>
        </div>

        <div className="rounded-xl border border-[#F87171]/25 bg-[#F87171]/10 p-5">
          <p className="fb text-sm font-medium text-[#F87171] mb-1">{t(lang, "settings_clear_title")}</p>
          <p className="fm text-xs text-[#4E6080] mb-4">{t(lang, "settings_clear_desc")}</p>
          <button
            onClick={handleClearPortfolio}
            className="rounded-lg border border-[#F87171]/30 bg-[#F87171]/15 px-4 py-2 text-sm font-medium text-[#F87171] hover:bg-[#F87171]/25 transition-colors"
          >
            {t(lang, "settings_clear_btn")}
          </button>
        </div>
      </div>
    </div>
  );
}

function AboutSection() {
  const { lang } = useLang();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="fb text-lg font-semibold text-[#E8F0FF] mb-1">{t(lang, "settings_about_title")}</h2>
        <p className="fm text-sm text-[#4E6080]">{t(lang, "settings_about_sub")}</p>
      </div>
      <div className="max-w-lg space-y-4">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Vaulty" className="h-12 w-12 rounded-xl object-cover" />
          <div>
            <p className="fb font-semibold text-[#E8F0FF]">Vaulty</p>
            <p className="fm text-xs text-[#4E6080]">Alternative Investments Dashboard</p>
          </div>
        </div>
        <div className="rounded-xl border border-[#1C2640] bg-[#0E1830] divide-y divide-[#162035]">
          {[
            { labelKey: "settings_version" as const,          value: "1.0.0" },
            { labelKey: "settings_about_framework" as const,  value: "Next.js 14 + React 18" },
            { labelKey: "settings_about_storage" as const,    value: "localStorage + snapshots.json" },
            { labelKey: "settings_about_prices" as const,     value: "Skinport, Yahoo Finance, Scryfall, TCGdex" },
            { labelKey: "settings_about_rates" as const,      value: "open.er-api.com" },
          ].map(({ labelKey, value }) => (
            <div key={labelKey} className="flex items-center justify-between px-5 py-3">
              <span className="fm text-sm text-[#4E6080]">{t(lang, labelKey)}</span>
              <span className="fm text-sm text-[#E8F0FF] font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const [section, setSection] = useState<Section>("profile");
  const { profile } = useUser();
  const { mode, user, logout } = useAuth();
  const { lang } = useLang();

  const sectionItems: { key: Section; label: string; icon: string }[] = [
    { key: "profile",       label: t(lang, "settings_profile"),       icon: "👤" },
    { key: "display",       label: t(lang, "settings_display"),       icon: "🎨" },
    { key: "notifications", label: t(lang, "settings_notifications"), icon: "🔔" },
    { key: "data",          label: t(lang, "settings_data"),          icon: "💾" },
    { key: "about",         label: t(lang, "settings_about"),         icon: "ℹ️"  },
  ];

  return (
    <div className="min-h-screen bg-[#0B1120] text-[#E8F0FF]">
      {/* Navbar */}
      <header className="sticky top-0 z-20 border-b border-[#1C2640] bg-[#0B1120]/90 backdrop-blur">
        <div className="mx-auto flex max-w-screen-xl items-center gap-4 px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Vaulty" className="h-8 w-8 rounded-lg object-cover" />
            <span className="fb text-sm font-semibold tracking-tight text-[#E8F0FF]">Vaulty</span>
          </Link>
          <span className="text-[#1C2640]">/</span>
          <span className="fm text-sm text-[#4E6080]">{t(lang, "settings_title")}</span>
          <div className="ml-auto">
            <Link href="/" className="text-sm text-[#4E6080] hover:text-[#F59E0B] transition-colors">
              {t(lang, "settings_back")}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-56 shrink-0">
            {/* User card */}
            <div className="mb-4 rounded-xl border border-[#1C2640] bg-[#0E1830] px-4 py-3">
              {mode === "demo" && (
                <div className="mb-2 rounded-md bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-2.5 py-1 text-center text-xs font-semibold text-[#F59E0B]">
                  {t(lang, "settings_demo_mode")}
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white",
                  `bg-${profile.avatarColor}-500`,
                )}>
                  {getInitials(user?.name ?? profile.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#E8F0FF]">
                    {user?.name ?? profile.name ?? t(lang, "settings_no_name")}
                  </p>
                  <p className="fm truncate text-xs text-[#4E6080]">
                    {user?.email ?? profile.email ?? (mode === "demo" ? t(lang, "settings_guest_mode") : t(lang, "settings_no_email"))}
                  </p>
                </div>
              </div>
              <button
                onClick={() => void logout()}
                className="mt-3 w-full rounded-lg border border-[#1C2640] py-1.5 text-xs font-medium text-[#4E6080] hover:border-[#3E5070] hover:text-[#B0C4DE] transition-colors"
              >
                {t(lang, "settings_logout")}
              </button>
            </div>

            <nav className="space-y-1">
              {sectionItems.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setSection(key)}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    section === key
                      ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25"
                      : "text-[#4E6080] hover:bg-[#162035] hover:text-[#B0C4DE]",
                  )}
                >
                  <span>{icon}</span>
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0 rounded-2xl border border-[#1C2640] bg-[#0E1830] p-8">
            {section === "profile"       && <ProfileSection />}
            {section === "display"       && <DisplaySection />}
            {section === "notifications" && <NotificationsSection />}
            {section === "data"          && <DataSection />}
            {section === "about"         && <AboutSection />}
          </div>
        </div>
      </main>
    </div>
  );
}
