"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { use } from "react";

interface WorkoutSet {
  id: string;
  reps: number;
  weightKg: string | null;
  exerciseId: string;
  exercise: { nameTh: string; nameEn: string } | null;
}

interface PrAchieved {
  exerciseName: string;
  recordType: string;
  value: string;
}

interface WorkoutData {
  id: string;
  name: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  sets: WorkoutSet[];
  prsAchieved?: PrAchieved[];
  currentStreak?: number;
}

interface MeData {
  displayName: string;
  locale?: "th" | "en";
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}` : `${m}min`;
}

function computeVolume(sets: WorkoutSet[]): number {
  return Math.round(
    sets.reduce((acc, s) => acc + s.reps * Number.parseFloat(s.weightKg ?? "0"), 0),
  );
}

function uniqueExercises(sets: WorkoutSet[]): number {
  return new Set(sets.map((s) => s.exerciseId)).size;
}

function groupByExercise(sets: WorkoutSet[]) {
  const order: string[] = [];
  const map = new Map<string, { name: string; sets: WorkoutSet[] }>();
  for (const s of sets) {
    if (!map.has(s.exerciseId)) {
      order.push(s.exerciseId);
      map.set(s.exerciseId, {
        name: s.exercise?.nameTh || s.exercise?.nameEn || "—",
        sets: [],
      });
    }
    map.get(s.exerciseId)?.sets.push(s);
  }
  return order.flatMap((id) => {
    const entry = map.get(id);
    return entry ? [entry] : [];
  });
}

export default function WorkoutSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("workout");

  const { data: workout, isLoading: workoutLoading } = useQuery<WorkoutData>({
    queryKey: ["workout", id],
    queryFn: () =>
      fetch(`/api/workouts/${id}`)
        .then((r) => r.json())
        .then((d) => d.data),
    staleTime: 60_000,
  });

  const { data: me } = useQuery<MeData>({
    queryKey: ["me"],
    queryFn: () => fetch("/api/me").then((r) => r.json()),
    staleTime: 60_000,
  });

  if (workoutLoading || !workout) {
    return (
      <div
        className="saifit-bg"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: "2px solid var(--violet-edge)",
            borderTopColor: "var(--violet)",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  const duration =
    workout.durationSeconds ??
    (workout.completedAt
      ? Math.round(
          (new Date(workout.completedAt).getTime() - new Date(workout.startedAt).getTime()) / 1000,
        )
      : 0);
  const volume = computeVolume(workout.sets);
  const exerciseCount = uniqueExercises(workout.sets);
  const setCount = workout.sets.length;
  const displayName = me?.displayName ?? "สาย";
  const firstName = displayName.split(" ")[0] ?? displayName;

  const exerciseGroups = groupByExercise(workout.sets);
  const prsAchieved = workout.prsAchieved ?? [];
  const currentStreak = workout.currentStreak ?? 0;
  const locale = me?.locale === "en" ? "en" : "th";

  const recordTypeLabel = (rt: string): string =>
    rt === "max_weight"
      ? t("recordTypeMaxWeight")
      : rt === "max_reps"
        ? t("recordTypeMaxReps")
        : rt === "max_volume"
          ? t("recordTypeMaxVolume")
          : rt;

  const shareTextBase =
    locale === "en"
      ? `Just crushed a workout 💪 ${workout.name} · ${setCount} sets · ${volume.toLocaleString()} kg`
      : `เพิ่งออกกำลังกายเสร็จ 💪 ${workout.name} · ${setCount} เซ็ต · ${volume.toLocaleString()} กก.`;
  const sharePrFragment =
    prsAchieved.length > 0
      ? locale === "en"
        ? `\n🏆 New PR: ${prsAchieved[0]?.exerciseName} ${Math.round(Number.parseFloat(prsAchieved[0]?.value ?? "0"))} kg!`
        : `\n🏆 สถิติใหม่: ${prsAchieved[0]?.exerciseName} ${Math.round(Number.parseFloat(prsAchieved[0]?.value ?? "0"))} กก.!`
      : "";
  const shareTextFooter =
    locale === "en" ? "\nTracking gains with Saifit" : "\nติดตามสุขภาพด้วย Saifit";
  const shareText = `${shareTextBase}${sharePrFragment}${shareTextFooter}`;
  const lineShareUrl = `https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`;

  const stats = [
    { label: t("summaryTime"), value: formatDuration(duration) },
    { label: t("summaryVolume"), value: volume.toLocaleString(), unit: "kg" },
    { label: t("summarySets"), value: String(setCount) },
    { label: t("summaryExercises"), value: String(exerciseCount) },
  ];

  return (
    <div
      className="saifit-bg"
      style={{ minHeight: "100vh", paddingBottom: 40, position: "relative", overflow: "hidden" }}
    >
      {/* Confetti rays */}
      <div
        style={{
          position: "absolute",
          inset: "0 0 auto 0",
          height: 320,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 390 320"
          preserveAspectRatio="xMidYMid slice"
          style={{ opacity: 0.4 }}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="summaryRays" cx="50%" cy="0%">
              <stop offset="0%" stopColor="oklch(72% 0.20 270 / 35%)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#summaryRays)" />
          {[-48, -36, -24, -12, 0, 12, 24, 36, 48].map((offset) => {
            const rad = ((-90 + offset) * Math.PI) / 180;
            const x = 195 + Math.cos(rad) * 380;
            const y = 30 + Math.sin(rad) * 380;
            return (
              <line
                key={offset}
                x1="195"
                y1="30"
                x2={x}
                y2={y}
                stroke="oklch(72% 0.20 270 / 25%)"
                strokeWidth="1"
              />
            );
          })}
        </svg>
      </div>

      {/* Content */}
      <div style={{ position: "relative", padding: "56px 24px 0", textAlign: "center" }}>
        <p className="t-label" style={{ color: "var(--violet-bright)", letterSpacing: "0.20em" }}>
          {t("summaryKicker")}
        </p>
        <h1
          style={{
            fontFamily: "K2D, sans-serif",
            fontWeight: 700,
            fontSize: 32,
            color: "var(--ink)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            margin: "12px 0 8px",
          }}
        >
          {t("summaryTitle", { name: firstName })}
        </h1>
        <p
          style={{
            fontFamily: "K2D, sans-serif",
            fontSize: 14,
            color: "var(--ink-mute)",
          }}
        >
          {workout.name} ·{" "}
          {new Date(workout.startedAt).toLocaleDateString("th-TH", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
        {currentStreak > 0 && (
          <p
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 12,
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(255,140,40,0.12)",
              border: "1px solid rgba(255,140,40,0.4)",
              fontFamily: "K2D, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: "#FFB66B",
            }}
          >
            🔥 {t("summaryStreakBadge", { n: currentStreak })}
          </p>
        )}
      </div>

      {/* PR callout */}
      {prsAchieved.length > 0 && (
        <div style={{ position: "relative", padding: "24px 20px 0" }}>
          <div
            className="glass glass-glow"
            style={{
              padding: "16px 18px",
              border: "1px solid rgba(255,215,80,0.4)",
              boxShadow: "0 0 24px rgba(255,215,80,0.15)",
            }}
          >
            <p
              className="t-label"
              style={{
                color: "#FFD759",
                letterSpacing: "0.18em",
                marginBottom: 10,
              }}
            >
              🏆 {t("summaryPrTitle", { n: prsAchieved.length })}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {prsAchieved.map((pr, i) => (
                <div
                  key={`${pr.exerciseName}-${pr.recordType}-${i}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    fontFamily: "K2D, sans-serif",
                  }}
                >
                  <span style={{ fontSize: 14, color: "var(--ink)" }}>{pr.exerciseName}</span>
                  <span style={{ fontSize: 13, color: "var(--ink-mute)" }}>
                    {recordTypeLabel(pr.recordType)}
                    <span
                      className="t-num"
                      style={{
                        marginLeft: 8,
                        fontWeight: 700,
                        color: "#FFD759",
                        fontSize: 15,
                      }}
                    >
                      {Math.round(Number.parseFloat(pr.value) * 10) / 10}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div
        style={{
          position: "relative",
          padding: "28px 20px 0",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {stats.map((s) => (
          <div key={s.label} className="glass glass-glow" style={{ padding: "20px 18px" }}>
            <p
              style={{
                fontFamily: "system-ui, sans-serif",
                fontSize: 9,
                letterSpacing: "0.18em",
                color: "var(--ink-soft)",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              {s.label}
            </p>
            <p className="t-num" style={{ fontSize: 30, color: "var(--ink)", lineHeight: 1 }}>
              {s.value}
              {s.unit && (
                <span
                  style={{
                    fontFamily: "K2D, sans-serif",
                    fontSize: 14,
                    color: "var(--ink-mute)",
                    marginLeft: 4,
                  }}
                >
                  {s.unit}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Exercise breakdown */}
      {exerciseGroups.length > 0 && (
        <div style={{ position: "relative", padding: "20px 20px 0" }}>
          <span
            className="t-label"
            style={{ display: "block", marginBottom: 10, letterSpacing: "0.14em" }}
          >
            สรุปการออกกำลังกาย
          </span>
          <div className="glass" style={{ padding: "4px 0" }}>
            {exerciseGroups.map((group, gi) => (
              <div
                key={group.name}
                style={{
                  padding: "12px 18px",
                  borderBottom:
                    gi < exerciseGroups.length - 1 ? "1px solid var(--glass-line)" : "none",
                }}
              >
                <p
                  style={{
                    fontFamily: "K2D, sans-serif",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "var(--ink)",
                    margin: "0 0 6px",
                  }}
                >
                  {group.name}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {group.sets.map((s, si) => (
                    <span
                      key={s.id}
                      className="t-num"
                      style={{
                        fontSize: 12,
                        color: "var(--ink-mute)",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid var(--glass-line)",
                        borderRadius: 8,
                        padding: "3px 9px",
                      }}
                    >
                      {si + 1}. {s.weightKg ? `${s.weightKg}×${s.reps}` : `${s.reps} ครั้ง`}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div
        style={{
          position: "relative",
          padding: "24px 20px 0",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <a
          href={lineShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            height: 56,
            borderRadius: 14,
            textDecoration: "none",
            fontFamily: "K2D, sans-serif",
            fontWeight: 700,
            fontSize: 16,
            color: "#fff",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.87a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z" />
          </svg>
          {t("summaryShareLine")}
        </a>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 52,
            borderRadius: 14,
            background: "transparent",
            border: "1px solid var(--glass-line)",
            fontFamily: "K2D, sans-serif",
            fontWeight: 600,
            fontSize: 15,
            color: "var(--ink)",
            textDecoration: "none",
          }}
        >
          {t("summaryBackHome")}
        </Link>
      </div>
    </div>
  );
}
