"use client";

import { useState } from "react";

type Plan = "free" | "premium";
type State = "idle" | "loading" | "success" | "error";

export function PreRegisterForm() {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<Plan>("free");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(selectedPlan: Plan) {
    if (!email || !email.includes("@")) {
      setMessage("Please enter a valid email address.");
      setState("error");
      return;
    }

    setPlan(selectedPlan);
    setState("loading");
    setMessage("");

    try {
      if (selectedPlan === "premium") {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to create checkout");
        window.location.href = data.url;
        return;
      }

      const res = await fetch("/api/preregister", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan: "free" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");

      setState("success");
      setMessage("You're on the list! We'll notify you when Vaulty launches.");
    } catch (err: unknown) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (state === "success") {
    return (
      <div className="max-w-md py-4">
        <div className="flex items-center gap-3 text-[#C9A84C]">
          <div className="w-8 h-8 rounded-full border border-[#C9A84C]/40 bg-[#C9A84C]/10 flex items-center justify-center text-sm">
            ✓
          </div>
          <div>
            <div className="fm text-sm font-bold text-[#F0EBE1]" style={{ fontFamily: "var(--font-mono)" }}>
              You&apos;re on the list.
            </div>
            <div className="fm text-[11px] text-[#5A5468] mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>
              {message}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit("free")}
          placeholder="your@email.com"
          className="flex-1 bg-[#0E1830] border border-[#1C2640] focus:border-[#F59E0B]/40 text-[#E8F0FF] placeholder-[#2A3A50] rounded-lg px-4 py-3 text-[11px] outline-none transition-colors"
          style={{ fontFamily: "var(--font-mono)" }}
        />
        <div className="flex gap-2">
          <button
            onClick={() => handleSubmit("free")}
            disabled={state === "loading"}
            className="whitespace-nowrap px-5 py-3 rounded-lg border border-[#1C2640] hover:border-[#3E5070] text-[#3E5070] hover:text-[#E8F0FF] text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-40"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {state === "loading" && plan === "free" ? "…" : "Join free"}
          </button>
          <button
            onClick={() => handleSubmit("premium")}
            disabled={state === "loading"}
            className="whitespace-nowrap px-5 py-3 rounded-lg bg-[#F59E0B] hover:bg-[#FCD34D] text-[#0B1120] text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-40"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {state === "loading" && plan === "premium" ? "…" : "Premium · $5/yr"}
          </button>
        </div>
      </div>

      {state === "error" && (
        <p className="text-[#EF5350] text-[10px] mt-3" style={{ fontFamily: "var(--font-mono)" }}>
          {message}
        </p>
      )}

      <p className="text-[#2E2C3A] text-[10px] mt-4 tracking-wider uppercase" style={{ fontFamily: "var(--font-mono)" }}>
        No spam · No credit card for free plan
      </p>
    </div>
  );
}
