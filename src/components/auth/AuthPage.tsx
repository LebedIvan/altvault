"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
type Mode = "login" | "register";

interface Props { mode: Mode }

export function AuthPage({ mode }: Props) {
  const router = useRouter();

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const body = mode === "register"
        ? { name, email, password }
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

          {error && (
            <p className="rounded-lg border border-[#F87171]/20 bg-[#F87171]/10 px-4 py-2.5 fm text-xs text-[#F87171]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
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

        {/* Demo button */}
        <button
          onClick={handleDemo}
          className="fm w-full rounded-lg border border-[#1C2640] bg-[#080F1C] py-2.5 text-sm font-medium text-[#4E6080] transition-colors hover:border-[#3E5070] hover:text-[#E8F0FF]"
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
