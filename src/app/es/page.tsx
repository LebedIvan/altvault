import { cookies, headers } from "next/headers";
import { LandingPage } from "@/components/landing/LandingPage";
import { nextVariant, isValidVariant } from "@/lib/abtest";

export const metadata = {
  title: "Vaulty — Rastrea tus inversiones alternativas",
  description:
    "LEGO, Pokémon, skins de CS2, oro, cartas deportivas — precios en tiempo real, P&L y analista IA en un solo panel.",
};

export default async function EsPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const cookieStore = cookies();
  const headerStore = headers();

  const cookieVariant = cookieStore.get("ab_variant")?.value ?? "";
  const variant = isValidVariant(cookieVariant) ? cookieVariant : nextVariant();

  const utmSrc = searchParams.utm_source ?? headerStore.get("referer") ?? "";

  return <LandingPage lang="es" variant={variant} utmSrc={utmSrc} />;
}
