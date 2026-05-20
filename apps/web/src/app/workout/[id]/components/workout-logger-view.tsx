"use client";

import { ExerciseAnimation } from "@/components/exercise-animation";
import { ExerciseAnimBySlug } from "@/components/exercises";
import {
  enqueue,
  gcSynced,
  getPending,
  getPendingCount,
  markFailed,
  markSynced,
} from "@/lib/workout-queue";
import { useRestTimerStore } from "@/stores/rest-timer-store";
import { useViewportStore } from "@/stores/viewport-store";
import { normalizeDecimal } from "@saifit/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CompleteWorkoutBar } from "./complete-workout-bar";
import { ExercisePicker, type PickedExercise } from "./exercise-picker";
import { type GuidedSet, GuidedWorkoutView } from "./guided-workout-view";
import { PRCelebrationOverlay } from "./pr-celebration-overlay";
import { RestTimer } from "./rest-timer";
import { SetRow } from "./set-row";

interface WorkoutSet {
  id: string;
  workoutId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: string | null;
  isBodyweight: boolean;
  isWarmup: boolean;
  notes: string | null;
  clientSetId: string | null;
  completedAt: string;
  exercise: {
    id: string;
    nameEn: string;
    nameTh: string;
    slug: string;
    muscleGroups: string[];
  } | null;
}

interface WorkoutData {
  id: string;
  name: string;
  userId: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  sets: WorkoutSet[];
}

// Inline form for the first set of a newly picked exercise
function FirstSetRow({
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

function LastSessionRow({ exerciseId }: { exerciseId: string }) {
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

interface PrevSet {
  exerciseId: string;
  setNumber: number;
  weightKg: string | null;
  reps: number;
}

export function WorkoutLoggerView({
  workoutId,
  initialData,
  prevSets = [],
}: {
  workoutId: string;
  initialData: WorkoutData;
  prevSets?: PrevSet[];
}) {
  const t = useTranslations("workout");
  const qc = useQueryClient();
  const initViewport = useViewportStore((s) => s.init);
  const restActive = useRestTimerStore((s) => s.isActive);
  const restWorkoutId = useRestTimerStore((s) => s.workoutId);

  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [swapPickerFor, setSwapPickerFor] = useState<string | null>(null);
  const [swappedExercises, setSwappedExercises] = useState<Map<string, PickedExercise>>(new Map());
  const [isGuided, setIsGuided] = useState(false);
  const [pendingExercises, setPendingExercises] = useState<PickedExercise[]>([]);
  const [addingSetFor, setAddingSetFor] = useState<Set<string>>(new Set());
  const [prResult, setPrResult] = useState<{
    exerciseName: string;
    value: number;
    type: string;
  } | null>(null);
  const flushingRef = useRef(false);

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

  const flush = useCallback(async () => {
    if (flushingRef.current || !navigator.onLine) return;
    const pending = await getPending(workoutId);
    if (pending.length === 0) return;
    flushingRef.current = true;
    try {
      const ops = pending
        .filter((e): e is typeof e & { id: number } => e.id !== undefined)
        .map((e) => ({
          seq: e.id,
          type: e.operation.type,
          payload: e.operation.payload,
        }));
      const res = await fetch(`/api/workouts/${workoutId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: pending[0]?.clientId ?? "",
          lastSyncSeq: 0,
          pendingOps: ops,
        }),
      });
      if (res.ok) {
        const { data: result } = await res.json();
        if (result.accepted?.length) await markSynced(result.accepted);
        if (result.rejected?.length) {
          for (const { seq, reason } of result.rejected as { seq: number; reason: string }[]) {
            await markFailed(seq, reason);
          }
        }
        qc.invalidateQueries({ queryKey: ["workout", workoutId] });
      }
    } catch {
      // Silent — will retry on next flush
    } finally {
      flushingRef.current = false;
      const count = await getPendingCount(workoutId);
      setPendingCount(count);
    }
  }, [workoutId, qc]);

  // Clean up old synced entries once on mount (fire-and-forget)
  useEffect(() => {
    gcSynced().catch(() => {});
  }, []);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      flush();
    };
    const onOffline = () => setIsOnline(false);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisibility);
    setIsOnline(navigator.onLine);

    const cleanup = initViewport();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibility);
      cleanup();
    };
  }, [flush, initViewport]);

  useEffect(() => {
    const startMs = new Date(workout.startedAt).getTime();
    setElapsedSec(Math.floor((Date.now() - startMs) / 1000));
    const iv = setInterval(() => setElapsedSec(Math.floor((Date.now() - startMs) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [workout.startedAt]);

  useEffect(() => {
    const iv = setInterval(async () => {
      const count = await getPendingCount(workoutId);
      setPendingCount(count);
    }, 3000);
    return () => clearInterval(iv);
  }, [workoutId]);

  const showSavedLocally = !isOnline || pendingCount > 0;

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
      {/* Header */}
      <div style={{ padding: "40px 24px 20px" }}>
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "K2D, sans-serif",
            fontSize: 13,
            color: "var(--ink-soft)",
            textDecoration: "none",
            marginBottom: 14,
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
          {t("exitWorkout")}
        </a>
        <span className="t-label">WORKOUT</span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 6,
          }}
        >
          <h1
            style={{
              fontFamily: "K2D, sans-serif",
              fontWeight: 700,
              fontSize: 22,
              color: "var(--ink)",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {workout.name}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {guidedSequence.length > 0 && (
              <button
                type="button"
                onClick={() => setIsGuided(true)}
                style={{
                  fontFamily: "Chakra Petch, monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "var(--violet-bright)",
                  background: "rgba(140,100,255,0.1)",
                  border: "1px solid var(--violet-edge)",
                  borderRadius: 999,
                  padding: "3px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  minHeight: 28,
                }}
                aria-label="โหมดอัตโนมัติ"
              >
                <svg
                  width="9"
                  height="10"
                  viewBox="0 0 9 10"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M1 1.5v7l7-3.5z" />
                </svg>
                AUTO
              </button>
            )}
            <span
              className="t-num"
              style={{
                fontSize: 13,
                color: "var(--violet-bright)",
                background: "rgba(140,100,255,0.1)",
                border: "1px solid var(--violet-edge)",
                borderRadius: 999,
                padding: "3px 10px",
                letterSpacing: "0.04em",
              }}
            >
              {(() => {
                const h = Math.floor(elapsedSec / 3600);
                const m = Math.floor((elapsedSec % 3600) / 60);
                const s = elapsedSec % 60;
                return h > 0
                  ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
                  : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
              })()}
            </span>
            {showSavedLocally && (
              <span
                style={{
                  fontFamily: "K2D, sans-serif",
                  fontSize: 11,
                  color: "var(--ink-soft)",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--glass-line)",
                  borderRadius: 999,
                  padding: "3px 10px",
                }}
              >
                {isOnline ? t("syncing") : t("savedLocally")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Exercise progress bar */}
      {exerciseGroups.length > 0 && (
        <div style={{ padding: "0 24px 16px", display: "flex", gap: 4 }}>
          {exerciseGroups.map(({ exercise, sets }) => {
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
      )}

      {/* Exercise sections */}
      <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {exerciseGroups.map(({ exercise, sets }) => {
          const originalId = sets[0]?.exerciseId ?? exercise?.id ?? "";
          const swapped = swappedExercises.get(originalId);
          const effectiveExercise = swapped ?? exercise;
          const effectiveName =
            effectiveExercise?.nameTh ?? effectiveExercise?.nameEn ?? "Exercise";
          const effectiveMuscleGroups = effectiveExercise?.muscleGroups ?? [];
          const effectiveSlug = swapped ? undefined : exercise?.slug;

          return (
            <div
              key={sets[0]?.exerciseId ?? exercise?.id}
              className="glass"
              style={{ padding: "16px 18px" }}
            >
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
                  onClick={() => setSwapPickerFor(originalId)}
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
              {(() => {
                const firstNonCompletedIdx = sets.findIndex((s) => !(s.completedAt && s.reps > 0));
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    {sets.map((set, idx) => {
                      const isCompleted = !!(set.completedAt && set.reps > 0);
                      const setStatus =
                        isCompleted || firstNonCompletedIdx === -1
                          ? "current"
                          : idx === firstNonCompletedIdx
                            ? "current"
                            : "pending";
                      return (
                        <SetRow
                          key={set.id}
                          set={set}
                          workoutId={workoutId}
                          status={setStatus}
                          prevWeight={
                            prevSets.find(
                              (p) =>
                                p.exerciseId === set.exerciseId && p.setNumber === set.setNumber,
                            )?.weightKg
                          }
                          prevReps={
                            prevSets.find(
                              (p) =>
                                p.exerciseId === set.exerciseId && p.setNumber === set.setNumber,
                            )?.reps
                          }
                          onPR={(exerciseName, value, type) =>
                            setPrResult({ exerciseName, value, type })
                          }
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
                    {effectiveExercise && addingSetFor.has(effectiveExercise.id) ? (
                      <FirstSetRow
                        exercise={effectiveExercise as PickedExercise}
                        workoutId={workoutId}
                        setNumber={sets.length + 1}
                        onCompleted={() =>
                          setAddingSetFor((prev) => {
                            const next = new Set(prev);
                            next.delete(effectiveExercise.id);
                            return next;
                          })
                        }
                        onPR={(name, value, type) =>
                          setPrResult({ exerciseName: name, value, type })
                        }
                      />
                    ) : (
                      effectiveExercise && (
                        <button
                          type="button"
                          onClick={() =>
                            setAddingSetFor((prev) => new Set(prev).add(effectiveExercise.id))
                          }
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
                );
              })()}
            </div>
          );
        })}

        {/* Pending exercises */}
        {pendingExercises.map((exercise) => (
          <div key={exercise.id} className="glass" style={{ padding: "16px 18px" }}>
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
                onCompleted={() =>
                  setPendingExercises((prev) => prev.filter((p) => p.id !== exercise.id))
                }
                onPR={(name, value, type) => setPrResult({ exerciseName: name, value, type })}
              />
            </div>
          </div>
        ))}

        {/* Add exercise */}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
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
      </div>

      {/* Rest timer */}
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
