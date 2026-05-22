"use client";

import { ExerciseAnimation } from "@/components/exercise-animation";
import { ExerciseAnimBySlug, MUSCLE_GROUP_TO_MAP, MuscleMap } from "@/components/exercises";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

// Defer the ~100 KB recharts chunk off this route's First Load JS.
const HistoryChart = dynamic(
  () => import("./_components/history-chart").then((m) => m.HistoryChart),
  { ssr: false },
);

interface HistoryEntry {
  date: string;
  workoutId: string;
  sets: Array<{ setNumber: number; weightKg: string | null; reps: number }>;
}

interface ExerciseDetail {
  id: string;
  slug: string;
  nameEn: string;
  nameTh: string;
  category: string;
  muscleGroups: string[];
  equipment: string;
  isBodyweight: boolean;
  difficulty: string;
  beginnerCueTh: string;
  beginnerCueEn: string;
  commonMistakeTh: string;
  commonMistakeEn: string;
  history: HistoryEntry[] | null;
}

interface ChartPoint {
  date: string;
  maxWeight: number;
  est1RM: number | null;
}

function DetailSkeleton() {
  return (
    <div className="saifit-bg" style={{ minHeight: "100vh", padding: "40px 24px 0" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            height: 18,
            width: "30%",
            borderRadius: 6,
            background: "rgba(255,255,255,0.06)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            height: 28,
            width: "75%",
            borderRadius: 8,
            background: "rgba(255,255,255,0.06)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            height: 160,
            borderRadius: 20,
            background: "rgba(255,255,255,0.04)",
            animation: "pulse 1.5s ease-in-out infinite",
            marginTop: 8,
          }}
        />
        <div
          style={{
            height: 100,
            borderRadius: 20,
            background: "rgba(255,255,255,0.04)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );
}

export default function ExerciseDetailPage() {
  const t = useTranslations("exercises");
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [lang, setLang] = useState<"th" | "en">("th");
  const [paused, setPaused] = useState(false);

  const { data, isLoading } = useQuery<{ data: ExerciseDetail }>({
    queryKey: ["exercise", slug],
    queryFn: () => fetch(`/api/exercises/${slug}`).then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <DetailSkeleton />;

  const exercise = data?.data;
  if (!exercise) return null;

  const chartData: ChartPoint[] = (exercise.history ?? [])
    .map((h) => {
      const maxWeight = Math.max(...h.sets.map((s) => Number.parseFloat(s.weightKg ?? "0") || 0));
      const best1RM = h.sets.reduce((best, s) => {
        const w = Number.parseFloat(s.weightKg ?? "0") || 0;
        const r = s.reps;
        if (!w || r === 0 || r > 12) return best;
        const est = r === 1 ? w : w * (36 / (37 - r));
        return est > best ? est : best;
      }, 0);
      return {
        date: new Date(h.date).toLocaleDateString("th-TH", { month: "short", day: "numeric" }),
        maxWeight,
        est1RM: best1RM > 0 ? Math.round(best1RM * 10) / 10 : null,
      };
    })
    .reverse();

  const beginnerCue = lang === "th" ? exercise.beginnerCueTh : exercise.beginnerCueEn;
  const commonMistake = lang === "th" ? exercise.commonMistakeTh : exercise.commonMistakeEn;

  return (
    <div className="saifit-bg" style={{ minHeight: "100vh", paddingBottom: 110 }}>
      <div style={{ padding: "40px 24px 0" }}>
        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "K2D, sans-serif",
            fontSize: 13,
            color: "var(--ink-soft)",
            background: "none",
            border: "none",
            cursor: "pointer",
            marginBottom: 20,
            padding: 0,
            minHeight: 44,
          }}
        >
          <svg
            viewBox="0 0 20 20"
            width={16}
            height={16}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 4l-6 6 6 6" />
          </svg>
          {t("title")}
        </button>

        {/* Exercise name */}
        <h1
          style={{
            fontFamily: "K2D, sans-serif",
            fontWeight: 700,
            fontSize: 24,
            color: "var(--ink)",
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {exercise.nameTh}
        </h1>
        <p
          style={{
            fontFamily: "Chakra Petch, monospace",
            fontSize: 12,
            letterSpacing: "0.06em",
            color: "var(--ink-soft)",
            textTransform: "uppercase",
            marginTop: 4,
          }}
        >
          {exercise.nameEn}
        </p>

        {/* Muscle + equipment chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {exercise.muscleGroups.map((mg) => (
            <span key={mg} className="tag-violet">
              {mg}
            </span>
          ))}
          <span
            style={{
              fontFamily: "system-ui, sans-serif",
              fontSize: 10,
              letterSpacing: "0.1em",
              color: "var(--ink-soft)",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              padding: "4px 10px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--glass-line)",
              borderRadius: 999,
            }}
          >
            {exercise.equipment}
          </span>
        </div>
      </div>

      {/* Exercise animation + muscle map */}
      <div style={{ margin: "20px 24px", display: "flex", gap: 12 }}>
        <div
          className="glass"
          style={{
            flex: 1,
            height: 180,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: 20,
            position: "relative",
          }}
        >
          <ExerciseAnimBySlug
            slug={exercise.slug}
            category={exercise.category}
            size="lg"
            paused={paused}
            fallback={<ExerciseAnimation size="lg" />}
          />
          <button
            type="button"
            aria-label={paused ? "เล่นวิดีโอ" : "หยุดชั่วคราว"}
            onClick={() => setPaused((p) => !p)}
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              width: 44,
              height: 44,
              borderRadius: 999,
              background: "rgba(20,20,32,0.65)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid var(--glass-line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--ink-mute)",
            }}
          >
            {paused ? (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M2.5 1.5l8 4.5-8 4.5V1.5z" />
              </svg>
            ) : (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="currentColor"
                aria-hidden="true"
              >
                <rect x="2" y="1.5" width="3" height="9" rx="1" />
                <rect x="7" y="1.5" width="3" height="9" rx="1" />
              </svg>
            )}
          </button>
        </div>
        {(() => {
          const primary = exercise.muscleGroups.flatMap((mg) => MUSCLE_GROUP_TO_MAP[mg] ?? []);
          if (primary.length === 0) return null;
          return (
            <div
              className="glass"
              style={{
                width: 100,
                height: 180,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 20,
                flexShrink: 0,
              }}
            >
              <MuscleMap size={72} primary={primary} view="front" label="" />
            </div>
          );
        })()}
      </div>

      {/* Glass segmented Thai/English */}
      <div style={{ padding: "0 24px" }}>
        <div className="glass" style={{ display: "flex", padding: 4, gap: 4, borderRadius: 14 }}>
          {(["th", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 10,
                fontFamily: "K2D, sans-serif",
                fontWeight: 600,
                fontSize: 13,
                border: 0,
                cursor: "pointer",
                transition: "background 0.15s, color 0.15s",
                background: lang === l ? "rgba(140,100,255,0.18)" : "transparent",
                color: lang === l ? "var(--ink)" : "var(--ink-soft)",
                boxShadow:
                  lang === l
                    ? "0 0 0 1px var(--violet-edge), inset 0 1px 0 rgba(255,255,255,0.08)"
                    : "none",
              }}
            >
              {l === "th" ? t("thai") : t("english")}
            </button>
          ))}
        </div>
      </div>

      {/* Cue cards */}
      <div
        style={{
          padding: "16px 24px 0",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div className="glass" style={{ padding: "16px 20px" }}>
          <span className="t-label" style={{ display: "block", marginBottom: 8 }}>
            {t("beginner")}
          </span>
          <p
            style={{
              fontFamily: "K2D, sans-serif",
              fontSize: 14,
              color: "var(--ink)",
              lineHeight: 1.7,
            }}
          >
            {beginnerCue}
          </p>
        </div>

        <div className="glass" style={{ padding: "16px 20px" }}>
          <span className="t-label" style={{ display: "block", marginBottom: 8 }}>
            {t("mistakes")}
          </span>
          <p
            style={{
              fontFamily: "K2D, sans-serif",
              fontSize: 14,
              color: "var(--ink)",
              lineHeight: 1.7,
            }}
          >
            {commonMistake}
          </p>
        </div>

        {/* History chart */}
        <div className="glass" style={{ padding: "16px 20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <span className="t-label">{t("history")}</span>
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div
                  style={{ width: 20, height: 2, background: "var(--violet)", borderRadius: 1 }}
                />
                <span
                  style={{
                    fontFamily: "system-ui",
                    fontSize: 9,
                    color: "var(--ink-soft)",
                    letterSpacing: "0.1em",
                  }}
                >
                  MAX KG
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div
                  style={{
                    width: 20,
                    height: 2,
                    background: "var(--violet-bright)",
                    borderRadius: 1,
                    opacity: 0.7,
                  }}
                />
                <span
                  style={{
                    fontFamily: "system-ui",
                    fontSize: 9,
                    color: "var(--ink-soft)",
                    letterSpacing: "0.1em",
                  }}
                >
                  1RM EST
                </span>
              </div>
            </div>
          </div>
          {!exercise.history || exercise.history.length === 0 ? (
            <p
              style={{
                fontFamily: "K2D, sans-serif",
                fontSize: 14,
                color: "var(--ink-mute)",
              }}
            >
              {t("noHistory")}
            </p>
          ) : (
            <HistoryChart data={chartData} />
          )}
        </div>
      </div>
    </div>
  );
}
