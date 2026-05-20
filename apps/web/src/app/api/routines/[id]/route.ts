import { requireUser } from "@/lib/auth-helpers";
import { exercises, getDb, routineExercises, routines } from "@saifit/db";
import { and, asc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";

const updateSchema = v.object({
  name: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
  notes: v.optional(v.nullable(v.string())),
  exercises: v.optional(
    v.array(
      v.object({
        exerciseId: v.pipe(v.string(), v.uuid()),
        targetSets: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(20)),
        targetReps: v.pipe(v.string(), v.minLength(1), v.maxLength(20)),
        targetWeightKg: v.optional(v.nullable(v.number())),
      }),
    ),
  ),
});

async function resolveRoutine(routineId: string, userId: string) {
  const db = getDb();
  return db.query.routines.findFirst({
    where: and(eq(routines.id, routineId), eq(routines.userId, userId)),
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;
  const db = getDb();

  const { id } = await params;
  const routine = await resolveRoutine(id, user.id);
  if (!routine) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const exRows = await db
    .select({
      id: routineExercises.id,
      exerciseId: routineExercises.exerciseId,
      nameEn: exercises.nameEn,
      nameTh: exercises.nameTh,
      muscleGroups: exercises.muscleGroups,
      orderIndex: routineExercises.orderIndex,
      targetSets: routineExercises.targetSets,
      targetReps: routineExercises.targetReps,
      targetWeightKg: routineExercises.targetWeightKg,
    })
    .from(routineExercises)
    .innerJoin(exercises, eq(routineExercises.exerciseId, exercises.id))
    .where(eq(routineExercises.routineId, routine.id))
    .orderBy(asc(routineExercises.orderIndex));

  return NextResponse.json({ data: { ...routine, exercises: exRows } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;
  const db = getDb();

  const { id } = await params;
  const routine = await resolveRoutine(id, user.id);
  if (!routine) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = v.safeParse(updateSchema, body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { name, notes, exercises: exList } = parsed.output;

  if (name !== undefined || notes !== undefined) {
    await db
      .update(routines)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(notes !== undefined ? { notes: notes ?? null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(routines.id, routine.id));
  }

  if (exList !== undefined) {
    await db.delete(routineExercises).where(eq(routineExercises.routineId, routine.id));
    if (exList.length > 0) {
      await db.insert(routineExercises).values(
        exList.map((ex, i) => ({
          routineId: routine.id,
          exerciseId: ex.exerciseId,
          orderIndex: i,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          targetWeightKg: ex.targetWeightKg != null ? String(ex.targetWeightKg) : null,
        })),
      );
    }
  }

  return NextResponse.json({ data: { id: routine.id } });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;
  const db = getDb();

  const { id } = await params;
  const routine = await resolveRoutine(id, user.id);
  if (!routine) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(routines).where(eq(routines.id, routine.id));
  return new NextResponse(null, { status: 204 });
}
