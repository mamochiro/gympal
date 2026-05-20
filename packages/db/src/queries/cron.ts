import { and, eq, gt, isNotNull, sql } from "drizzle-orm";
import type { getDb } from "../client";
import { streaks, users } from "../schema";

type Db = ReturnType<typeof getDb>;

/**
 * Returns users whose reminder hour matches currentHour and who have not already
 * received a 'daily' reminder today (Bangkok time).
 */
export async function getUsersDueForReminder(
  db: Db,
  currentHour: number,
): Promise<Array<{ userId: string; lineUserId: string | null; locale: string }>> {
  return db
    .select({
      userId: users.id,
      lineUserId: users.lineUserId,
      locale: users.locale,
    })
    .from(users)
    .where(
      and(
        eq(users.reminderEnabled, true),
        isNotNull(users.lineUserId),
        sql`EXTRACT(HOUR FROM ${users.reminderTime}::time) = ${currentHour}`,
        sql`NOT EXISTS (
          SELECT 1 FROM reminder_log rl
          WHERE rl.user_id = ${users.id}
          AND rl.reminder_type = 'daily'
          AND DATE(rl.sent_at AT TIME ZONE 'Asia/Bangkok') = DATE(NOW() AT TIME ZONE 'Asia/Bangkok')
        )`,
      ),
    );
}

/**
 * Returns users who have reminders enabled, a LINE user ID, and no workout started
 * today (Bangkok midnight) — indicating they should be nudged.
 */
export async function getUsersWithNoWorkoutToday(
  db: Db,
): Promise<Array<{ userId: string; lineUserId: string | null; locale: string }>> {
  return db
    .select({
      userId: users.id,
      lineUserId: users.lineUserId,
      locale: users.locale,
    })
    .from(users)
    .where(
      and(
        isNotNull(users.lineUserId),
        eq(users.reminderEnabled, true),
        sql`NOT EXISTS (
          SELECT 1 FROM workouts w
          WHERE w.user_id = ${users.id}
          AND w.started_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'Asia/Bangkok'
        )`,
      ),
    );
}

/**
 * Returns users with an active streak (currentStreak > 0) and a LINE user ID,
 * who have not yet completed a workout today (Bangkok time).
 */
export async function getUsersWithActiveStreak(db: Db): Promise<
  Array<{
    userId: string;
    lineUserId: string | null;
    locale: string;
    currentStreak: number;
  }>
> {
  return db
    .select({
      userId: users.id,
      lineUserId: users.lineUserId,
      locale: users.locale,
      currentStreak: streaks.currentStreak,
    })
    .from(users)
    .innerJoin(streaks, eq(streaks.userId, users.id))
    .where(
      and(
        gt(streaks.currentStreak, 0),
        isNotNull(users.lineUserId),
        sql`NOT EXISTS (
          SELECT 1 FROM workouts w
          WHERE w.user_id = ${users.id}
          AND w.completed_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'Asia/Bangkok'
        )`,
      ),
    );
}
