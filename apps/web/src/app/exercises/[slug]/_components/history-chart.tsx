"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface HistoryChartPoint {
  date: string;
  maxWeight: number;
  est1RM: number | null;
}

export function HistoryChart({ data }: { data: HistoryChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(25% 0.003 90)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "oklch(40% 0.003 90)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "oklch(40% 0.003 90)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          unit=" kg"
        />
        <Tooltip
          contentStyle={{
            background: "oklch(14% 0.005 90)",
            border: "1px solid var(--glass-line)",
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: "oklch(60% 0.002 90)" }}
          itemStyle={{ color: "var(--ink)" }}
        />
        <Line
          type="monotone"
          dataKey="maxWeight"
          stroke="var(--violet)"
          strokeWidth={2}
          dot={{ fill: "var(--violet)", r: 3 }}
          activeDot={{ r: 5 }}
          name="Max kg"
        />
        <Line
          type="monotone"
          dataKey="est1RM"
          stroke="var(--violet-bright)"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls
          name="1RM est."
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
