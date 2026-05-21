"use client";

import { useRestTimerStore } from "@/stores/rest-timer-store";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CompleteWorkoutBar } from "./complete-workout-bar";
import { ExerciseGroupCard } from "./exercise-group-card";
import { ExercisePicker, type PickedExercise } from "./exercise-picker";
import { type GuidedSet, GuidedWorkoutView } from "./guided-workout-view";
import { PRCelebrationOverlay } from "./pr-celebration-overlay";
import { RestTimer } from "./rest-timer";
import { useWorkoutSync } from "./use-workout-sync";
import { AddExerciseButton, ExerciseProgressBar, PendingExerciseCard } from "./workout-extras";
import { WorkoutHeader } from "./workout-header";
import type { PrResult, PrevSet, WorkoutData, WorkoutSet } from "./workout-logger-types";

export function WorkoutLoggerView({
  workoutId,
  initialData,
  prevSets = [],
}: {
  workoutId: string;
  initialData: WorkoutData;
  prevSets?: PrevSet[];
}) {
  const restActive = useRestTimerStore((s) => s.isActive);
  const restWorkoutId = useRestTimerStore((s) => s.workoutId);

  const [elapsedSec, setElapsedSec] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [swapPickerFor, setSwapPickerFor] = useState<string | null>(null);
  const [swappedExercises, setSwappedExercises] = useState<Map<string, PickedExercise>>(new Map());
  const [isGuided, setIsGuided] = useState(false);
  const [pendingExercises, setPendingExercises] = useState<PickedExercise[]>([]);
  const [addingSetFor, setAddingSetFor] = useState<Set<string>>(new Set());
  const [prResult, setPrResult] = useState<PrResult | null>(null);

  const { isOnline, showSavedLocally } = useWorkoutSync(workoutId);

  const { data } = useQuery<WorkoutData>({
    queryKey: ["workout", workoutId],
    queryFn: () =>
      fetch(`/api/workouts/${workoutId}`)
        .then((r) => r.json())
        .then((r) => r.data),
    initialData,
    staleTime: 5000,
  });

  const workout = data ?? initialData;

  const exerciseGroups = useMemo(() => {
    const groups: Map<string, { exercise: WorkoutSet["exercise"]; sets: WorkoutSet[] }> = new Map();
    for (const set of workout.sets) {
      const key = set.exerciseId;
      if (!groups.has(key)) {
        groups.set(key, { exercise: set.exercise, sets: [] });
      }
      const group = groups.get(key);
      if (group) group.sets.push(set);
    }
    return Array.from(groups.values());
  }, [workout.sets]);

  const guidedSequence = useMemo<GuidedSet[]>(() => {
    const result: GuidedSet[] = [];
    for (const { exercise, sets } of exerciseGroups) {
      const totalSets = sets.length;
      for (const set of sets) {
        const prev = prevSets.find(
          (p) => p.exerciseId === set.exerciseId && p.setNumber === set.setNumber,
        );
        result.push({
          setId: set.id,
          exerciseId: set.exerciseId,
          exerciseName: exercise?.nameTh ?? exercise?.nameEn ?? "Exercise",
          exerciseSlug: exercise?.slug,
          muscleGroups: exercise?.muscleGroups ?? [],
          setNumber: set.setNumber,
          totalSets,
          isCompleted: !!(set.completedAt && set.reps > 0),
          existingWeight: set.weightKg,
          existingReps: set.reps,
          prevWeight: prev?.weightKg,
          prevReps: prev?.reps,
          isBodyweight: set.isBodyweight,
        });
      }
    }
    return result;
  }, [exerciseGroups, prevSets]);

  useEffect(() => {
    const serverIds = new Set(exerciseGroups.map((g) => g.exercise?.id));
    setPendingExercises((prev) => prev.filter((p) => !serverIds.has(p.id)));
  }, [exerciseGroups]);

  useEffect(() => {
    const startMs = new Date(workout.startedAt).getTime();
    setElapsedSec(Math.floor((Date.now() - startMs) / 1000));
    const iv = setInterval(() => setElapsedSec(Math.floor((Date.now() - startMs) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [workout.startedAt]);

  const handleExercisePicked = (exercise: PickedExercise) => {
    setPickerOpen(false);
    const alreadyInGroups = exerciseGroups.some((g) => g.exercise?.id === exercise.id);
    const alreadyPending = pendingExercises.some((p) => p.id === exercise.id);
    if (!alreadyInGroups && !alreadyPending) {
      setPendingExercises((prev) => [...prev, exercise]);
    }
  };

  const handleSwapPicked = (newExercise: PickedExercise) => {
    if (!swapPickerFor) return;
    setSwappedExercises((prev) => new Map(prev).set(swapPickerFor, newExercise));
    setSwapPickerFor(null);
  };

  return (
    <div className="saifit-bg" style={{ minHeight: "100vh", paddingBottom: 112 }}>
      <WorkoutHeader
        workoutName={workout.name}
        elapsedSec={elapsedSec}
        showAutoButton={guidedSequence.length > 0}
        onAutoClick={() => setIsGuided(true)}
        showSavedLocally={showSavedLocally}
        isOnline={isOnline}
      />

      <ExerciseProgressBar groups={exerciseGroups} />

      <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {exerciseGroups.map(({ exercise, sets }) => {
          const originalId = sets[0]?.exerciseId ?? exercise?.id ?? "";
          const swapped = swappedExercises.get(originalId);
          const effectiveId = swapped?.id ?? exercise?.id ?? "";
          return (
            <ExerciseGroupCard
              key={sets[0]?.exerciseId ?? exercise?.id}
              exercise={exercise}
              sets={sets}
              workoutId={workoutId}
              prevSets={prevSets}
              swappedExercise={swapped}
              onSwap={setSwapPickerFor}
              addingSet={!!effectiveId && addingSetFor.has(effectiveId)}
              onStartAddingSet={(id) => setAddingSetFor((prev) => new Set(prev).add(id))}
              onFinishAddingSet={(id) =>
                setAddingSetFor((prev) => {
                  const next = new Set(prev);
                  next.delete(id);
                  return next;
                })
              }
              onPR={setPrResult}
            />
          );
        })}

        {pendingExercises.map((exercise) => (
          <PendingExerciseCard
            key={exercise.id}
            exercise={exercise}
            workoutId={workoutId}
            onCompleted={() =>
              setPendingExercises((prev) => prev.filter((p) => p.id !== exercise.id))
            }
            onPR={setPrResult}
          />
        ))}

        <AddExerciseButton onClick={() => setPickerOpen(true)} />
      </div>

      {restActive && restWorkoutId === workoutId && <RestTimer workoutId={workoutId} />}

      <CompleteWorkoutBar workoutId={workoutId} startedAt={workout.startedAt} isOnline={isOnline} />

      {pickerOpen && (
        <ExercisePicker
          workoutId={workoutId}
          onClose={() => setPickerOpen(false)}
          onSelect={handleExercisePicked}
        />
      )}

      {swapPickerFor !== null && (
        <ExercisePicker
          workoutId={workoutId}
          onClose={() => setSwapPickerFor(null)}
          onSelect={handleSwapPicked}
        />
      )}

      {prResult && (
        <PRCelebrationOverlay
          exerciseName={prResult.exerciseName}
          value={prResult.value}
          type={prResult.type}
          onDismiss={() => setPrResult(null)}
        />
      )}

      {isGuided && (
        <GuidedWorkoutView
          workoutId={workoutId}
          startedAt={workout.startedAt}
          sequence={guidedSequence}
          isOnline={isOnline}
          onPause={() => setIsGuided(false)}
        />
      )}
    </div>
  );
}
