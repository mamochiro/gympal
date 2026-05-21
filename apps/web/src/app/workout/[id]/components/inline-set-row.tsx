"use client";

import { enqueue } from "@/lib/workout-queue";
import { useRestTimerStore } from "@/stores/rest-timer-store";
import { normalizeDecimal } from "@saifit/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { PickedExercise } from "./exercise-picker";

// Inline form for the first set of a newly picked exercise
export function FirstSetRow({
  exercise,
  workoutId,
  setNumber,
  onCompleted,
  onPR,
}: {
  exercise: PickedExercise;
  workoutId: string;
  setNumber: number;
  onCompleted: () => void;
  onPR: (name: string, value: number, type: string) => void;
}) {
  const t = useTranslations("workout");
  const qc = useQueryClient();
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [saving, setSaving] = useState(false);

  const startRest = (w: string, r: string) => {
    useRestTimerStore.getState().start({
      workoutId,
      exerciseName: exercise.nameTh || exercise.nameEn,
      setNumber,
      nextWeight: w || null,
      nextReps: r || null,
      nextSetNumber: setNumber + 1,
    });
  };

  const handleComplete = async () => {
    const repsNum = Number.parseInt(reps, 10);
    if (Number.isNaN(repsNum) || repsNum <= 0) return;
    const weightKg = weight ? normalizeDecimal(weight) : null;
    const clientSetId = crypto.randomUUID();
    const completedAt = new Date().toISOString();
    setSaving(true);
    try {
      const res = await fetch(`/api/workouts/${workoutId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSetId,
          exerciseId: exercise.id,
          setNumber,
          weightKg,
          reps: repsNum,
          isBodyweight: !weightKg,
          completedAt,
        }),
      });
      if (res.ok) {
        const { data } = await res.json();
        if (data.prBeaten && data.newPrValue !== null) {
          onPR(
            exercise.nameTh || exercise.nameEn,
            data.newPrValue,
            data.prTypes[0] ?? "max_weight",
          );
        }
        qc.invalidateQueries({ queryKey: ["workout", workoutId] });
        startRest(weight, reps);
        onCompleted();
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      // Offline or server error — queue for sync
      await enqueue(workoutId, {
        type: "create_set",
        payload: {
          clientSetId,
          workoutId,
          exerciseId: exercise.id,
          setNumber,
          weightKg,
          reps: repsNum,
          isBodyweight: !weightKg,
          completedAt,
        },
      });
      qc.invalidateQueries({ queryKey: ["workout", workoutId] });
      startRest(weight, reps);
      onCompleted();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 16,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid var(--glass-line)",
        minHeight: 56,
      }}
    >
      <span
        className="t-num"
        style={{ fontSize: 14, color: "var(--ink-soft)", width: 20, flexShrink: 0 }}
      >
        {setNumber}
      </span>

      <input
        type="text"
        inputMode="decimal"
        placeholder="0"
        value={weight}
        onChange={(e) => setWeight(normalizeDecimal(e.target.value))}
        className="t-num"
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          textAlign: "center",
          fontSize: 20,
          fontWeight: 700,
          color: "var(--ink)",
          minWidth: 0,
          minHeight: 56,
        }}
        aria-label="น้ำหนัก (kg)"
      />

      <span style={{ color: "var(--ink-soft)", fontSize: 14, flexShrink: 0 }}>×</span>

      <input
        type="text"
        inputMode="numeric"
        placeholder="0"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        className="t-num"
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          textAlign: "center",
          fontSize: 20,
          fontWeight: 700,
          color: "var(--ink)",
          minWidth: 0,
          minHeight: 56,
        }}
        aria-label="จำนวนครั้ง"
      />

      <button
        type="button"
        onClick={handleComplete}
        disabled={saving}
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg, oklch(65% 0.22 280), oklch(60% 0.20 240))",
          boxShadow: "0 8px 20px -8px rgba(120,90,255,0.55)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          opacity: saving ? 0.5 : 1,
          transition: "transform 0.1s, opacity 0.15s",
        }}
        aria-label={t("complete")}
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
          <path
            d="M1 7L7 13L17 1"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

export function LastSessionRow({ exerciseId }: { exerciseId: string }) {
  const t = useTranslations("workout");
  const { data } = useQuery<{ reps: number; weightKg: string | null; isWarmup: boolean }[]>({
    queryKey: ["last-sets", exerciseId],
    queryFn: () =>
      fetch(`/api/workouts/last-sets?exerciseId=${encodeURIComponent(exerciseId)}`)
        .then((r) => r.json())
        .then((r) => r.data ?? []),
    staleTime: 60_000,
  });

  const workSets = data?.filter((s) => !s.isWarmup) ?? [];
  if (workSets.length === 0) return null;

  const summary = workSets.map((s) => `${s.weightKg ?? "—"}×${s.reps}`).join(" · ");

  return (
    <div
      style={{
        padding: "4px 4px 0",
        fontFamily: "K2D, sans-serif",
        fontSize: 11,
        color: "var(--ink-faint)",
        letterSpacing: "0.04em",
      }}
    >
      {t("lastSession")} · {summary}
    </div>
  );
}
