import { requireUser } from "@/lib/auth-helpers";
import { exercises, getDb, workoutSets, workouts } from "@saifit/db";
import { estimate1RM } from "@saifit/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const { slug } = await params;

  const db = getDb();

  const exercise = await db.query.exercises.findFirst({ where: eq(exercises.slug, slug) });
  if (!exercise) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select({
      workoutId: workoutSets.workoutId,
      workoutDate: workouts.startedAt,
      maxWeightKg: sql<string | null>`MAX(${workoutSets.weightKg}::numeric)`,
      maxReps: sql<number>`MAX(${workoutSets.reps})`,
    })
    .from(workoutSets)
    .innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
    .where(and(eq(workoutSets.exerciseId, exercise.id), eq(workouts.userId, user.id)))
    .groupBy(workoutSets.workoutId, workouts.startedAt)
    .orderBy(desc(workouts.startedAt))
    .limit(24);

  const data = rows
    .map((r) => {
      const weightKg = r.maxWeightKg !== null ? Number.parseFloat(String(r.maxWeightKg)) : null;
      const reps = Number(r.maxReps);
      return {
        date: r.workoutDate instanceof Date ? r.workoutDate.toISOString() : String(r.workoutDate),
        maxWeightKg: weightKg,
        maxReps: reps,
        estimated1RM: weightKg !== null ? estimate1RM(weightKg, reps) : null,
      };
    })
    .reverse();

  return NextResponse.json({ data });
}
