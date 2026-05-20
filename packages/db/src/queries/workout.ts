import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "../client";
import { streaks, workoutSets, workouts } from "../schema";

type Db = ReturnType<typeof getDb>;

/**
 * Returns the user's most recent sets for a given exercise (from the latest
 * completed workout). Used by the workout logger to prefill last-session values.
 */
export async function getLastWorkoutSetsForExercise(
  userId: string,
  exerciseId: string,
): Promise<{ reps: number; weightKg: string | null; isWarmup: boolean }[]> {
  const db = getDb();

  const lastWorkout = await db
    .select({ id: workouts.id })
    .from(workouts)
    .innerJoin(workoutSets, eq(workoutSets.workoutId, workouts.id))
    .where(
      and(
        eq(workouts.userId, userId),
        eq(workoutSets.exerciseId, exerciseId),
        isNotNull(workouts.completedAt),
      ),
    )
    .orderBy(desc(workouts.startedAt))
    .limit(1);

  if (!lastWorkout[0]) return [];

  return db
    .select({
      reps: workoutSets.reps,
      weightKg: workoutSets.weightKg,
      isWarmup: workoutSets.isWarmup,
    })
    .from(workoutSets)
    .where(
      and(eq(workoutSets.workoutId, lastWorkout[0].id), eq(workoutSets.exerciseId, exerciseId)),
    )
    .orderBy(workoutSets.setNumber);
}

/**
 * Returns a weekly summary for a user: workout count, total volume (kg × reps),
 * current streak days, and longest streak. Uses 3 separate queries.
 */
export async function getWeeklySummary(
  db: Db,
  userId: string,
): Promise<{
  workoutCount: number;
  totalVolume: number;
  streakDays: number;
  longestStreak: number;
}> {
  const [countRow] = await db
    .select({ value: sql<number>`COUNT(*)::int` })
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        isNotNull(workouts.completedAt),
        sql`${workouts.completedAt} >= NOW() - INTERVAL '7 days'`,
      ),
    );

  const [volRow] = await db
    .select({
      value: sql<number>`COALESCE(SUM(${workoutSets.weightKg}::numeric * ${workoutSets.reps}::numeric), 0)::float`,
    })
    .from(workoutSets)
    .innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
    .where(
      and(
        eq(workouts.userId, userId),
        isNotNull(workouts.completedAt),
        sql`${workouts.completedAt} >= NOW() - INTERVAL '7 days'`,
        isNotNull(workoutSets.weightKg),
      ),
    );

  const [streakRow] = await db
    .select({ currentStreak: streaks.currentStreak, longestStreak: streaks.longestStreak })
    .from(streaks)
    .where(eq(streaks.userId, userId))
    .limit(1);

  return {
    workoutCount: Number(countRow?.value ?? 0),
    totalVolume: Number(volRow?.value ?? 0),
    streakDays: streakRow?.currentStreak ?? 0,
    longestStreak: streakRow?.longestStreak ?? 0,
  };
}
