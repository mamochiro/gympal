"use client";

import { enqueue } from "@/lib/workout-queue";
import { useRestTimerStore } from "@/stores/rest-timer-store";
import { normalizeDecimal } from "@saifit/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
const CIRCLE_R = 52;
const CIRCLE_C = 2 * Math.PI * CIRCLE_R;

export interface GuidedSet {
  setId: string;
  exerciseId: string;
  exerciseName: string;
  exerciseSlug?: string | undefined;
  muscleGroups: string[];
  setNumber: number;
  totalSets: number;
  isCompleted: boolean;
  existingWeight: string | null;
  existingReps: number;
  prevWeight: string | null | undefined;
  prevReps: number | null | undefined;
  isBodyweight: boolean;
}

type Phase = "log" | "rest" | "done";

function fmt(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function GuidedWorkoutView({
  workoutId,
  startedAt,
  sequence,
  isOnline,
  onPause,
}: {
  workoutId: string;
  startedAt: string;
  sequence: GuidedSet[];
  isOnline: boolean;
  onPause: () => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();

  const firstIncomplete = sequence.findIndex((s) => !s.isCompleted);
  const startIdx = firstIncomplete === -1 ? sequence.length : firstIncomplete;

  const preferredRestDuration = useRestTimerStore((s) => s.preferredRestDuration);

  const [currentIdx, setCurrentIdx] = useState(startIdx);
  const [phase, setPhase] = useState<Phase>(startIdx >= sequence.length ? "done" : "log");
  const [restSec, setRestSec] = useState(preferredRestDuration);
  const [saving, setSaving] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const current = sequence[currentIdx];
  const next = sequence[currentIdx + 1];

  const [weight, setWeight] = useState(() => {
    if (!current) return "";
    return current.existingWeight ?? current.prevWeight ?? "";
  });
  const [reps, setReps] = useState(() => {
    if (!current) return "";
    if (current.existingReps > 0) return String(current.existingReps);
    return current.prevReps ? String(current.prevReps) : "";
  });

  // Stable ref for advance — avoids stale closure in interval
  const stateRef = useRef({ currentIdx, sequence, weight, reps, preferredRestDuration });
  useEffect(() => {
    stateRef.current = { currentIdx, sequence, weight, reps, preferredRestDuration };
  });

  // Elapsed timer
  useEffect(() => {
    const startMs = new Date(startedAt).getTime();
    setElapsedSec(Math.floor((Date.now() - startMs) / 1000));
    const iv = setInterval(() => setElapsedSec(Math.floor((Date.now() - startMs) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [startedAt]);

  const advanceToNext = useCallback(() => {
    const {
      currentIdx: idx,
      sequence: seq,
      weight: lw,
      reps: lr,
      preferredRestDuration: prd,
    } = stateRef.current;
    const nextIdx = idx + 1;
    if (nextIdx >= seq.length) {
      setPhase("done");
      return;
    }
    const cur = seq[idx];
    const nxt = seq[nextIdx];
    setCurrentIdx(nextIdx);
    setPhase("log");
    setRestSec(prd);
    if (!nxt) return;
    const sameExercise = nxt.exerciseId === cur?.exerciseId;
    setWeight(sameExercise && lw ? lw : (nxt.prevWeight ?? ""));
    setReps(sameExercise && lr ? lr : nxt.prevReps ? String(nxt.prevReps) : "");
  }, []);

  // Rest countdown
  useEffect(() => {
    if (phase !== "rest") return;
    if (restSec <= 0) {
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {}
      advanceToNext();
      return;
    }
    const id = setTimeout(() => setRestSec((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, restSec, advanceToNext]);

  const completeMutation = useMutation({
    mutationFn: () => {
      const durationSeconds = Math.round((Date.now() - new Date(startedAt).getTime()) / 1000);
      return fetch(`/api/workouts/${workoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedAt: new Date().toISOString(), durationSeconds }),
      });
    },
    onSuccess: () => router.push(`/workout/summary/${workoutId}`),
  });

  const handleComplete = useCallback(async () => {
    const repsNum = Number.parseInt(reps, 10);
    if (Number.isNaN(repsNum) || repsNum <= 0 || !current) return;
    const weightKg = weight ? normalizeDecimal(weight) : null;
    setSaving(true);
    try {
      const res = await fetch(`/api/workouts/${workoutId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSetId: crypto.randomUUID(),
          exerciseId: current.exerciseId,
          setNumber: current.setNumber,
          weightKg,
          reps: repsNum,
          isBodyweight: !weightKg,
          completedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      qc.invalidateQueries({ queryKey: ["workout", workoutId] });
    } catch {
      await enqueue(workoutId, {
        type: "create_set",
        payload: {
          clientSetId: crypto.randomUUID(),
          workoutId,
          exerciseId: current.exerciseId,
          setNumber: current.setNumber,
          weightKg,
          reps: repsNum,
          isBodyweight: !weightKg,
          completedAt: new Date().toISOString(),
        },
      });
      qc.invalidateQueries({ queryKey: ["workout", workoutId] });
    } finally {
      setSaving(false);
    }

    const isLast = currentIdx + 1 >= sequence.length;
    if (isLast) {
      setPhase("done");
    } else {
      setPhase("rest");
    }
  }, [reps, weight, current, workoutId, currentIdx, sequence.length, qc]);

  const completedCount = phase === "log" ? currentIdx : currentIdx + 1;
  const total = sequence.length;
  const restPct = restSec / preferredRestDuration;
  const arcLen = CIRCLE_C * restPct;

  // ── Done screen ──────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <div
        className="saifit-bg"
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          zIndex: 50,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "linear-gradient(135deg, oklch(65% 0.22 280), oklch(60% 0.20 240))",
            boxShadow: "0 0 40px rgba(120,90,255,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <svg width="36" height="28" viewBox="0 0 36 28" fill="none" aria-hidden="true">
            <path
              d="M2 14L13 25L34 3"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2
          style={{
            fontFamily: "K2D, sans-serif",
            fontWeight: 700,
            fontSize: 26,
            color: "var(--ink)",
            textAlign: "center",
            margin: "0 0 8px",
          }}
        >
          ทำได้ดีมาก!
        </h2>
        <p
          style={{
            fontFamily: "K2D, sans-serif",
            fontSize: 15,
            color: "var(--ink-soft)",
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          {total} เซ็ต · {fmt(elapsedSec)}
        </p>
        {!isOnline && (
          <p
            style={{
              fontFamily: "K2D, sans-serif",
              fontSize: 12,
              color: "var(--ink-soft)",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--glass-line)",
              borderRadius: 999,
              padding: "4px 12px",
              marginBottom: 12,
            }}
          >
            ออฟไลน์ — บันทึกในเครื่องแล้ว
          </p>
        )}
        <button
          type="button"
          onClick={() => completeMutation.mutate()}
          disabled={completeMutation.isPending || !isOnline}
          className="btn-primary"
          style={{ minWidth: 220, marginBottom: 12, height: 56 }}
        >
          {completeMutation.isPending ? "..." : "จบการออกกำลังกาย"}
        </button>
        <button
          type="button"
          onClick={onPause}
          style={{
            fontFamily: "K2D, sans-serif",
            fontSize: 13,
            color: "var(--ink-soft)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "8px 16px",
          }}
        >
          ดูรายการเซ็ต
        </button>
      </div>
    );
  }

  // ── Rest screen ──────────────────────────────────────────────────────────
  if (phase === "rest") {
    return (
      <div
        className="saifit-bg"
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: "52px 28px 44px",
          zIndex: 50,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          <span
            className="t-num"
            style={{
              fontSize: 13,
              color: "var(--violet-bright)",
              background: "rgba(140,100,255,0.1)",
              border: "1px solid var(--violet-edge)",
              borderRadius: 999,
              padding: "3px 10px",
            }}
          >
            {completedCount}/{total} เซ็ต
          </span>
          <button
            type="button"
            onClick={onPause}
            style={{
              fontFamily: "K2D, sans-serif",
              fontSize: 13,
              color: "var(--ink-soft)",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--glass-line)",
              borderRadius: 20,
              padding: "6px 16px",
              cursor: "pointer",
            }}
          >
            หยุดพัก
          </button>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            className="t-label"
            style={{ marginBottom: 24, letterSpacing: "0.12em", fontSize: 10 }}
          >
            พักก่อนนะ
          </span>

          <div style={{ position: "relative", width: 148, height: 148 }}>
            <svg
              width="148"
              height="148"
              style={{ transform: "rotate(-90deg)" }}
              aria-hidden="true"
            >
              <circle
                cx="74"
                cy="74"
                r={CIRCLE_R}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="7"
              />
              <circle
                cx="74"
                cy="74"
                r={CIRCLE_R}
                fill="none"
                stroke="var(--violet)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${arcLen} ${CIRCLE_C}`}
                style={{
                  transition: "stroke-dasharray 0.95s linear",
                  filter: "drop-shadow(0 0 8px var(--violet))",
                }}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="t-num" style={{ fontSize: 46, color: "var(--ink)" }}>
                {restSec}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
            <button
              type="button"
              onClick={() => setRestSec((s) => Math.max(5, s - 15))}
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--glass-line)",
                fontFamily: "Chakra Petch, monospace",
                fontSize: 13,
                color: "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              −15
            </button>
            <button
              type="button"
              onClick={() => setRestSec((s) => s + 15)}
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--glass-line)",
                fontFamily: "Chakra Petch, monospace",
                fontSize: 13,
                color: "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              +15
            </button>
          </div>

          {next && (
            <div style={{ marginTop: 32, textAlign: "center" }}>
              <span
                className="t-label"
                style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--ink-faint)" }}
              >
                ต่อไป
              </span>
              <p
                style={{
                  fontFamily: "K2D, sans-serif",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--ink-mute)",
                  margin: "5px 0 0",
                }}
              >
                {next.exerciseName}
              </p>
              <p
                style={{
                  fontFamily: "K2D, sans-serif",
                  fontSize: 12,
                  color: "var(--ink-faint)",
                  margin: "2px 0 0",
                }}
              >
                เซ็ต {next.setNumber}/{next.totalSets}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={advanceToNext}
          style={{
            width: "100%",
            height: 54,
            borderRadius: 18,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--glass-line)",
            fontFamily: "K2D, sans-serif",
            fontSize: 15,
            color: "var(--ink-soft)",
            cursor: "pointer",
          }}
        >
          ข้ามการพัก →
        </button>
      </div>
    );
  }

  // ── Log screen ───────────────────────────────────────────────────────────
  return (
    <div
      className="saifit-bg"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        padding: "52px 28px 44px",
        zIndex: 50,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <span
          className="t-num"
          style={{
            fontSize: 13,
            color: "var(--violet-bright)",
            background: "rgba(140,100,255,0.1)",
            border: "1px solid var(--violet-edge)",
            borderRadius: 999,
            padding: "3px 10px",
          }}
        >
          {fmt(elapsedSec)}
        </span>
        <button
          type="button"
          onClick={onPause}
          style={{
            fontFamily: "K2D, sans-serif",
            fontSize: 13,
            color: "var(--ink-soft)",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid var(--glass-line)",
            borderRadius: 20,
            padding: "6px 16px",
            cursor: "pointer",
          }}
        >
          หยุดพัก
        </button>
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 3, marginBottom: 32 }}>
        {sequence.map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: positional progress bar
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i < completedCount ? "var(--violet)" : "rgba(255,255,255,0.08)",
              boxShadow: i < completedCount ? "0 0 4px var(--violet)" : "none",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {/* Exercise label */}
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <span className="t-label" style={{ fontSize: 9, letterSpacing: "0.14em" }}>
            {completedCount + 1}/{total} · เซ็ต {current?.setNumber}/{current?.totalSets}
          </span>
          <h2
            style={{
              fontFamily: "K2D, sans-serif",
              fontWeight: 700,
              fontSize: 30,
              color: "var(--ink)",
              margin: "8px 0 4px",
              lineHeight: 1.2,
              textAlign: "center",
            }}
          >
            {current?.exerciseName}
          </h2>
          {current?.muscleGroups && current.muscleGroups.length > 0 && (
            <p
              style={{
                fontFamily: "system-ui, sans-serif",
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-soft)",
                margin: 0,
                textAlign: "center",
              }}
            >
              {current.muscleGroups.join(" · ")}
            </p>
          )}
        </div>

        {/* Inputs */}
        <div className="glass" style={{ padding: "20px 20px 24px", marginBottom: 20 }}>
          {current?.prevWeight && current.prevReps ? (
            <p
              style={{
                fontFamily: "K2D, sans-serif",
                fontSize: 11,
                color: "var(--ink-faint)",
                textAlign: "center",
                marginBottom: 14,
                letterSpacing: "0.04em",
              }}
            >
              ครั้งก่อน: {current.prevWeight} kg × {current.prevReps}
            </p>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <span
                style={{
                  fontFamily: "K2D, sans-serif",
                  fontSize: 10,
                  color: "var(--ink-faint)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: 4,
                }}
                aria-hidden="true"
              >
                กก.
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={weight}
                onChange={(e) => setWeight(normalizeDecimal(e.target.value))}
                className="t-num"
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  textAlign: "center",
                  fontSize: 52,
                  fontWeight: 700,
                  color: "var(--ink)",
                  minHeight: 72,
                }}
                aria-label="น้ำหนัก (kg)"
              />
            </div>
            <span style={{ color: "var(--ink-soft)", fontSize: 30, flexShrink: 0 }}>×</span>
            <div style={{ flex: 1, textAlign: "center" }}>
              <span
                style={{
                  fontFamily: "K2D, sans-serif",
                  fontSize: 10,
                  color: "var(--ink-faint)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: 4,
                }}
                aria-hidden="true"
              >
                ครั้ง
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="t-num"
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  textAlign: "center",
                  fontSize: 52,
                  fontWeight: 700,
                  color: "var(--ink)",
                  minHeight: 72,
                }}
                aria-label="จำนวนครั้ง"
              />
            </div>
          </div>
        </div>

        {/* Complete button */}
        <button
          type="button"
          onClick={handleComplete}
          disabled={saving}
          style={{
            width: "100%",
            height: 74,
            borderRadius: 22,
            background: "linear-gradient(135deg, oklch(65% 0.22 280), oklch(60% 0.20 240))",
            boxShadow: "0 14px 36px -8px rgba(120,90,255,0.55)",
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            opacity: saving ? 0.6 : 1,
            transition: "transform 0.1s, opacity 0.15s",
          }}
          aria-label="เสร็จแล้ว"
        >
          <svg width="24" height="18" viewBox="0 0 24 18" fill="none" aria-hidden="true">
            <path
              d="M1.5 9L9 16.5L22.5 1.5"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontFamily: "K2D, sans-serif",
              fontWeight: 700,
              fontSize: 20,
              color: "white",
            }}
          >
            เสร็จแล้ว!
          </span>
        </button>
      </div>

      {/* Next up hint */}
      {next && (
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <span
            className="t-label"
            style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.1em" }}
          >
            ต่อไป
          </span>
          <p
            style={{
              fontFamily: "K2D, sans-serif",
              fontSize: 13,
              color: "var(--ink-faint)",
              margin: "3px 0 0",
            }}
          >
            {next.exerciseName} · เซ็ต {next.setNumber}
          </p>
        </div>
      )}
    </div>
  );
}
