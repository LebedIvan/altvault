import { redirect } from "next/navigation";

// Root "/" is handled by middleware (language detection + ab_variant cookie).
// This component is a fallback that should never be reached in normal flow.
export default function HomePage() {
  redirect("/en");
}
