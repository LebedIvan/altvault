import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata = { title: "Вход — Vaulty" };

export default function Page() {
  const token = cookies().get("vaulty_token")?.value;
  if (token) redirect("/app");
  return <AuthPage mode="login" />;
}
