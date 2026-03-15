import { type ReactNode } from "react";
import { clsx } from "clsx";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  accent?: string;
}

export function StatCard({ label, value, sub, trend, accent }: StatCardProps) {
  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
        ? "text-red-400"
        : "text-slate-400";

  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={clsx(
          "mt-1 text-2xl font-bold tabular-nums",
          accent ?? "text-white",
        )}
      >
        {value}
      </p>
      {sub !== undefined && (
        <p className={clsx("mt-1 text-sm font-medium", trendColor)}>{sub}</p>
      )}
    </Card>
  );
}
