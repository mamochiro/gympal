"use client";

import { ExerciseAnimation } from "@/components/exercise-animation";
import { ExerciseAnimBySlug } from "@/components/exercises";
import { useRestTimerStore } from "@/stores/rest-timer-store";
import { ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PickedExercise } from "./exercise-picker";
import { FirstSetRow, LastSessionRow } from "./inline-set-row";
import { SetRow } from "./set-row";
import type { PrResult, PrevSet, WorkoutSet } from "./workout-logger-types";

export function ExerciseGroupCard({
  exercise,
  sets,
  workoutId,
  prevSets,
  swappedExercise,
  onSwap,
  addingSet,
  onStartAddingSet,
  onFinishAddingSet,
  onPR,
}: {
  exercise: WorkoutSet["exercise"];
  sets: WorkoutSet[];
  workoutId: string;
  prevSets: PrevSet[];
  swappedExercise: PickedExercise | undefined;
  onSwap: (originalId: string) => void;
  addingSet: boolean;
  onStartAddingSet: (exerciseId: string) => void;
  onFinishAddingSet: (exerciseId: string) => void;
  onPR: (result: PrResult) => void;
}) {
  const t = useTranslations("workout");

  const originalId = sets[0]?.exerciseId ?? exercise?.id ?? "";
  const effectiveExercise = swappedExercise ?? exercise;
  const effectiveName = effectiveExercise?.nameTh ?? effectiveExercise?.nameEn ?? "Exercise";
  const effectiveMuscleGroups = effectiveExercise?.muscleGroups ?? [];
  const effectiveSlug = swappedExercise ? undefined : exercise?.slug;

  const firstNonCompletedIdx = sets.findIndex((s) => !(s.completedAt && s.reps > 0));

  return (
    <div className="glass" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
        {effectiveSlug ? (
          <ExerciseAnimBySlug
            slug={effectiveSlug}
            category={effectiveMuscleGroups[0]}
            size="sm"
            fallback={<ExerciseAnimation size="sm" />}
          />
        ) : (
          <ExerciseAnimation size="sm" />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: "K2D, sans-serif",
              fontWeight: 600,
              fontSize: 15,
              color: "var(--ink)",
              lineHeight: 1.3,
            }}
          >
            {effectiveName}
          </p>
          {effectiveMuscleGroups.length > 0 && (
            <p
              style={{
                fontFamily: "system-ui, sans-serif",
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-soft)",
                marginTop: 2,
              }}
            >
              {effectiveMuscleGroups.join(" · ")}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onSwap(originalId)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--ink-mute)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
            borderRadius: 8,
            flexShrink: 0,
            minWidth: 36,
            minHeight: 36,
          }}
          aria-label={t("swapExercise")}
        >
          <ArrowLeftRight size={15} aria-hidden="true" />
        </button>
      </div>
      <LastSessionRow exerciseId={effectiveExercise?.id ?? sets[0]?.exerciseId ?? ""} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {sets.map((set, idx) => {
          const isCompleted = !!(set.completedAt && set.reps > 0);
          const setStatus =
            isCompleted || firstNonCompletedIdx === -1
              ? "current"
              : idx === firstNonCompletedIdx
                ? "current"
                : "pending";
          const prev = prevSets.find(
            (p) => p.exerciseId === set.exerciseId && p.setNumber === set.setNumber,
          );
          return (
            <SetRow
              key={set.id}
              set={set}
              workoutId={workoutId}
              status={setStatus}
              prevWeight={prev?.weightKg}
              prevReps={prev?.reps}
              onPR={(exerciseName, value, type) => onPR({ exerciseName, value, type })}
              onSetComplete={(exerciseName, setNumber, weight, reps) => {
                useRestTimerStore.getState().start({
                  workoutId,
                  exerciseName,
                  setNumber,
                  nextWeight: weight || null,
                  nextReps: reps || null,
                  nextSetNumber: setNumber + 1,
                });
              }}
            />
          );
        })}
        {/* Add another set */}
        {effectiveExercise && addingSet ? (
          <FirstSetRow
            exercise={effectiveExercise as PickedExercise}
            workoutId={workoutId}
            setNumber={sets.length + 1}
            onCompleted={() => onFinishAddingSet(effectiveExercise.id)}
            onPR={(name, value, type) => onPR({ exerciseName: name, value, type })}
          />
        ) : (
          effectiveExercise && (
            <button
              type="button"
              onClick={() => onStartAddingSet(effectiveExercise.id)}
              style={{
                height: 40,
                borderRadius: 12,
                background: "transparent",
                border: "1px dashed rgba(255,255,255,0.1)",
                fontFamily: "K2D, sans-serif",
                fontSize: 12,
                color: "var(--ink-soft)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <svg
                viewBox="0 0 16 16"
                width={12}
                height={12}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M8 3v10M3 8h10" />
              </svg>
              {t("addSet")}
            </button>
          )
        )}
      </div>
    </div>
  );
}
