import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PortfolioProvider } from "@/store/portfolioStore";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AltVault — Alternative Investments Dashboard",
  description:
    "Track and analyze alternative asset classes: trading cards, LEGO, CS2 skins, music royalties, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <PortfolioProvider>{children}</PortfolioProvider>
        <Analytics />
      </body>
    </html>
  );
}
