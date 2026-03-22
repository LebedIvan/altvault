"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get("token") ?? "";

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!token) setError("Invalid or missing reset token.");
  }, [token]);

  const inputCls = "w-full rounded-lg border border-[#1C2640] bg-[#080F1C] px-4 py-2.5 text-sm text-[#E8F0FF] placeholder:text-[#2A3A50] focus:border-[#F59E0B]/50 focus:outline-none transition-colors";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Server error"); return; }
      setDone(true);
      setTimeout(() => router.push("/login"), 3000);
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
        {done ? (
          <div className="text-center">
            <div className="mb-4 text-4xl">✅</div>
            <h2 className="fb mb-2 text-lg font-bold text-[#E8F0FF]">Password updated!</h2>
            <p className="fm text-sm text-[#4E6080]">Redirecting you to login…</p>
          </div>
        ) : (
          <>
            <h2 className="fb mb-2 text-lg font-bold text-[#E8F0FF]">Set new password</h2>
            <p className="fm mb-6 text-xs text-[#4E6080]">Choose a strong password for your Vaulty account.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="fm mb-1.5 block text-xs text-[#4E6080] uppercase tracking-wider">New password</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="fm mb-1.5 block text-xs text-[#4E6080] uppercase tracking-wider">Confirm password</label>
                <input
                  required
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
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
                disabled={loading || !token}
                className="fm w-full rounded-lg bg-[#F59E0B] py-2.5 text-sm font-semibold text-[#0B1120] transition-colors hover:bg-[#FCD34D] disabled:opacity-50 uppercase tracking-wider"
              >
                {loading ? "..." : "Update password"}
              </button>
            </form>

            <p className="fm mt-5 text-center text-xs text-[#3E5070]">
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
