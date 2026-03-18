"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { useUser, getInitials } from "@/store/userStore";
import { useAuth } from "@/store/authStore";
import { useCurrency, CURRENCY_LABELS, type DisplayCurrency } from "@/store/currencyStore";
import { usePortfolio } from "@/store/portfolioStore";

type Section = "profile" | "display" | "notifications" | "data" | "about";

const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: "profile",       label: "Приватные данные",    icon: "👤" },
  { key: "display",       label: "Настройки экрана",    icon: "🎨" },
  { key: "notifications", label: "Уведомления",          icon: "🔔" },
  { key: "data",          label: "Данные и экспорт",    icon: "💾" },
  { key: "about",         label: "О приложении",         icon: "ℹ️"  },
];

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
        <h2 className="fb text-lg font-semibold text-[#E8F0FF] mb-1">Приватные данные</h2>
        <p className="fm text-sm text-[#4E6080]">Эта информация хранится только на вашем устройстве</p>
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
          <p className="fm text-xs text-[#4E6080] mb-2">Цвет аватара</p>
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
          <label className="fm block text-sm text-[#4E6080] mb-1.5">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-[#1C2640] bg-[#080F1C] px-4 py-2.5 text-sm text-[#E8F0FF] placeholder:text-[#2A3A50] focus:border-[#F59E0B]/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="fm block text-sm text-[#4E6080] mb-1.5">Полное имя</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Иван Иванов"
            className="w-full rounded-lg border border-[#1C2640] bg-[#080F1C] px-4 py-2.5 text-sm text-[#E8F0FF] placeholder:text-[#2A3A50] focus:border-[#F59E0B]/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="rounded-lg bg-[#F59E0B] px-5 py-2 text-sm font-semibold text-[#0B1120] hover:bg-[#FCD34D] transition-colors"
        >
          Сохранить
        </button>
        {saved && <span className="fm text-sm text-[#4ADE80]">✓ Сохранено</span>}
      </div>
    </div>
  );
}

function DisplaySection() {
  const { displayCurrency, setDisplayCurrency } = useCurrency();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="fb text-lg font-semibold text-[#E8F0FF] mb-1">Настройки экрана</h2>
        <p className="fm text-sm text-[#4E6080]">Настройте отображение данных</p>
      </div>

      <div className="max-w-md space-y-5">
        <div>
          <label className="fm block text-sm text-[#4E6080] mb-2">Валюта отображения</label>
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
          <p className="fm text-xs text-[#4E6080]">
            Курсы валют обновляются автоматически раз в час через open.er-api.com.
            При отсутствии сети используются последние сохранённые значения.
          </p>
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
  const n = profile.notifications;

  const items = [
    { key: "priceAlerts"  as const, label: "Ценовые уведомления",  desc: "Оповещать при значительном изменении цены актива" },
    { key: "weeklyReport" as const, label: "Еженедельный отчёт",    desc: "Краткий обзор портфеля каждую неделю" },
    { key: "assetUpdates" as const, label: "Обновления активов",    desc: "Уведомления при обновлении данных рынка" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="fb text-lg font-semibold text-[#E8F0FF] mb-1">Уведомления</h2>
        <p className="fm text-sm text-[#4E6080]">Настройки сохраняются на вашем устройстве</p>
      </div>
      <div className="max-w-lg space-y-3">
        {items.map(({ key, label, desc }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-xl border border-[#1C2640] bg-[#0E1830] px-5 py-4"
          >
            <div>
              <p className="text-sm font-medium text-[#E8F0FF]">{label}</p>
              <p className="fm text-xs text-[#4E6080] mt-0.5">{desc}</p>
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
    if (confirm("Очистить портфель? Все активы будут удалены. Это необратимо.")) {
      localStorage.removeItem(storageKey);
      window.location.href = "/app";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="fb text-lg font-semibold text-[#E8F0FF] mb-1">Данные и экспорт</h2>
        <p className="fm text-sm text-[#4E6080]">Управляйте данными портфеля</p>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-lg">
        {[
          { label: "Активов в портфеле", value: assets.length },
          { label: "Транзакций",          value: assets.reduce((s, a) => s + a.transactions.length, 0) },
          { label: "Классов активов",     value: new Set(assets.map((a) => a.assetClass)).size },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-[#1C2640] bg-[#0E1830] p-4 text-center">
            <p className="fb text-2xl font-black text-[#E8F0FF]">{value}</p>
            <p className="fm text-xs text-[#4E6080] mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="max-w-lg space-y-3">
        <div className="rounded-xl border border-[#1C2640] bg-[#0E1830] p-5">
          <p className="fb text-sm font-medium text-[#E8F0FF] mb-1">Экспорт портфеля</p>
          <p className="fm text-xs text-[#4E6080] mb-4">
            Скачайте все данные портфеля в формате JSON. Файл содержит все активы, транзакции и снепшоты цен.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="rounded-lg border border-[#1C2640] bg-[#080F1C] px-4 py-2 text-sm font-medium text-[#B0C4DE] hover:border-[#3E5070] hover:text-[#E8F0FF] transition-colors"
            >
              ↓ Скачать JSON
            </button>
            {exported && <span className="fm text-sm text-[#4ADE80]">✓ Загрузка началась</span>}
          </div>
        </div>

        <div className="rounded-xl border border-[#F87171]/25 bg-[#F87171]/10 p-5">
          <p className="fb text-sm font-medium text-[#F87171] mb-1">Очистить портфель</p>
          <p className="fm text-xs text-[#4E6080] mb-4">
            Удалить все активы и начать с чистого листа. Это действие необратимо.
          </p>
          <button
            onClick={handleClearPortfolio}
            className="rounded-lg border border-[#F87171]/30 bg-[#F87171]/15 px-4 py-2 text-sm font-medium text-[#F87171] hover:bg-[#F87171]/25 transition-colors"
          >
            Очистить портфель
          </button>
        </div>
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="fb text-lg font-semibold text-[#E8F0FF] mb-1">О приложении</h2>
        <p className="fm text-sm text-[#4E6080]">Информация о Vaulty</p>
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
            { label: "Версия",        value: "1.0.0" },
            { label: "Фреймворк",     value: "Next.js 14 + React 18" },
            { label: "Хранилище",     value: "localStorage + snapshots.json" },
            { label: "Источники цен", value: "Skinport, Yahoo Finance, Scryfall, TCGdex" },
            { label: "Курсы валют",   value: "open.er-api.com" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-5 py-3">
              <span className="fm text-sm text-[#4E6080]">{label}</span>
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
          <span className="fm text-sm text-[#4E6080]">Настройки</span>
          <div className="ml-auto">
            <Link href="/" className="text-sm text-[#4E6080] hover:text-[#F59E0B] transition-colors">
              ← Назад в портфель
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
                  ДЕМО-РЕЖИМ
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
                    {user?.name ?? profile.name ?? "Без имени"}
                  </p>
                  <p className="fm truncate text-xs text-[#4E6080]">
                    {user?.email ?? profile.email ?? (mode === "demo" ? "Гостевой режим" : "Email не указан")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => void logout()}
                className="mt-3 w-full rounded-lg border border-[#1C2640] py-1.5 text-xs font-medium text-[#4E6080] hover:border-[#3E5070] hover:text-[#B0C4DE] transition-colors"
              >
                Выйти
              </button>
            </div>

            <nav className="space-y-1">
              {SECTIONS.map(({ key, label, icon }) => (
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
