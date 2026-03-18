import { TerminalDashboard } from "@/components/terminal/TerminalDashboard";

export const metadata = {
  title: "Vaulty Terminal — Market Intelligence",
  description: "Bloomberg-style terminal for alternative investments: news, indices, screener, heatmap.",
};

export default function TerminalPage() {
  return <TerminalDashboard />;
}
