"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PRRecord {
  recordType: string;
  achievedAt: string;
  value: number;
}

export const CATEGORIES = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
  "cardio",
  "full_body",
] as const;

export const OPACITY_LEVELS = [1, 0.8, 0.65, 0.5, 0.38, 0.28, 0.2, 0.14] as const;

export function TrendChart({ records }: { records: PRRecord[] }) {
  const id = useId();
  const sorted = [...records]
    .filter((r) => r.recordType === "estimated_1rm")
    .sort((a, b) => new Date(a.achievedAt).getTime() - new Date(b.achievedAt).getTime());

  if (sorted.length < 2) return null;

  const data = sorted.map((r) => ({
    date: new Date(r.achievedAt).toLocaleDateString("th-TH", { month: "short", day: "numeric" }),
    value: Math.round(r.value * 10) / 10,
  }));

  return (
    <div style={{ marginTop: 14 }}>
      <p
        style={{
          fontFamily: "Chakra Petch, monospace",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "var(--ink-soft)",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        e1RM Trend
      </p>
      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--violet)" stopOpacity={0.6} />
              <stop offset="100%" stopColor="var(--violet-bright)" stopOpacity={1} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontFamily: "Chakra Petch, monospace", fontSize: 9, fill: "var(--ink-faint)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontFamily: "Chakra Petch, monospace", fontSize: 9, fill: "var(--ink-faint)" }}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-line)",
              borderRadius: 10,
              fontFamily: "K2D, sans-serif",
              fontSize: 12,
              color: "var(--ink)",
            }}
            formatter={(v: number) => [`${v} kg`, "e1RM"]}
            labelStyle={{ color: "var(--ink-soft)" }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={`url(#${id}-line)`}
            strokeWidth={2}
            dot={{ fill: "var(--violet-bright)", strokeWidth: 0, r: 3 }}
            activeDot={{ fill: "var(--violet-bright)", r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeeklyVolumeChart({ data }: { data: { week: string; volume: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-line)" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fill: "var(--ink-soft)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fill: "var(--ink-soft)", fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-line)",
            borderRadius: "8px",
            fontSize: 12,
          }}
          itemStyle={{ color: "var(--ink)", fontFamily: "K2D, sans-serif" }}
          labelStyle={{ color: "var(--ink-soft)" }}
        />
        <Bar dataKey="volume" fill="var(--violet)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MuscleVolumeChart({
  data,
}: {
  data: Array<{ week: string } & Record<string, number | string>>;
}) {
  const tEx = useTranslations("exercises");
  return (
    <>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-line)" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fill: "var(--ink-soft)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--ink-soft)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-2)",
              border: "1px solid var(--glass-line)",
              borderRadius: "8px",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--ink-soft)" }}
          />
          {CATEGORIES.map((cat, i) =>
            i === CATEGORIES.length - 1 ? (
              <Bar
                key={cat}
                dataKey={cat}
                stackId="muscle"
                fill={`rgba(255,255,255,${OPACITY_LEVELS[i] ?? 0.1})`}
                radius={[3, 3, 0, 0]}
              />
            ) : (
              <Bar
                key={cat}
                dataKey={cat}
                stackId="muscle"
                fill={`rgba(255,255,255,${OPACITY_LEVELS[i] ?? 0.1})`}
              />
            ),
          )}
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
        {CATEGORIES.map((cat, i) => (
          <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: `rgba(255,255,255,${OPACITY_LEVELS[i] ?? 0.1})`,
              }}
            />
            <span
              style={{
                fontFamily: "K2D, sans-serif",
                fontSize: 11,
                color: "var(--ink-soft)",
              }}
            >
              {tEx(
                `muscles.${cat === "full_body" ? "fullBody" : cat}` as Parameters<typeof tEx>[0],
              )}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
