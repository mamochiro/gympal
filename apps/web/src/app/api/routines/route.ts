import { requireUser } from "@/lib/auth-helpers";
import { getDb, routineExercises, routines } from "@saifit/db";
import { asc, count, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";

const createSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  notes: v.optional(v.nullable(v.string())),
  exercises: v.array(
    v.object({
      exerciseId: v.pipe(v.string(), v.uuid()),
      targetSets: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(20)),
      targetReps: v.pipe(v.string(), v.minLength(1), v.maxLength(20)),
      targetWeightKg: v.optional(v.nullable(v.number())),
    }),
  ),
});

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const db = getDb();
  const rows = await db
    .select({
      id: routines.id,
      name: routines.name,
      notes: routines.notes,
      lastUsedAt: routines.lastUsedAt,
      createdAt: routines.createdAt,
      exerciseCount: count(routineExercises.id),
    })
    .from(routines)
    .leftJoin(routineExercises, eq(routineExercises.routineId, routines.id))
    .where(eq(routines.userId, user.id))
    .groupBy(routines.id)
    .orderBy(asc(routines.createdAt));

  return NextResponse.json({ data: rows });
}

export async function POST(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const body = await request.json();
  const parsed = v.safeParse(createSchema, body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { name, notes, exercises: exList } = parsed.output;

  const db = getDb();
  const [routine] = await db
    .insert(routines)
    .values({ userId: user.id, name, notes: notes ?? null })
    .returning();

  if (!routine) return NextResponse.json({ error: "Failed to create" }, { status: 500 });

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

  return NextResponse.json({ data: { id: routine.id } }, { status: 201 });
}
