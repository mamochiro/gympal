import { auth } from "@/lib/auth";
import { exercises, getDb, users, workoutSets, workouts } from "@saifit/db";
import { and, asc, desc, eq, isNotNull, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { WorkoutDetailView } from "./components/workout-detail-view";
import { WorkoutLoggerView } from "./components/workout-logger-view";

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.betterAuthId, session.user.id) });
  if (!user) redirect("/sign-in");

  const workout = await db.query.workouts.findFirst({
    where: and(eq(workouts.id, id), eq(workouts.userId, user.id)),
  });
  if (!workout) notFound();

  const sets = await db
    .select({
      id: workoutSets.id,
      workoutId: workoutSets.workoutId,
      exerciseId: workoutSets.exerciseId,
      setNumber: workoutSets.setNumber,
      reps: workoutSets.reps,
      weightKg: workoutSets.weightKg,
      isBodyweight: workoutSets.isBodyweight,
      isWarmup: workoutSets.isWarmup,
      notes: workoutSets.notes,
      clientSetId: workoutSets.clientSetId,
      completedAt: workoutSets.completedAt,
      exercise: {
        id: exercises.id,
        nameEn: exercises.nameEn,
        nameTh: exercises.nameTh,
        slug: exercises.slug,
        muscleGroups: exercises.muscleGroups,
        equipment: exercises.equipment,
      },
    })
    .from(workoutSets)
    .leftJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(eq(workoutSets.workoutId, id))
    .orderBy(asc(workoutSets.setNumber));

  const initialWorkout = {
    ...workout,
    startedAt:
      workout.startedAt instanceof Date ? workout.startedAt.toISOString() : workout.startedAt,
    completedAt:
      workout.completedAt instanceof Date ? workout.completedAt.toISOString() : workout.completedAt,
    sets: sets.map((s) => ({
      ...s,
      completedAt: s.completedAt instanceof Date ? s.completedAt.toISOString() : s.completedAt,
    })),
  };

  if (initialWorkout.completedAt) {
    return <WorkoutDetailView workout={initialWorkout} />;
  }

  // Fetch previous completed workout's sets for "last session" hints
  const prevWorkout = await db.query.workouts.findFirst({
    where: and(eq(workouts.userId, user.id), isNotNull(workouts.completedAt), ne(workouts.id, id)),
    orderBy: [desc(workouts.startedAt)],
  });

  const prevSets = prevWorkout
    ? await db
        .select({
          exerciseId: workoutSets.exerciseId,
          setNumber: workoutSets.setNumber,
          weightKg: workoutSets.weightKg,
          reps: workoutSets.reps,
        })
        .from(workoutSets)
        .where(eq(workoutSets.workoutId, prevWorkout.id))
        .orderBy(asc(workoutSets.setNumber))
    : [];

  return <WorkoutLoggerView workoutId={id} initialData={initialWorkout} prevSets={prevSets} />;
}
