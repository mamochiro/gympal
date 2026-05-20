import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "./client.js";
import { workoutSets, workouts } from "./schema.js";

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
