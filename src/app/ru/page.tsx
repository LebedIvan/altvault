import { cookies, headers } from "next/headers";
import { LandingPage } from "@/components/landing/LandingPage";
import { nextVariant, isValidVariant } from "@/lib/abtest";

export const metadata = {
  title: "Vaulty — Все альтернативные инвестиции в одном месте",
  description:
    "LEGO, Покемоны, CS2 скины, золото, спортивные карточки — живые цены, P&L аналитика и AI-аналитик в одном дашборде.",
};

export default async function RuPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const cookieStore = cookies();
  const headerStore = headers();

  const cookieVariant = cookieStore.get("ab_variant")?.value ?? "";
  const variant = isValidVariant(cookieVariant) ? cookieVariant : nextVariant();

  const utmSrc = searchParams.utm_source ?? headerStore.get("referer") ?? "";

  return <LandingPage lang="ru" variant={variant} utmSrc={utmSrc} />;
}
