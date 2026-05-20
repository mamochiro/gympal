import { requireUser } from "@/lib/auth-helpers";
import { getDb, runningSessions } from "@saifit/db";
import { and, desc, eq, gte } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

function formatPace(secPerKm: number): string {
  const min = Math.floor(secPerKm / 60);
  const sec = secPerKm % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const db = getDb();
  // Current week Mon–Sun in Asia/Bangkok
  const todayBkk = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  const today = new Date(todayBkk);
  const dayOfWeek = today.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const monStr = monday.toISOString().slice(0, 10);
  const sunStr = sunday.toISOString().slice(0, 10);

  const weekSessions = await db
    .select()
    .from(runningSessions)
    .where(and(eq(runningSessions.userId, user.id), gte(runningSessions.runDate, monStr)))
    .orderBy(runningSessions.runDate);

  const weekSessionsFiltered = weekSessions.filter((r) => r.runDate <= sunStr);

  const sessionsByDate = new Map(weekSessionsFiltered.map((r) => [r.runDate, r]));

  const DAY_NAMES_TH = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
  const DAY_NAMES_EN = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  const weekPlan = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const session = sessionsByDate.get(dateStr);
    return {
      th: DAY_NAMES_TH[i],
      en: DAY_NAMES_EN[i],
      date: dateStr,
      isToday: dateStr === todayBkk,
      session: session
        ? {
            distanceKm: Number(session.distanceKm),
            durationSeconds: session.durationSeconds,
            avgPaceSecPerKm: session.avgPaceSecPerKm,
            runType: session.runType,
          }
        : null,
    };
  });

  const totalKm = weekSessionsFiltered.reduce((s, r) => s + Number(r.distanceKm), 0);
  const longestKm = weekSessionsFiltered.reduce((m, r) => Math.max(m, Number(r.distanceKm)), 0);

  const [latestSession] = await db
    .select()
    .from(runningSessions)
    .where(eq(runningSessions.userId, user.id))
    .orderBy(desc(runningSessions.runDate))
    .limit(1);

  return NextResponse.json({
    weekPlan,
    totalKm: Math.round(totalKm * 10) / 10,
    longestKm: Math.round(longestKm * 10) / 10,
    latestPace:
      latestSession?.avgPaceSecPerKm != null ? formatPace(latestSession.avgPaceSecPerKm) : null,
    weekRange: { from: monStr, to: sunStr },
  });
}
