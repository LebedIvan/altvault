import Link from "next/link";
import { Suspense } from "react";
import { SuccessContent } from "./SuccessContent";

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#0B1120] text-[#E8F0FF] flex flex-col items-center justify-center px-6 grid-bg">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-16">
        <img src="/logo.png" alt="Vaulty" className="h-8 w-8 rounded-lg object-cover" />
        <span className="fb font-bold text-lg">Vaulty</span>
      </div>

      <Suspense
        fallback={
          <div className="fm text-[#4E6080] text-sm animate-pulse">Loading…</div>
        }
      >
        <SuccessContent />
      </Suspense>

      <div className="mt-12 text-center">
        <Link
          href="/"
          className="fm text-sm text-[#3E5070] hover:text-[#F59E0B] transition-colors"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
