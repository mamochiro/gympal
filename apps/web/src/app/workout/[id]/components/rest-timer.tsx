"use client";

import { useRestTimerStore } from "@/stores/rest-timer-store";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

const RADIUS = 110;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function RestTimer({ workoutId: _workoutId }: { workoutId: string }) {
  const t = useTranslations("restTimer");
  const {
    duration,
    preferredRestDuration,
    cancel,
    addSeconds,
    getRemaining,
    nextWeight,
    nextReps,
    nextSetNumber,
  } = useRestTimerStore();
  const [remaining, setRemaining] = useState(getRemaining());
  const [savedFlash, setSavedFlash] = useState(false);
  const hapticFiredRef = useRef(false);
  const prevPreferredRef = useRef(preferredRestDuration);

  useEffect(() => {
    if (prevPreferredRef.current !== preferredRestDuration) {
      prevPreferredRef.current = preferredRestDuration;
      setSavedFlash(true);
      const id = setTimeout(() => setSavedFlash(false), 1500);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [preferredRestDuration]);

  useEffect(() => {
    hapticFiredRef.current = false;
    const iv = setInterval(() => {
      const r = getRemaining();
      setRemaining(r);
      if (r <= 0 && !hapticFiredRef.current) {
        hapticFiredRef.current = true;
        if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
      }
    }, 100);
    return () => clearInterval(iv);
  }, [getRemaining]);

  const progress = Math.max(0, Math.min(1, remaining / duration));
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;
  const targetStr = `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`;
  const isDone = remaining <= 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "linear-gradient(180deg, rgba(8,8,16,0.55) 0%, rgba(8,8,16,0.92) 60%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 0,
      }}
    >
      <p className="t-label" style={{ marginBottom: 6 }}>
        REST · {t("resting")}
      </p>

      {/* Ring */}
      <div
        style={{
          position: "relative",
          width: RADIUS * 2 + 20,
          height: RADIUS * 2 + 20,
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${RADIUS * 2 + 20} ${RADIUS * 2 + 20}`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="restGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(78% 0.20 280)" />
              <stop offset="100%" stopColor="oklch(58% 0.20 235)" />
            </linearGradient>
          </defs>
          <circle
            cx={RADIUS + 10}
            cy={RADIUS + 10}
            r={RADIUS}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx={RADIUS + 10}
            cy={RADIUS + 10}
            r={RADIUS}
            stroke={isDone ? "var(--violet)" : "url(#restGrad)"}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${RADIUS + 10} ${RADIUS + 10})`}
            style={{
              filter: "drop-shadow(0 0 12px var(--violet))",
              transition: "stroke-dashoffset 0.1s linear",
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <span
            className="t-num"
            style={{
              fontSize: 76,
              lineHeight: 1,
              letterSpacing: "0.02em",
              color: isDone ? "var(--violet-bright)" : "var(--ink)",
            }}
          >
            {isDone ? t("done") : timeStr}
          </span>
          {!isDone && (
            <span
              style={{
                fontFamily: "system-ui, sans-serif",
                fontSize: 10,
                letterSpacing: "0.15em",
                color: savedFlash ? "var(--violet-bright)" : "var(--ink-soft)",
                fontWeight: 600,
                transition: "color 0.3s",
              }}
            >
              {savedFlash ? "บันทึกแล้ว ✓" : `${targetStr} · ค่าเริ่มต้น`}
            </span>
          )}
        </div>
      </div>

      {/* Next set preview */}
      {(nextWeight || nextReps) && (
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <div
            style={{
              fontFamily: "system-ui, sans-serif",
              fontSize: 9,
              letterSpacing: "0.18em",
              color: "var(--ink-soft)",
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            {`NEXT · ${t("nextSet")}${nextSetNumber ? ` ${nextSetNumber}` : ""}`}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {nextWeight && (
              <>
                <span className="t-num" style={{ fontSize: 28, color: "var(--ink)" }}>
                  {nextWeight}
                </span>
                <span
                  style={{
                    fontFamily: "K2D, sans-serif",
                    fontSize: 14,
                    color: "var(--ink-mute)",
                  }}
                >
                  kg ×
                </span>
              </>
            )}
            {nextReps && (
              <>
                <span className="t-num" style={{ fontSize: 28, color: "var(--ink)" }}>
                  {nextReps}
                </span>
                <span
                  style={{
                    fontFamily: "K2D, sans-serif",
                    fontSize: 14,
                    color: "var(--ink-mute)",
                  }}
                >
                  reps
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Adjustment buttons */}
      <div style={{ marginTop: 28, display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={() => addSeconds(-15)}
          className="btn-glass"
          style={{ padding: "12px 18px" }}
        >
          {t("minus15")}s
        </button>
        <button
          type="button"
          onClick={() => addSeconds(15)}
          className="btn-glass"
          style={{ padding: "12px 18px" }}
        >
          {t("add15")}s
        </button>
        <button
          type="button"
          onClick={() => addSeconds(30)}
          className="btn-glass"
          style={{ padding: "12px 18px" }}
        >
          {t("add30")}s
        </button>
      </div>

      <button
        type="button"
        onClick={cancel}
        className="btn-primary"
        style={{ marginTop: 18, width: 240 }}
      >
        {t("skip")} · SKIP REST
      </button>
    </div>
  );
}
