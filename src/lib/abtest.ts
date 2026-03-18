import type { Variant } from "./i18n";

const VARIANTS: Variant[] = ["a", "b", "c"];

/** Assign a random variant (serverless-safe — no file I/O) */
export function nextVariant(): Variant {
  return VARIANTS[Math.floor(Math.random() * VARIANTS.length)]!;
}

export function isValidVariant(v: string): v is Variant {
  return VARIANTS.includes(v as Variant);
}
