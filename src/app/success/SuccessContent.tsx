"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export function SuccessContent() {
  const params = useSearchParams();
  const plan = params.get("plan");
  const isPremium = plan === "premium";

  return (
    <div className="max-w-md w-full text-center">
      {/* Icon */}
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-8 ${
          isPremium
            ? "bg-sky-500/15 border-2 border-sky-500/40"
            : "bg-emerald-500/15 border-2 border-emerald-500/40"
        }`}
      >
        {isPremium ? "⚡" : "✓"}
      </div>

      <h1 className="text-3xl font-extrabold mb-3">
        {isPremium ? "You're in — welcome to Premium!" : "You're on the list!"}
      </h1>

      <p className="text-slate-400 text-lg leading-relaxed mb-8">
        {isPremium ? (
          <>
            Your <span className="text-sky-400 font-semibold">1-year Premium</span> subscription
            is confirmed. We&apos;ll activate it the moment Vaulty launches publicly — and send
            you an email with everything you need to get started.
          </>
        ) : (
          <>
            We&apos;ll notify you the moment Vaulty launches. Check your inbox for a confirmation
            email.
          </>
        )}
      </p>

      {isPremium && (
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-5 mb-8 text-left">
          <p className="text-sky-400 text-sm font-semibold mb-3">What&apos;s included in Premium</p>
          <ul className="space-y-2 text-sm text-slate-300">
            {[
              "AI portfolio analyst — unlimited queries",
              "Advanced analytics & health score",
              "Price snapshots & trend history",
              "Priority support",
              "Early-bird rate locked in forever",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-sky-400">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href="/"
        className="inline-block bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-6 py-3 rounded-xl text-sm font-medium transition-colors"
      >
        Back to home
      </Link>
    </div>
  );
}
