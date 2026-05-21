"use client";

import { useTranslations } from "next-intl";
import type { PickedExercise } from "./exercise-picker";
import { FirstSetRow } from "./inline-set-row";
import type { PrResult } from "./workout-logger-types";

export function ExerciseProgressBar({
  groups,
}: {
  groups: { exercise: { id?: string } | null; sets: { exerciseId: string }[] }[];
}) {
  if (groups.length === 0) return null;
  return (
    <div style={{ padding: "0 24px 16px", display: "flex", gap: 4 }}>
      {groups.map(({ exercise, sets }) => {
        const pct = sets.length > 0 ? 100 : 0;
        return (
          <div
            key={exercise?.id ?? sets[0]?.exerciseId}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: pct > 0 ? "var(--violet)" : "transparent",
                boxShadow: pct > 0 ? "0 0 6px var(--violet)" : "none",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function PendingExerciseCard({
  exercise,
  workoutId,
  onCompleted,
  onPR,
}: {
  exercise: PickedExercise;
  workoutId: string;
  onCompleted: () => void;
  onPR: (result: PrResult) => void;
}) {
  return (
    <div className="glass" style={{ padding: "16px 18px" }}>
      <p
        style={{
          fontFamily: "K2D, sans-serif",
          fontWeight: 600,
          fontSize: 15,
          color: "var(--ink)",
          lineHeight: 1.3,
          marginBottom: 2,
        }}
      >
        {exercise.nameTh || exercise.nameEn}
      </p>
      {exercise.muscleGroups.length > 0 && (
        <p
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-soft)",
            marginBottom: 12,
          }}
        >
          {exercise.muscleGroups.join(" · ")}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <FirstSetRow
          exercise={exercise}
          workoutId={workoutId}
          setNumber={1}
          onCompleted={onCompleted}
          onPR={(name, value, type) => onPR({ exerciseName: name, value, type })}
        />
      </div>
    </div>
  );
}

export function AddExerciseButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations("workout");
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        height: 56,
        borderRadius: 20,
        background: "rgba(255,255,255,0.03)",
        border: "1px dashed rgba(255,255,255,0.12)",
        fontFamily: "K2D, sans-serif",
        fontSize: 14,
        color: "var(--ink-soft)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
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
        aria-hidden="true"
      >
        <path d="M10 4v12M4 10h12" />
      </svg>
      {t("addExercise")}
    </button>
  );
}
