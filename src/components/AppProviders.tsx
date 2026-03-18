"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/store/authStore";
import { PortfolioProvider } from "@/store/portfolioStore";
import { AutoPriceRefresh } from "@/components/AutoPriceRefresh";

const PUBLIC_PATHS = ["/landing", "/login", "/register", "/verify-email", "/success"];

/**
 * Bridges AuthProvider → PortfolioProvider.
 * Uses React `key` so PortfolioProvider fully remounts when the user changes
 * (login / logout / switch account), loading the correct localStorage partition.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const { mode, storageKey } = useAuth();
  const pathname = usePathname();

  // Public pages render immediately — no auth check needed
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return <>{children}</>;
  }

  // While checking auth, render a blank screen to avoid flash of wrong content
  if (mode === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1117]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-sky-500" />
      </div>
    );
  }

  const isDemo = mode === "demo";

  return (
    <PortfolioProvider key={storageKey} storageKey={storageKey} seedIfEmpty={isDemo}>
      <AutoPriceRefresh />
      {children}
    </PortfolioProvider>
  );
}
