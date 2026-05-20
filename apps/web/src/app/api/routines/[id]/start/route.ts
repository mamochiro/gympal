import { requireUser } from "@/lib/auth-helpers";
import { getDb, routines, workouts } from "@saifit/db";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;
  const db = getDb();

  const { id } = await params;
  const routine = await db.query.routines.findFirst({
    where: and(eq(routines.id, id), eq(routines.userId, user.id)),
  });
  if (!routine) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const [workout] = await db
    .insert(workouts)
    .values({
      userId: user.id,
      name: routine.name,
      startedAt: now,
    })
    .returning();

  if (!workout) return NextResponse.json({ error: "Failed to create workout" }, { status: 500 });

  await db.update(routines).set({ lastUsedAt: now }).where(eq(routines.id, routine.id));

  return NextResponse.json({ data: { workoutId: workout.id, routineId: routine.id } });
}
