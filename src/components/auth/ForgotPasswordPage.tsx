"use client";

import { useState } from "react";
import Link from "next/link";

export function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputCls = "w-full rounded-lg border border-[#1C2640] bg-[#080F1C] px-4 py-2.5 text-sm text-[#E8F0FF] placeholder:text-[#2A3A50] focus:border-[#F59E0B]/50 focus:outline-none transition-colors";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "Server error");
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B1120] px-4 grid-bg">
      <div className="mb-8 flex flex-col items-center gap-3">
        <img src="/logo.png" alt="Vaulty" className="h-12 w-12 rounded-2xl object-cover" style={{ boxShadow: "0 8px 32px rgba(245,158,11,0.2)" }} />
        <div className="text-center">
          <h1 className="fb text-xl font-bold text-[#E8F0FF]">Vaulty</h1>
          <p className="fm text-xs text-[#4E6080] mt-0.5 uppercase tracking-widest">Alternative Investments</p>
        </div>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-[#1C2640] bg-[#0E1830] p-8">
        {sent ? (
          <div className="text-center">
            <div className="mb-4 text-4xl">📧</div>
            <h2 className="fb mb-2 text-lg font-bold text-[#E8F0FF]">Check your inbox</h2>
            <p className="fm text-sm text-[#4E6080] leading-relaxed">
              If an account exists for <strong className="text-[#B0C4DE]">{email}</strong>,
              you&apos;ll receive a password reset link shortly.
            </p>
            <Link
              href="/login"
              className="fm mt-6 inline-block text-xs text-[#F59E0B] hover:text-[#FCD34D] transition-colors"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="fb mb-2 text-lg font-bold text-[#E8F0FF]">Forgot password?</h2>
            <p className="fm mb-6 text-xs text-[#4E6080]">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                {loading ? "..." : "Send reset link"}
              </button>
            </form>

            <p className="fm mt-5 text-center text-xs text-[#3E5070]">
              Remember it?{" "}
              <Link href="/login" className="text-[#F59E0B] hover:text-[#FCD34D] transition-colors">
                Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
