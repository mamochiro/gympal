"use client";

import { PRCelebrationOverlay } from "@/app/workout/[id]/components/pr-celebration-overlay";
import { FlameIcon } from "@/components/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";

// Charts dynamically imported to defer the ~100 KB recharts bundle off the
// /progress route's First Load JS. ssr:false because Recharts uses browser-only
// SVG measurement; the page renders fine without these blocks until the JS
// arrives.
const TrendChart = dynamic(
  () => import("./_components/progress-charts").then((m) => m.TrendChart),
  {
    ssr: false,
  },
);
const WeeklyVolumeChart = dynamic(
  () => import("./_components/progress-charts").then((m) => m.WeeklyVolumeChart),
  { ssr: false },
);
const MuscleVolumeChart = dynamic(
  () => import("./_components/progress-charts").then((m) => m.MuscleVolumeChart),
  { ssr: false },
);

const CATEGORIES = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
  "cardio",
  "full_body",
] as const;

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Summary {
  totalWorkouts: number;
  totalVolume: number;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null;
}

interface PRRecord {
  recordType: string;
  value: number;
  achievedAt: string;
}

interface PRGroup {
  exerciseId: string;
  slug: string;
  nameEn: string;
  nameTh: string;
  records: PRRecord[];
}

interface HeatmapEntry {
  date: string;
  count: number;
}

interface WeeklyEntry {
  weekStart: string;
  totalVolume: number;
  byCategory: Record<string, number>;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProgressSkeleton() {
  return (
    <div style={{ padding: "24px 24px 0", display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          height: 130,
          borderRadius: 20,
          background: "rgba(255,255,255,0.04)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          height: 80,
          borderRadius: 20,
          background: "rgba(255,255,255,0.04)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          height: 80,
          borderRadius: 20,
          background: "rgba(255,255,255,0.04)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          height: 80,
          borderRadius: 20,
          background: "rgba(255,255,255,0.04)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          height: 120,
          borderRadius: 20,
          background: "rgba(255,255,255,0.04)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          height: 200,
          borderRadius: 20,
          background: "rgba(255,255,255,0.04)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
    </div>
  );
}

// ─── HeatmapGrid ──────────────────────────────────────────────────────────────

function HeatmapGrid({ cells }: { cells: Array<{ date: string; count: number }> }) {
  const weeks: Array<Array<{ date: string; count: number }>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const monthLabels: Array<{ col: number; label: string }> = [];
  let lastMonth = -1;
  weeks.forEach((week, col) => {
    const firstDay = week[0];
    if (firstDay?.date) {
      const month = new Date(firstDay.date).getMonth();
      if (month !== lastMonth) {
        monthLabels.push({
          col,
          label: new Date(firstDay.date).toLocaleDateString("th-TH", { month: "short" }),
        });
        lastMonth = month;
      }
    }
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: `${weeks.length * 13 + 28}px` }}>
        {/* Month labels */}
        <div style={{ display: "flex", marginBottom: 4, marginLeft: 32 }}>
          {weeks.map((_, col) => {
            const label = monthLabels.find((m) => m.col === col);
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: static positional grid
              <div key={col} style={{ width: 14, flexShrink: 0 }}>
                {label && (
                  <span
                    style={{ fontFamily: "K2D, sans-serif", fontSize: 9, color: "var(--ink-soft)" }}
                  >
                    {label.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {/* Day-of-week labels */}
          <div style={{ display: "flex", flexDirection: "column", marginRight: 4, gap: 2 }}>
            {["M", "", "W", "", "F", "", ""].map((d, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static day labels
              <div key={i} style={{ width: 24, height: 11 }}>
                <span
                  style={{ fontFamily: "K2D, sans-serif", fontSize: 9, color: "var(--ink-soft)" }}
                >
                  {d}
                </span>
              </div>
            ))}
          </div>
          {/* Weeks columns */}
          <div style={{ display: "flex", gap: 2 }}>
            {weeks.map((week, col) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static positional grid
              <div key={col} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {Array.from({ length: 7 }).map((_, row) => {
                  const cell = week[row];
                  const count = cell?.count ?? 0;
                  const isFuture = count === -1;
                  const cellKey = cell?.date ?? `${col}-${row}`;
                  return (
                    <div
                      key={cellKey}
                      title={!isFuture && cell ? `${cell.date}: ${count}` : ""}
                      className="heatmap-cell"
                      style={
                        isFuture
                          ? { opacity: 0 }
                          : count === 0
                            ? undefined
                            : count === 1
                              ? {
                                  background: "rgba(140,100,255,0.25)",
                                  border: "1px solid rgba(140,100,255,0.3)",
                                }
                              : count === 2
                                ? {
                                    background: "rgba(140,100,255,0.5)",
                                    border: "1px solid var(--violet-edge)",
                                  }
                                : count >= 3
                                  ? {
                                      background: "var(--violet)",
                                      border: "1px solid var(--violet-edge)",
                                      boxShadow: "0 0 6px var(--violet-glow)",
                                    }
                                  : undefined
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values }: { values: number[] }) {
  const gradId = useId();
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 72;
  const h = 28;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 4) - 2,
  }));
  const lineStr = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const fillStr = `${lineStr} ${w},${h} 0,${h}`;
  const last = pts[pts.length - 1];
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--violet)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--violet)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillStr} fill={`url(#${gradId})`} />
      <polyline
        points={lineStr}
        fill="none"
        stroke="var(--violet)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {last && (
        <circle
          cx={last.x}
          cy={last.y}
          r={3}
          fill="var(--violet)"
          style={{ filter: "drop-shadow(0 0 4px var(--violet))" }}
        />
      )}
    </svg>
  );
}

// ─── PRCard ───────────────────────────────────────────────────────────────────

function PRCard({ group }: { group: PRGroup }) {
  const [showTrend, setShowTrend] = useState(false);
  const maxW = group.records.find((r) => r.recordType === "max_weight");
  const est1rm = group.records.find((r) => r.recordType === "estimated_1rm");
  const sparkValues = group.records
    .filter((r) => r.recordType === "max_weight")
    .map((r) => r.value);
  const trendPoints = group.records.filter((r) => r.recordType === "estimated_1rm");

  return (
    <div key={group.exerciseId} className="glass" style={{ padding: "16px 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <span className="t-label" style={{ display: "block", marginBottom: 6 }}>
            {group.nameTh}
          </span>
          {maxW && (
            <span className="t-num" style={{ fontSize: 36, color: "var(--ink)" }}>
              {maxW.value.toFixed(1)}
              <span
                style={{
                  fontFamily: "K2D, sans-serif",
                  fontSize: 14,
                  color: "var(--ink-mute)",
                  marginLeft: 4,
                }}
              >
                kg
              </span>
            </span>
          )}
          {est1rm && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <p
                style={{
                  fontFamily: "K2D, sans-serif",
                  fontSize: 12,
                  color: "var(--ink-soft)",
                }}
              >
                e1RM{" "}
                <span className="t-num" style={{ fontSize: 13, color: "var(--ink-mute)" }}>
                  {est1rm.value.toFixed(1)}
                </span>{" "}
                kg
              </p>
              {trendPoints.length >= 2 && (
                <button
                  type="button"
                  onClick={() => setShowTrend((v) => !v)}
                  style={{
                    fontFamily: "Chakra Petch, monospace",
                    fontSize: 9,
                    letterSpacing: "0.08em",
                    color: showTrend ? "var(--violet-bright)" : "var(--ink-faint)",
                    background: "none",
                    border: "1px solid var(--glass-line)",
                    borderRadius: 6,
                    padding: "0 12px",
                    cursor: "pointer",
                    transition: "color 0.15s",
                    minHeight: 44,
                    minWidth: 44,
                  }}
                >
                  TREND
                </button>
              )}
            </div>
          )}
        </div>
        <Sparkline values={sparkValues} />
      </div>
      {showTrend && <TrendChart records={group.records} />}
    </div>
  );
}

// ─── RecordsTab ───────────────────────────────────────────────────────────────

function RecordsTab({
  summary,
  prs,
  isLoading,
}: {
  summary: Summary | undefined;
  prs: PRGroup[] | undefined;
  isLoading: boolean;
}) {
  const t = useTranslations("progress");
  const [celebration, setCelebration] = useState<{
    exerciseName: string;
    value: number;
    type: string;
  } | null>(null);

  // Show confetti for PRs achieved in the last 5 minutes
  const freshPR = prs
    ?.flatMap((g) =>
      g.records
        .filter((r) => Date.now() - new Date(r.achievedAt).getTime() < 5 * 60 * 1000)
        .map((r) => ({ exerciseName: g.nameTh, value: r.value, type: r.recordType })),
    )
    .at(0);

  if (isLoading) return <ProgressSkeleton />;

  return (
    <div style={{ padding: "20px 24px 0", display: "flex", flexDirection: "column", gap: 16 }}>
      {(() => {
        const active = celebration ?? freshPR;
        if (!active || celebration?.exerciseName.startsWith("__dismissed")) return null;
        return (
          <PRCelebrationOverlay
            exerciseName={active.exerciseName}
            value={active.value}
            type={active.type}
            onDismiss={() => setCelebration({ exerciseName: "__dismissed", value: 0, type: "" })}
          />
        );
      })()}

      {/* Streak card */}
      <div className="glass glass-glow" style={{ padding: "20px 22px 18px" }}>
        <div
          style={{
            position: "absolute",
            right: -14,
            bottom: -14,
            opacity: 0.08,
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          <FlameIcon size={96} />
        </div>
        <span className="t-label">{t("streak")}</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "4px 0 8px" }}>
          <span className="t-num" style={{ fontSize: 96, lineHeight: 1, color: "var(--ink)" }}>
            {summary?.currentStreak ?? 0}
          </span>
          <span
            style={{
              fontFamily: "K2D, sans-serif",
              fontSize: 14,
              color: "var(--ink-mute)",
              marginBottom: 10,
            }}
          >
            {t("streakUnit")}
          </span>
        </div>
        <p style={{ fontFamily: "K2D, sans-serif", fontSize: 13, color: "var(--ink-soft)" }}>
          {t("longestStreak")}{" "}
          <span className="t-num" style={{ fontSize: 14, color: "var(--ink-mute)" }}>
            {summary?.longestStreak ?? 0}
          </span>{" "}
          {t("streakUnit")}
        </p>
      </div>

      {/* PR cards */}
      {prs && prs.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="t-label" style={{ paddingLeft: 2 }}>
            {t("pr.maxWeight")}
          </span>
          {prs.map((group) => (
            <PRCard key={group.exerciseId} group={group} />
          ))}
        </div>
      ) : (
        !isLoading && (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <p style={{ fontFamily: "K2D, sans-serif", fontSize: 15, color: "var(--ink-mute)" }}>
              {t("noPRs")}
            </p>
          </div>
        )
      )}
    </div>
  );
}

// ─── TrendsTab ────────────────────────────────────────────────────────────────

function TrendsTab({
  summary,
  weekly,
  heatmap,
  isLoading,
}: {
  summary: Summary | undefined;
  weekly: WeeklyEntry[] | undefined;
  heatmap: HeatmapEntry[] | undefined;
  isLoading: boolean;
}) {
  const t = useTranslations("progress");

  if (isLoading) return <ProgressSkeleton />;

  const avgPerWeek =
    summary && weekly && weekly.length > 0
      ? (summary.totalWorkouts / Math.max(weekly.length, 1)).toFixed(1)
      : "0";

  const weeklyChartData = (weekly ?? []).map((w) => ({
    week: new Date(w.weekStart).toLocaleDateString("th-TH", { month: "short", day: "numeric" }),
    volume: Math.round(w.totalVolume),
  }));

  const muscleChartData = (weekly ?? []).map((w) => ({
    week: new Date(w.weekStart).toLocaleDateString("th-TH", { month: "short", day: "numeric" }),
    ...Object.fromEntries(CATEGORIES.map((cat) => [cat, Math.round(w.byCategory[cat] ?? 0)])),
  }));

  const heatmapMap = new Map((heatmap ?? []).map((h) => [h.date, h.count]));
  const today = new Date();

  // Align to ISO Monday-start weeks (Thai convention)
  const todayDow = today.getDay(); // 0=Sun … 6=Sat
  const daysFromMonday = todayDow === 0 ? 6 : todayDow - 1;
  // Monday of the current week
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysFromMonday);
  // Monday 52 weeks ago (start of the 52-week window)
  const startDate = new Date(thisMonday);
  startDate.setDate(thisMonday.getDate() - 51 * 7);

  const heatmapCells: Array<{ date: string; count: number }> = [];
  const cur = new Date(startDate);
  while (cur <= today) {
    const dateStr = cur.toISOString().split("T")[0] ?? "";
    heatmapCells.push({ date: dateStr, count: heatmapMap.get(dateStr) ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  // Pad remaining days of the current week so columns are always 7 rows
  const padCount = todayDow === 0 ? 0 : 7 - todayDow;
  for (let i = 0; i < padCount; i++) {
    heatmapCells.push({ date: "", count: -1 });
  }

  const statChips = [
    { label: t("totalWorkouts"), value: String(summary?.totalWorkouts ?? 0) },
    {
      label: t("totalVolume"),
      value: summary
        ? `${new Intl.NumberFormat("th-TH").format(Math.round(summary.totalVolume))} กก.`
        : "—",
    },
    { label: t("streak"), value: `${summary?.currentStreak ?? 0} ${t("streakUnit")}` },
    { label: t("avgPerWeek"), value: `${avgPerWeek} ${t("totalWorkouts")}` },
  ];

  return (
    <div style={{ padding: "20px 24px 32px", display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Stats 2×2 grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {statChips.map(({ label, value }) => (
          <div key={label} className="glass" style={{ padding: "14px 16px" }}>
            <p style={{ fontFamily: "K2D, sans-serif", fontSize: 12, color: "var(--ink-soft)" }}>
              {label}
            </p>
            <p className="t-num" style={{ fontSize: 20, color: "var(--ink)", marginTop: 2 }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Weekly volume bar chart */}
      <div>
        <span className="t-label" style={{ display: "block", marginBottom: 16 }}>
          {t("weeklyVolume")}
        </span>
        {weeklyChartData.length < 2 ? (
          <p style={{ fontFamily: "K2D, sans-serif", fontSize: 14, color: "var(--ink-mute)" }}>
            {t("noData")}
          </p>
        ) : (
          <WeeklyVolumeChart data={weeklyChartData} />
        )}
      </div>

      {/* Muscle group stacked bar */}
      <div>
        <span className="t-label" style={{ display: "block", marginBottom: 16 }}>
          {t("muscleVolume")}
        </span>
        {muscleChartData.length < 2 ? (
          <p style={{ fontFamily: "K2D, sans-serif", fontSize: 14, color: "var(--ink-mute)" }}>
            {t("noData")}
          </p>
        ) : (
          <MuscleVolumeChart data={muscleChartData} />
        )}
      </div>

      {/* 52-week heatmap */}
      <div>
        <span className="t-label" style={{ display: "block", marginBottom: 12 }}>
          {t("heatmap")}
        </span>
        <HeatmapGrid cells={heatmapCells} />
      </div>
    </div>
  );
}

// ─── ProgressPage (default export) ───────────────────────────────────────────

export default function ProgressPage() {
  const t = useTranslations("progress");
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") ?? "records") as "records" | "trends";

  const setTab = (next: "records" | "trends") => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", next);
    router.replace(`?${p.toString()}`);
  };

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["progress-summary"],
    queryFn: () =>
      fetch("/api/progress/summary")
        .then((r) => r.json())
        .then((r: { data: Summary }) => r.data),
  });

  const { data: prsData, isLoading: prsLoading } = useQuery({
    queryKey: ["progress-prs"],
    queryFn: () =>
      fetch("/api/progress/prs")
        .then((r) => r.json())
        .then((r: { data: PRGroup[] }) => r.data),
  });

  const { data: heatmapData } = useQuery({
    queryKey: ["progress-heatmap"],
    queryFn: () =>
      fetch("/api/progress/heatmap")
        .then((r) => r.json())
        .then((r: { data: HeatmapEntry[] }) => r.data),
    enabled: tab === "trends",
  });

  const { data: weeklyData } = useQuery({
    queryKey: ["progress-weekly"],
    queryFn: () =>
      fetch("/api/progress/weekly")
        .then((r) => r.json())
        .then((r: { data: WeeklyEntry[] }) => r.data),
    enabled: tab === "trends",
  });

  return (
    <div className="saifit-bg" style={{ minHeight: "100vh", paddingBottom: 110 }}>
      {/* Header */}
      <div style={{ padding: "40px 24px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span className="t-label">{t("pageLabel")}</span>
            <h1
              style={{
                fontFamily: "K2D, sans-serif",
                fontWeight: 700,
                fontSize: 26,
                color: "var(--ink)",
                letterSpacing: "-0.01em",
                lineHeight: 1.3,
                margin: "6px 0 20px",
              }}
            >
              {t("title")}
            </h1>
          </div>
          <Link
            href="/settings"
            aria-label="ตั้งค่า"
            style={{
              marginTop: 36,
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--glass-line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ink-mute)",
              flexShrink: 0,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={17}
              height={17}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
        </div>

        {/* Glass segmented control */}
        <div
          role="tablist"
          className="glass"
          style={{
            display: "flex",
            padding: 4,
            gap: 4,
            borderRadius: 14,
          }}
        >
          {(["records", "trends"] as const).map((tabKey) => (
            <button
              key={tabKey}
              type="button"
              role="tab"
              aria-selected={tab === tabKey}
              onClick={() => setTab(tabKey)}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 10,
                fontFamily: "K2D, sans-serif",
                fontWeight: 600,
                fontSize: 13,
                border: 0,
                cursor: "pointer",
                transition: "background 0.15s, color 0.15s",
                background: tab === tabKey ? "rgba(140,100,255,0.18)" : "transparent",
                color: tab === tabKey ? "var(--ink)" : "var(--ink-soft)",
                boxShadow:
                  tab === tabKey
                    ? "0 0 0 1px var(--violet-edge), inset 0 1px 0 rgba(255,255,255,0.08)"
                    : "none",
              }}
            >
              {t(`tabs.${tabKey}` as "tabs.records" | "tabs.trends")}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === "records" ? (
        <RecordsTab summary={summaryData} prs={prsData} isLoading={summaryLoading || prsLoading} />
      ) : (
        <TrendsTab
          summary={summaryData}
          weekly={weeklyData}
          heatmap={heatmapData}
          isLoading={summaryLoading}
        />
      )}
    </div>
  );
}
