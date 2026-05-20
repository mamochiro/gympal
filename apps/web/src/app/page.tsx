import { Avatar } from "@/components/avatar";
import { BodyFrontIcon } from "@/components/icons";
import { auth } from "@/lib/auth";
import {
  exercises,
  getDb,
  routines,
  streaks,
  templates,
  userPrograms,
  users,
  workouts,
} from "@saifit/db";
import { and, count, desc, eq, gte, inArray, isNotNull, isNull } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import Link from "next/link";

interface SplitDay {
  dayLabel: string;
  exercises: Array<{
    exerciseSlug: string;
    sets: number;
    reps: string;
    notes?: string;
  }>;
}

export default async function HomePage() {
  const t = await getTranslations();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) return null;

  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.betterAuthId, session.user.id),
  });

  if (!user) return null;

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const oneDayAgo = new Date(Date.now() - 86_400_000);

  // Bangkok week start (Monday)
  const todayBkk = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
  const [tyear, tmonth, tday] = todayBkk.split("-").map(Number) as [number, number, number];
  const todayLocal = new Date(tyear, tmonth - 1, tday);
  const dow = todayLocal.getDay();
  const weekStart = new Date(todayLocal);
  weekStart.setDate(todayLocal.getDate() - (dow === 0 ? 6 : dow - 1));

  const [
    streakRow,
    activeProgramRows,
    recentWorkouts,
    inProgressRows,
    thisWeekRows,
    routineCountRows,
  ] = await Promise.all([
    db.query.streaks.findFirst({ where: eq(streaks.userId, user.id) }),
    db
      .select({
        id: userPrograms.id,
        startedAt: userPrograms.startedAt,
        templateId: userPrograms.templateId,
        nameTh: templates.nameTh,
        daysPerWeek: templates.daysPerWeek,
        splitJson: templates.splitJson,
      })
      .from(userPrograms)
      .leftJoin(templates, eq(userPrograms.templateId, templates.id))
      .where(eq(userPrograms.userId, user.id))
      .limit(1),
    db
      .select({ startedAt: workouts.startedAt })
      .from(workouts)
      .where(and(eq(workouts.userId, user.id), gte(workouts.startedAt, fourteenDaysAgo))),
    db
      .select({ id: workouts.id, name: workouts.name, startedAt: workouts.startedAt })
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, user.id),
          isNull(workouts.completedAt),
          gte(workouts.startedAt, oneDayAgo),
        ),
      )
      .orderBy(desc(workouts.startedAt))
      .limit(1),
    db
      .select({ n: count() })
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, user.id),
          isNotNull(workouts.completedAt),
          gte(workouts.completedAt, weekStart),
        ),
      ),
    db.select({ n: count() }).from(routines).where(eq(routines.userId, user.id)),
  ]);

  const inProgressWorkout = inProgressRows[0] ?? null;
  const activeProgram = activeProgramRows[0] ?? null;
  const weeklyCount = thisWeekRows[0]?.n ?? 0;
  const routineCount = routineCountRows[0]?.n ?? 0;
  const weeklyGoal = activeProgram?.daysPerWeek ?? 3;

  const activeDates = new Set(
    recentWorkouts.map((w) => {
      const d = w.startedAt instanceof Date ? w.startedAt : new Date(w.startedAt as string);
      return d.toISOString().split("T")[0] ?? "";
    }),
  );

  const today = new Date();
  const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
  const MONTH_NAMES = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ] as const;
  const kickerDate = `${DAY_NAMES[today.getDay()]}, ${today.getDate()} ${MONTH_NAMES[today.getMonth()]}`;

  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split("T")[0] ?? "";
  });

  let todayDay: SplitDay | null = null;
  let dayIndex = 0;
  if (activeProgram?.splitJson) {
    const splitJson = activeProgram.splitJson as { days: SplitDay[] };
    const startMs =
      activeProgram.startedAt instanceof Date
        ? activeProgram.startedAt.getTime()
        : new Date(activeProgram.startedAt as string).getTime();
    dayIndex = Math.floor((Date.now() - startMs) / 86_400_000) % splitJson.days.length;
    todayDay = splitJson.days[dayIndex] ?? null;
  }

  // Resolve exercise slugs → Thai names for today's plan
  const exerciseNameMap: Record<string, string> = {};
  if (todayDay && todayDay.exercises.length > 0) {
    const slugs = todayDay.exercises.map((e) => e.exerciseSlug);
    const rows = await db
      .select({ slug: exercises.slug, nameTh: exercises.nameTh, nameEn: exercises.nameEn })
      .from(exercises)
      .where(inArray(exercises.slug, slugs));
    for (const row of rows) {
      exerciseNameMap[row.slug] = row.nameTh || row.nameEn;
    }
  }

  return (
    <div className="saifit-bg" style={{ minHeight: "100vh", paddingBottom: 110 }}>
      {/* Body watermark */}
      <div
        className="watermark"
        style={{ top: 0, right: 0, width: 180, height: 340 }}
        aria-hidden="true"
      >
        <BodyFrontIcon size={180} />
      </div>

      <div style={{ position: "relative", padding: "40px 24px 0" }}>
        {/* Header row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div>
            <span className="t-label">SAIFIT · {kickerDate}</span>
            <h1
              style={{
                fontFamily: "K2D, sans-serif",
                fontWeight: 700,
                fontSize: 22,
                color: "var(--ink)",
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
                margin: "6px 0 0",
              }}
            >
              {t("home.greeting")},{" "}
              <span style={{ color: "var(--violet-bright)" }}>{user.displayName}</span>
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link
              href="/settings"
              aria-label="ตั้งค่า"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--glass-line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-mute)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width={17}
                height={17}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
            <Avatar name={user.displayName} />
          </div>
        </div>

        {/* In-progress workout resume card */}
        {inProgressWorkout && (
          <Link
            href={`/workout/${inProgressWorkout.id}`}
            style={{ display: "block", marginBottom: 16, textDecoration: "none" }}
          >
            <div
              className="glass"
              style={{
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                border: "1px solid var(--violet-edge)",
                boxShadow: "0 0 0 1px var(--violet-glow), inset 0 0 20px rgba(130,100,255,0.06)",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, oklch(65% 0.22 280), oklch(60% 0.20 240))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 4px 10px -3px rgba(120,90,255,0.5)",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={18}
                  height={18}
                  fill="currentColor"
                  style={{ color: "white" }}
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: "K2D, sans-serif",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "var(--ink)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {inProgressWorkout.name}
                </p>
                <p
                  style={{
                    fontFamily: "K2D, sans-serif",
                    fontSize: 12,
                    color: "var(--violet-bright)",
                    margin: "2px 0 0",
                  }}
                >
                  {t("home.inProgress")}
                </p>
              </div>
              <svg
                viewBox="0 0 20 20"
                width={16}
                height={16}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--ink-soft)", flexShrink: 0 }}
                aria-hidden="true"
              >
                <path d="M7 4l6 6-6 6" />
              </svg>
            </div>
          </Link>
        )}

        {/* Weekly goal widget */}
        <div
          className="glass"
          style={{
            padding: "14px 18px",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ flex: 1 }}>
            <span className="t-label">{t("home.thisWeek")}</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 3 }}>
              <span className="t-num" style={{ fontSize: 28, color: "var(--ink)" }}>
                {weeklyCount}
              </span>
              <span
                style={{ fontFamily: "K2D, sans-serif", fontSize: 13, color: "var(--ink-mute)" }}
              >
                {t("home.daysGoal", { n: weeklyGoal })}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {(["d1", "d2", "d3", "d4", "d5", "d6", "d7"] as const)
              .slice(0, weeklyGoal)
              .map((key, i) => (
                <div
                  key={key}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: i < weeklyCount ? "var(--violet)" : "rgba(255,255,255,0.1)",
                    boxShadow: i < weeklyCount ? "0 0 6px var(--violet)" : "none",
                    transition: "background 0.2s",
                  }}
                />
              ))}
          </div>
        </div>

        {/* Streak card */}
        {streakRow && (
          <div className="glass glass-glow" style={{ padding: "20px 22px 18px", marginBottom: 16 }}>
            {/* Flame ghost — pure SVG, no client component needed */}
            <div
              style={{
                position: "absolute",
                right: -14,
                bottom: -14,
                opacity: 0.08,
                pointerEvents: "none",
              }}
              aria-hidden="true"
            >
              <svg
                width="96"
                height="96"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ color: "white" }}
                aria-hidden="true"
              >
                <path d="M12 2c0 0-7 5.5-7 11a7 7 0 0 0 14 0c0-5.5-7-11-7-11zm-1 14a1 1 0 0 1-1-1c0-1.5 1-2.5 2-3.5 1 1 2 2 2 3.5a1 1 0 0 1-1 1h-2z" />
              </svg>
            </div>

            <span className="t-label">streak</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "4px 0 16px" }}>
              <span className="t-num" style={{ fontSize: 84, lineHeight: 1, color: "var(--ink)" }}>
                {streakRow.currentStreak}
              </span>
              <span
                style={{
                  fontFamily: "K2D, sans-serif",
                  fontSize: 14,
                  color: "var(--ink-mute)",
                  marginBottom: 8,
                }}
              >
                {t("home.streak")}
              </span>
            </div>

            {/* 14-day mini bars */}
            <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 16 }}>
              {last14Days.map((dateStr) => {
                const active = activeDates.has(dateStr);
                return (
                  <div
                    key={dateStr}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 3,
                      background: active ? "var(--violet)" : "rgba(255,255,255,0.08)",
                      boxShadow: active ? "0 0 6px var(--violet)" : "none",
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* My Routines quick link */}
        <Link
          href="/routines"
          style={{ display: "block", marginBottom: 14, textDecoration: "none" }}
        >
          <div
            className="glass"
            style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--glass-line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width={16}
                height={16}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--violet-bright)" }}
                aria-hidden="true"
              >
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="M9 12h6M9 16h4" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontFamily: "K2D, sans-serif",
                  fontWeight: 600,
                  fontSize: 14,
                  color: "var(--ink)",
                  margin: 0,
                }}
              >
                {t("routines.title")}
              </p>
              <p
                style={{
                  fontFamily: "K2D, sans-serif",
                  fontSize: 12,
                  color: "var(--ink-soft)",
                  margin: "2px 0 0",
                }}
              >
                {routineCount > 0 ? t("routines.count", { n: routineCount }) : t("routines.empty")}
              </p>
            </div>
            <svg
              viewBox="0 0 20 20"
              width={16}
              height={16}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--ink-soft)", flexShrink: 0 }}
              aria-hidden="true"
            >
              <path d="M7 4l6 6-6 6" />
            </svg>
          </div>
        </Link>

        {/* Today's workout */}
        {activeProgram ? (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontFamily: "Chakra Petch, monospace",
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: "0.12em",
                  color: "var(--violet-bright)",
                  textTransform: "uppercase",
                }}
              >
                {activeProgram.nameTh} · DAY {dayIndex + 1}
              </span>
              <span className="t-label">{t("home.todayWorkout")}</span>
            </div>

            {todayDay && (
              <div className="glass" style={{ marginBottom: 16 }}>
                {todayDay.exercises.map((ex, idx) => (
                  <div
                    key={ex.exerciseSlug}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 18px",
                      borderBottom:
                        idx < (todayDay?.exercises.length ?? 0) - 1
                          ? "1px solid var(--glass-line)"
                          : "none",
                    }}
                  >
                    {/* Icon square */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid var(--glass-line)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width={16}
                        height={16}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: "var(--ink-mute)" }}
                        aria-hidden="true"
                      >
                        <path d="M6 5v14M18 5v14M3 8h3M18 8h3M3 16h3M18 16h3M6 8h12M6 16h12" />
                      </svg>
                    </div>

                    {/* Name + hint */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: "K2D, sans-serif",
                          fontSize: 14,
                          fontWeight: 500,
                          color: "var(--ink)",
                          lineHeight: 1.3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {exerciseNameMap[ex.exerciseSlug] ?? ex.exerciseSlug.replace(/-/g, " ")}
                      </p>
                      {ex.notes && (
                        <p
                          style={{
                            fontFamily: "system-ui, sans-serif",
                            fontSize: 10,
                            letterSpacing: "0.08em",
                            color: "var(--ink-soft)",
                            textTransform: "uppercase",
                            marginTop: 2,
                          }}
                        >
                          {ex.notes}
                        </p>
                      )}
                    </div>

                    <span
                      className="t-num"
                      style={{ fontSize: 15, color: "var(--ink-mute)", flexShrink: 0 }}
                    >
                      {ex.sets}×{ex.reps}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!inProgressWorkout && (
              <Link
                href="/workout"
                className="btn-primary"
                style={{ width: "100%", display: "flex" }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={18}
                  height={18}
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                {t("home.startWorkout")}
              </Link>
            )}
          </div>
        ) : (
          <div style={{ padding: "64px 0", textAlign: "center" }}>
            <p
              style={{
                fontFamily: "K2D, sans-serif",
                fontSize: 15,
                color: "var(--ink)",
                fontWeight: 500,
              }}
            >
              {t("home.noProgram")}
            </p>
            <p
              style={{
                fontFamily: "K2D, sans-serif",
                fontSize: 13,
                color: "var(--ink-soft)",
                marginTop: 6,
                lineHeight: 1.5,
              }}
            >
              {t("home.noProgramHint")}
            </p>
            <Link
              href="/templates"
              className="btn-primary"
              style={{ display: "inline-flex", marginTop: 24, minWidth: 200 }}
            >
              {t("home.browseTemplates")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
