import { cookies } from "next/headers";
import { nextVariant, isValidVariant } from "@/lib/abtest";
import { LandingPage } from "@/components/landing/LandingPage";
import type { Variant } from "@/lib/i18n";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vaulty — Rastreador de Inversiones Alternativas",
  description: "Rastrea sets de LEGO, cartas Pokémon, skins de CS2, oro y 10 clases de activos más. Rastreador de cartera gratuito con analista IA.",
};

export default function EsPage({ searchParams }: { searchParams: Record<string, string> }) {
  const cookieStore = cookies();
  const existing = cookieStore.get("ab_variant")?.value;
  const variant: Variant = isValidVariant(existing ?? "") ? (existing as Variant) : nextVariant();
  const utmSrc = searchParams["utm_source"] ?? searchParams["src"] ?? "direct";

  return <LandingPage lang="es" variant={variant} utmSrc={utmSrc} />;
}
