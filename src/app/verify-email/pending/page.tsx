"use client";

import Link from "next/link";
import { useState } from "react";

export default function Page() {
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "Error");
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-[#1C2640] bg-[#080F1C] px-4 py-2.5 text-sm text-[#E8F0FF] placeholder:text-[#2A3A50] focus:border-[#F59E0B]/50 focus:outline-none transition-colors";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B1120] px-4 grid-bg">
      <img src="/logo.png" alt="Vaulty" className="h-12 w-12 rounded-2xl object-cover mb-6" style={{ boxShadow: "0 8px 32px rgba(245,158,11,0.2)" }} />

      <div className="w-full max-w-sm rounded-2xl border border-[#1C2640] bg-[#0E1830] p-8 text-center">
        <div className="text-4xl mb-4">📬</div>
        <h2 className="fb text-lg font-bold text-[#E8F0FF] mb-2">Check your inbox</h2>
        <p className="fm text-sm text-[#4E6080] leading-relaxed mb-2">
          We sent a confirmation link to your email. Click it to activate your account.
        </p>
        <p className="fm text-xs text-[#3E5070] leading-relaxed mb-6">
          Don&apos;t see it? Check your <strong className="text-[#B0C4DE]">Spam</strong> or <strong className="text-[#B0C4DE]">Promotions</strong> folder.
        </p>

        <Link
          href="/login"
          className="fm block w-full rounded-lg border border-[#1C2640] bg-[#080F1C] py-2.5 text-sm font-medium text-[#4E6080] transition-colors hover:border-[#3E5070] hover:text-[#E8F0FF] mb-5"
        >
          Already confirmed → Sign in
        </Link>

        <div className="border-t border-[#1C2640] pt-5">
          <p className="fm text-xs text-[#3E5070] mb-3">Didn&apos;t receive it? Resend:</p>
          {sent ? (
            <p className="fm text-xs text-[#4ADE80]">✓ Sent! Check your inbox (and spam).</p>
          ) : (
            <form onSubmit={resend} className="flex gap-2">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={inputCls}
              />
              <button
                type="submit"
                disabled={loading}
                className="fm shrink-0 rounded-lg bg-[#F59E0B] px-4 py-2 text-xs font-semibold text-[#0B1120] hover:bg-[#FCD34D] disabled:opacity-50 transition-colors"
              >
                {loading ? "..." : "Send"}
              </button>
            </form>
          )}
          {error && <p className="fm text-xs text-[#F87171] mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}
