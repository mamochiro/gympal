"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export function RepeatLastWorkoutCard({
  lastWorkoutId,
  lastWorkoutName,
  daysAgo,
}: {
  lastWorkoutId: string;
  lastWorkoutName: string;
  daysAgo: number;
}) {
  const t = useTranslations("home");
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cloneFromWorkoutId: lastWorkoutId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data } = (await res.json()) as { data: { id: string } };
      return data;
    },
    onSuccess: ({ id }) => {
      router.push(`/workout/${id}`);
    },
  });

  const subtitle =
    daysAgo === 0
      ? t("repeatLastSubtitleToday")
      : daysAgo === 1
        ? t("repeatLastSubtitleYesterday")
        : t("repeatLastSubtitleDaysAgo", { n: daysAgo });

  return (
    <button
      type="button"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="glass"
      style={{
        width: "100%",
        textAlign: "left",
        padding: "14px 18px",
        borderRadius: 16,
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: mutation.isPending ? "wait" : "pointer",
        opacity: mutation.isPending ? 0.6 : 1,
      }}
      aria-label={t("repeatLastAria", { name: lastWorkoutName })}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "rgba(140,100,255,0.15)",
          border: "1px solid var(--violet-edge)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="var(--violet-bright)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2.5 8a5.5 5.5 0 1 1 1.61 3.89M2 12V8h4" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: "K2D, sans-serif",
            fontWeight: 600,
            fontSize: 14,
            color: "var(--ink)",
            lineHeight: 1.25,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {mutation.isPending
            ? t("repeatLastStarting")
            : t("repeatLastTitle", { name: lastWorkoutName })}
        </p>
        <p
          style={{
            fontFamily: "K2D, sans-serif",
            fontSize: 11,
            color: "var(--ink-soft)",
            marginTop: 2,
          }}
        >
          {subtitle}
        </p>
      </div>
      <svg
        width="14"
        height="14"
        viewBox="0 0 20 20"
        fill="none"
        stroke="var(--ink-mute)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M8 4l6 6-6 6" />
      </svg>
    </button>
  );
}
