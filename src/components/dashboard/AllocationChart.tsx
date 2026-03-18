"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCents, ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from "@/lib/formatters";
import type { ClassSummary } from "@/types/portfolio";

interface Props {
  byClass: Record<string, ClassSummary>;
}

export function AllocationChart({ byClass }: Props) {
  const data = Object.entries(byClass).map(([cls, summary]) => ({
    name: ASSET_CLASS_LABELS[cls] ?? cls,
    value: summary.totalCurrentValueCents,
    color: ASSET_CLASS_COLORS[cls] ?? "#64748b",
    allocation: summary.allocation,
  }));

  return (
    <div className="flex flex-col gap-2">
      <h3 className="fm text-xs font-semibold uppercase tracking-wider text-[#4E6080]">
        Allocation
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatCents(value)}
            contentStyle={{
              background: "#0E1830",
              border: "1px solid #1C2640",
              borderRadius: 8,
              color: "#E8F0FF",
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => (
              <span className="text-xs text-[#4E6080]">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
