"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";
type Mode = "login" | "register";

interface Props { mode: Mode }

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function AuthPage({ mode }: Props) {
  const router = useRouter();

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  // Anti-bot: track page-load time, honeypot, and Turnstile token
  const loadedAt  = useRef(Date.now());
  const [honeypot, setHoneypot] = useState("");
  const [cfToken, setCfToken]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const body = mode === "register"
        ? { name, email, password, _hp: honeypot, _t: loadedAt.current, _cf: cfToken }
        : { email, password };

      const res  = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Ошибка");
        return;
      }

      const result = data as { error?: string; requiresVerification?: boolean };
      if (result.requiresVerification) {
        router.push("/verify-email/pending");
        return;
      }

      window.location.href = "/app";
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo() {
    document.cookie = "vaulty_demo=1; path=/; max-age=86400";
    window.location.href = "/app";
  }

  const inputCls = "w-full rounded-lg border border-[#1C2640] bg-[#080F1C] px-4 py-2.5 text-sm text-[#E8F0FF] placeholder:text-[#2A3A50] focus:border-[#F59E0B]/50 focus:outline-none transition-colors";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B1120] px-4 grid-bg">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <img src="/logo.png" alt="Vaulty" className="h-12 w-12 rounded-2xl object-cover" style={{ boxShadow: "0 8px 32px rgba(245,158,11,0.2)" }} />
        <div className="text-center">
          <h1 className="fb text-xl font-bold text-[#E8F0FF]">Vaulty</h1>
          <p className="fm text-xs text-[#4E6080] mt-0.5 uppercase tracking-widest">Alternative Investments</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-[#1C2640] bg-[#0E1830] p-8">
        <h2 className="fb mb-6 text-lg font-bold text-[#E8F0FF]">
          {mode === "login" ? "Вход в аккаунт" : "Создать аккаунт"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot — hidden from humans, bots fill this field */}
          <input
            aria-hidden="true"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, height: 0, width: 0, pointerEvents: "none" }}
          />
          {mode === "register" && (
            <div>
              <label className="fm mb-1.5 block text-xs text-[#4E6080] uppercase tracking-wider">Имя</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
                className={inputCls}
              />
            </div>
          )}

          <div>
            <label className="fm mb-1.5 block text-xs text-[#4E6080] uppercase tracking-wider">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
            />
          </div>

          <div>
            <label className="fm mb-1.5 block text-xs text-[#4E6080] uppercase tracking-wider">Пароль</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "Минимум 6 символов" : "••••••••"}
              className={inputCls}
            />
          </div>

          {mode === "login" && (
            <div className="text-right -mt-2">
              <Link href="/forgot-password" className="fm text-xs text-[#4E6080] hover:text-[#F59E0B] transition-colors">
                Forgot password?
              </Link>
            </div>
          )}

          {mode === "register" && TURNSTILE_SITE_KEY && (
            <Turnstile
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={(token) => setCfToken(token)}
              onExpire={() => setCfToken("")}
              options={{ theme: "dark", size: "normal" }}
            />
          )}

          {error && (
            <p className="rounded-lg border border-[#F87171]/20 bg-[#F87171]/10 px-4 py-2.5 fm text-xs text-[#F87171]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || (mode === "register" && !!TURNSTILE_SITE_KEY && !cfToken)}
            className="fm w-full rounded-lg bg-[#F59E0B] py-2.5 text-sm font-semibold text-[#0B1120] transition-colors hover:bg-[#FCD34D] disabled:opacity-50 uppercase tracking-wider"
          >
            {loading
              ? "..."
              : mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#1C2640]" />
          <span className="fm text-xs text-[#2A3A50]">или</span>
          <div className="h-px flex-1 bg-[#1C2640]" />
        </div>

        {/* Google OAuth */}
        <a
          href="/api/auth/google"
          className="fm flex w-full items-center justify-center gap-3 rounded-lg border border-[#1C2640] bg-[#080F1C] py-2.5 text-sm font-medium text-[#E8F0FF] transition-colors hover:border-[#3E5070] hover:bg-[#0E1830]"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
            <path d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h13.2c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.3-10.6 7.3-17.4z" fill="#4285F4"/>
            <path d="M24 48c6.5 0 12-2.1 16-5.8l-7.9-6c-2.2 1.5-5 2.3-8.1 2.3-6.2 0-11.5-4.2-13.4-9.9H2.5v6.2C6.5 42.6 14.7 48 24 48z" fill="#34A853"/>
            <path d="M10.6 28.6A14.7 14.7 0 0 1 10.6 19.4v-6.2H2.5a23.9 23.9 0 0 0 0 21.6l8.1-6.2z" fill="#FBBC04"/>
            <path d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.9 2.4 30.4 0 24 0 14.7 0 6.5 5.4 2.5 13.2l8.1 6.2C12.5 13.7 17.8 9.5 24 9.5z" fill="#EA4335"/>
          </svg>
          {mode === "login" ? "Войти через Google" : "Зарегистрироваться через Google"}
        </a>

        {/* Demo button */}
        <button
          onClick={handleDemo}
          className="fm mt-3 w-full rounded-lg border border-[#1C2640] bg-[#080F1C] py-2.5 text-sm font-medium text-[#4E6080] transition-colors hover:border-[#3E5070] hover:text-[#E8F0FF]"
        >
          Попробовать демо
        </button>

        {/* Switch mode */}
        <p className="fm mt-5 text-center text-xs text-[#3E5070]">
          {mode === "login" ? (
            <>Нет аккаунта?{" "}
              <Link href="/register" className="text-[#F59E0B] hover:text-[#FCD34D] transition-colors">
                Зарегистрироваться
              </Link>
            </>
          ) : (
            <>Уже есть аккаунт?{" "}
              <Link href="/login" className="text-[#F59E0B] hover:text-[#FCD34D] transition-colors">
                Войти
              </Link>
            </>
          )}
        </p>
      </div>

      {/* Demo disclaimer */}
      <p className="fm mt-6 max-w-xs text-center text-xs text-[#2A3A50]">
        Демо-режим использует случайные данные и хранится только в браузере.
        Для сохранения реального портфеля создайте аккаунт.
      </p>
    </div>
  );
}
