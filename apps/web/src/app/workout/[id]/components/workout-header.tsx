"use client";

import { useTranslations } from "next-intl";

export function WorkoutHeader({
  workoutName,
  elapsedSec,
  showAutoButton,
  onAutoClick,
  showSavedLocally,
  isOnline,
}: {
  workoutName: string;
  elapsedSec: number;
  showAutoButton: boolean;
  onAutoClick: () => void;
  showSavedLocally: boolean;
  isOnline: boolean;
}) {
  const t = useTranslations("workout");
  const h = Math.floor(elapsedSec / 3600);
  const m = Math.floor((elapsedSec % 3600) / 60);
  const s = elapsedSec % 60;
  const formattedElapsed =
    h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return (
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
          {workoutName}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {showAutoButton && (
            <button
              type="button"
              onClick={onAutoClick}
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
              <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor" aria-hidden="true">
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
            {formattedElapsed}
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
  );
}
