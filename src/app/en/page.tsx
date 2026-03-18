import { cookies, headers } from "next/headers";
import { LandingPage } from "@/components/landing/LandingPage";
import { nextVariant, isValidVariant } from "@/lib/abtest";

export const metadata = {
  title: "Vaulty — Track your alternative investments",
  description:
    "LEGO, Pokémon cards, CS2 skins, gold, sports cards — live prices, P&L analytics and an AI analyst in one dashboard.",
};

export default async function EnPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const cookieStore = cookies();
  const headerStore = headers();

  const cookieVariant = cookieStore.get("ab_variant")?.value ?? "";
  const variant = isValidVariant(cookieVariant) ? cookieVariant : nextVariant();

  const utmSrc = searchParams.utm_source ?? headerStore.get("referer") ?? "";

  return <LandingPage lang="en" variant={variant} utmSrc={utmSrc} />;
}
