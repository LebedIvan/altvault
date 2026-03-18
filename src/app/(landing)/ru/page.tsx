import { cookies } from "next/headers";
import { nextVariant, isValidVariant } from "@/lib/abtest";
import { LandingPage } from "@/components/landing/LandingPage";
import type { Variant } from "@/lib/i18n";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vaulty — Трекер альтернативных инвестиций",
  description: "Отслеживай LEGO-сеты, карточки Покемон, CS2 скины, золото и ещё 10 классов активов. Бесплатный трекер портфеля с AI-аналитиком.",
};

export default function RuPage({ searchParams }: { searchParams: Record<string, string> }) {
  const cookieStore = cookies();
  const existing = cookieStore.get("ab_variant")?.value;
  const variant: Variant = isValidVariant(existing ?? "") ? (existing as Variant) : nextVariant();
  const utmSrc = searchParams["utm_source"] ?? searchParams["src"] ?? "direct";

  return <LandingPage lang="ru" variant={variant} utmSrc={utmSrc} />;
}
