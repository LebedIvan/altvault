import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { CurrencyProvider } from "@/store/currencyStore";
import { UserProvider } from "@/store/userStore";
import { AuthProvider } from "@/store/authStore";
import { AppProviders } from "@/components/AppProviders";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-bricolage",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Vaulty — Alternative Investments Dashboard",
  description:
    "Track and analyze alternative asset classes: trading cards, LEGO, CS2 skins, music royalties, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${bricolage.variable} ${mono.variable} fb`}>
        <CurrencyProvider>
          <AuthProvider>
            <UserProvider>
              <AppProviders>
                {children}
              </AppProviders>
            </UserProvider>
          </AuthProvider>
        </CurrencyProvider>
        <Analytics />
      </body>
    </html>
  );
}
