import { cookies } from "next/headers";
import { nextVariant, isValidVariant } from "@/lib/abtest";
import { LandingPage } from "@/components/landing/LandingPage";
import type { Variant } from "@/lib/i18n";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vaulty — Alternative Investment Portfolio Tracker",
  description: "Track LEGO sets, Pokémon cards, CS2 skins, gold and 10 more asset classes. Free portfolio tracker with AI analyst.",
};

export default function EnPage({ searchParams }: { searchParams: Record<string, string> }) {
  const cookieStore = cookies();
  const existing = cookieStore.get("ab_variant")?.value;
  const variant: Variant = isValidVariant(existing ?? "") ? (existing as Variant) : nextVariant();
  const utmSrc = searchParams["utm_source"] ?? searchParams["src"] ?? "direct";

  return <LandingPage lang="en" variant={variant} utmSrc={utmSrc} />;
}
