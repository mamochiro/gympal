"use client";

import { apiFetch } from "@/lib/api-fetch";
import { enqueue, getClientId } from "@/lib/workout-queue";
import { computePlates, normalizeDecimal } from "@saifit/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";

const UNDO_MS = 8000;

interface WorkoutSet {
  id: string;
  workoutId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: string | null;
  isBodyweight: boolean;
  isWarmup: boolean;
  completedAt: string;
  exercise: { nameTh: string; nameEn: string; equipment?: string } | null;
}

export function SetRow({
  set,
  workoutId,
  status = "current",
  prevWeight,
  prevReps,
  suggested,
  onPR,
  onSetComplete,
}: {
  set: WorkoutSet;
  workoutId: string;
  status?: "current" | "pending";
  prevWeight?: string | null | undefined;
  prevReps?: number | null | undefined;
  suggested?: { weight: string; reps: string; isSuggested: boolean } | undefined;
  onPR: (exerciseName: string, value: number, type: string) => void;
  onSetComplete: (exerciseName: string, setNumber: number, weight: string, reps: string) => void;
}) {
  const t = useTranslations("workout");
  const qc = useQueryClient();

  const initialWeight = set.weightKg ?? suggested?.weight ?? "";
  const initialReps = set.reps > 0 ? String(set.reps) : (suggested?.reps ?? "0");

  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(initialReps);
  const [isSuggestion, setIsSuggestion] = useState(
    !!suggested?.isSuggested && set.weightKg === null && set.reps === 0,
  );
  const [completed, setCompleted] = useState(!!set.completedAt && set.reps > 0);
  const [undoVisible, setUndoVisible] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [warmup, setWarmup] = useState(set.isWarmup);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const platesText = useMemo(() => {
    if (set.exercise?.equipment !== "barbell") return null;
    const w = Number.parseFloat(weight);
    if (Number.isNaN(w) || w <= 0) return null;
    const plates = computePlates(w, 20);
    if (plates === null) return null;
    if (plates.length === 0) return t("platesBarOnly");
    const parts = plates.flatMap((p) => Array(p.count).fill(String(p.weightKg))).join(" + ");
    return t("platesPerSide", { plates: parts });
  }, [set.exercise?.equipment, weight, t]);

  const saveSet = useCallback(
    async (w: string, r: string) => {
      const repsNum = Number.parseInt(r, 10);
      if (Number.isNaN(repsNum) || repsNum < 0) return;
      await enqueue(workoutId, {
        type: "update_set",
        payload: {
          setId: set.id,
          ...(w ? { weightKg: w } : {}),
          reps: repsNum,
        },
      });
      qc.setQueryData<{ sets: WorkoutSet[] }>(["workout", workoutId], (old) => {
        if (!old) return old;
        return {
          ...old,
          sets: old.sets.map((s) =>
            s.id === set.id ? { ...s, weightKg: w || null, reps: repsNum } : s,
          ),
        };
      });
    },
    [set.id, workoutId, qc],
  );

  const debouncedSave = useCallback(
    (w: string, r: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => saveSet(w, r), 300);
    },
    [saveSet],
  );

  const handleComplete = useCallback(async () => {
    const repsNum = Number.parseInt(reps, 10);
    if (Number.isNaN(repsNum) || repsNum <= 0) return;
    const weightKg = weight ? normalizeDecimal(weight) : null;
    const clientSetId = `${getClientId()}-${set.id}`;

    setCompleted(true);
    setIsSuggestion(false);
    setUndoVisible(true);
    setTimeout(() => setUndoVisible(false), UNDO_MS);

    try {
      const res = await apiFetch(`/api/workouts/${workoutId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSetId,
          exerciseId: set.exerciseId,
          setNumber: set.setNumber,
          weightKg,
          reps: repsNum,
          isBodyweight: set.isBodyweight,
          completedAt: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        const { data } = await res.json();
        if (data.prBeaten && data.newPrValue !== null) {
          const name = set.exercise?.nameTh ?? set.exercise?.nameEn ?? "";
          onPR(name, data.newPrValue, data.prTypes[0] ?? "max_weight");
        }
        qc.invalidateQueries({ queryKey: ["workout", workoutId] });
        const exerciseName = set.exercise?.nameTh ?? set.exercise?.nameEn ?? "";
        onSetComplete(exerciseName, set.setNumber, weight, reps);
      }
    } catch {
      const clientSetId2 = crypto.randomUUID();
      await enqueue(workoutId, {
        type: "create_set",
        payload: {
          clientSetId: clientSetId2,
          workoutId,
          exerciseId: set.exerciseId,
          setNumber: set.setNumber,
          weightKg,
          reps: repsNum,
          isBodyweight: set.isBodyweight ?? false,
          completedAt: new Date().toISOString(),
        },
      });
      const exerciseName = set.exercise?.nameTh ?? set.exercise?.nameEn ?? "";
      onSetComplete(exerciseName, set.setNumber, weight, reps);
    }
  }, [reps, weight, set, workoutId, qc, onPR, onSetComplete]);

  const handleDeleteRequest = useCallback(() => {
    setDeleteConfirm(true);
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    deleteTimerRef.current = setTimeout(() => setDeleteConfirm(false), 4000);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    try {
      await apiFetch(`/api/sets/${set.id}`, { method: "DELETE" });
    } catch {
      // Ignore network errors — server may be offline; set still removed optimistically
    }
    qc.setQueryData<{ sets: WorkoutSet[] }>(["workout", workoutId], (old) => {
      if (!old) return old;
      return { ...old, sets: old.sets.filter((s) => s.id !== set.id) };
    });
    qc.invalidateQueries({ queryKey: ["workout", workoutId] });
  }, [set.id, workoutId, qc]);

  const handleWarmupToggle = useCallback(async () => {
    const next = !warmup;
    setWarmup(next);
    qc.setQueryData<{ sets: WorkoutSet[] }>(["workout", workoutId], (old) => {
      if (!old) return old;
      return {
        ...old,
        sets: old.sets.map((s) => (s.id === set.id ? { ...s, isWarmup: next } : s)),
      };
    });
    try {
      await apiFetch(`/api/sets/${set.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isWarmup: next }),
      });
    } catch {
      // Revert on failure
      setWarmup(!next);
      qc.setQueryData<{ sets: WorkoutSet[] }>(["workout", workoutId], (old) => {
        if (!old) return old;
        return {
          ...old,
          sets: old.sets.map((s) => (s.id === set.id ? { ...s, isWarmup: !next } : s)),
        };
      });
    }
  }, [warmup, set.id, workoutId, qc]);

  // Completed row
  if (completed) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 14,
          background: deleteConfirm ? "rgba(220,60,40,0.08)" : "rgba(140,100,255,0.08)",
          border: deleteConfirm ? "1px solid rgba(220,60,40,0.4)" : "1px solid var(--violet-edge)",
          minHeight: 52,
          opacity: warmup ? 0.55 : 1,
          transition: "background 0.2s, border-color 0.2s, opacity 0.2s",
        }}
      >
        <span
          className="t-num"
          style={{ fontSize: 14, color: "var(--ink-soft)", width: 20, flexShrink: 0 }}
        >
          {set.setNumber}
        </span>
        <span className="t-num" style={{ flex: 1, fontSize: 15, color: "var(--ink-mute)" }}>
          {weight || "—"} kg × {reps}
          {warmup && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 10,
                color: "var(--ink-faint)",
                fontFamily: "K2D, sans-serif",
                letterSpacing: "0.06em",
              }}
            >
              {t("warmupSet")}
            </span>
          )}
        </span>
        {deleteConfirm ? (
          <button
            type="button"
            onClick={handleDeleteConfirm}
            style={{
              fontFamily: "K2D, sans-serif",
              fontSize: 11,
              color: "var(--danger)",
              background: "rgba(220,60,40,0.12)",
              border: "1px solid rgba(220,60,40,0.35)",
              borderRadius: 8,
              padding: "4px 10px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {t("confirmDelete")}
          </button>
        ) : undoVisible ? (
          <button
            type="button"
            onClick={() => {
              setCompleted(false);
              setUndoVisible(false);
            }}
            style={{
              fontFamily: "K2D, sans-serif",
              fontSize: 11,
              color: "var(--ink-soft)",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--glass-line)",
              borderRadius: 8,
              padding: "4px 10px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {t("undoAdvance")}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDeleteRequest}
            aria-label="ลบเซ็ต"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "var(--ink-faint)",
            }}
          >
            <svg width="13" height="14" viewBox="0 0 13 14" fill="none" aria-hidden="true">
              <path
                d="M1 3h11M4 3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1M5 6v5M8 6v5M2 3l.7 9a1 1 0 0 0 1 .93h5.6a1 1 0 0 0 1-.93L11 3"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={handleWarmupToggle}
          aria-label={t("warmupSet")}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: warmup ? "rgba(255,200,80,0.18)" : "transparent",
            border: warmup ? "1px solid rgba(255,200,80,0.4)" : "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontFamily: "Chakra Petch, monospace",
            fontSize: 10,
            fontWeight: 700,
            color: warmup ? "rgba(255,200,80,0.9)" : "var(--ink-faint)",
            transition: "background 0.15s, border-color 0.15s, color 0.15s",
          }}
        >
          W
        </button>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg, oklch(65% 0.22 280), oklch(60% 0.20 240))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="12" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
            <path
              d="M1 5L5 9L13 1"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    );
  }

  // Active row
  const isPending = status === "pending";
  return (
    <div
      style={{
        borderRadius: 14,
        background: isPending ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.05)",
        border: isPending
          ? "1px solid rgba(255,255,255,0.06)"
          : warmup
            ? "1px solid rgba(255,200,80,0.25)"
            : "1px solid var(--glass-line)",
        opacity: isPending ? 0.6 : warmup ? 0.65 : 1,
        transition: "border-color 0.15s, opacity 0.15s",
      }}
    >
      {prevWeight && prevReps ? (
        <div
          style={{
            padding: "5px 14px 0",
            fontSize: 10,
            color: "var(--ink-faint)",
            fontFamily: "K2D, sans-serif",
            letterSpacing: "0.04em",
          }}
        >
          {t("previousValue", { weight: prevWeight, reps: prevReps })}
        </div>
      ) : null}
      {platesText && (
        <div
          style={{
            padding: "2px 14px 0",
            fontSize: 10,
            color: "var(--violet-bright)",
            fontFamily: "K2D, sans-serif",
            letterSpacing: "0.04em",
          }}
        >
          {platesText}
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          minHeight: 56,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...(isPending
              ? { border: "1px dashed rgba(255,255,255,0.22)" }
              : {
                  border: "2px solid var(--violet-bright)",
                  boxShadow: "0 0 8px var(--violet)",
                  background: "rgba(140,100,255,0.15)",
                }),
          }}
        >
          {!isPending && (
            <span
              className="t-num"
              style={{ fontSize: 11, color: "var(--violet-bright)", lineHeight: 1 }}
            >
              {set.setNumber}
            </span>
          )}
        </div>

        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={weight}
          onChange={(e) => {
            const v = normalizeDecimal(e.target.value);
            setWeight(v);
            setIsSuggestion(false);
            debouncedSave(v, reps);
          }}
          className="t-num"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            textAlign: "center",
            fontSize: 20,
            fontWeight: 700,
            color: isSuggestion ? "var(--ink-soft)" : "var(--ink)",
            minWidth: 0,
            minHeight: 56,
          }}
          aria-label="น้ำหนัก (kg)"
        />

        <span style={{ color: "var(--ink-soft)", fontSize: 16, flexShrink: 0 }}>×</span>

        <input
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={reps}
          onChange={(e) => {
            setReps(e.target.value);
            setIsSuggestion(false);
            debouncedSave(weight, e.target.value);
          }}
          className="t-num"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            textAlign: "center",
            fontSize: 20,
            fontWeight: 700,
            color: isSuggestion ? "var(--ink-soft)" : "var(--ink)",
            minWidth: 0,
            minHeight: 56,
          }}
          aria-label="จำนวนครั้ง"
        />

        <button
          type="button"
          onClick={handleWarmupToggle}
          aria-label={t("warmupSet")}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: warmup ? "rgba(255,200,80,0.18)" : "transparent",
            border: warmup ? "1px solid rgba(255,200,80,0.4)" : "1px solid rgba(255,255,255,0.12)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontFamily: "Chakra Petch, monospace",
            fontSize: 10,
            fontWeight: 700,
            color: warmup ? "rgba(255,200,80,0.9)" : "var(--ink-faint)",
            transition: "background 0.15s, border-color 0.15s, color 0.15s",
          }}
        >
          W
        </button>
        <button
          type="button"
          onClick={handleComplete}
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
            transition: "transform 0.1s",
          }}
          aria-label="เสร็จ"
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
    </div>
  );
}
