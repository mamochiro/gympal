import { requireUser } from "@/lib/auth-helpers";
import { getDb, userPrograms, workoutSets, workouts } from "@saifit/db";
import { apiSchemas } from "@saifit/shared";
import { and, count, countDistinct, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";

const listSchema = apiSchemas.cursorPaginationSchema(50);

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const { searchParams } = new URL(request.url);
  const rawParams: Record<string, string> = {};
  if (searchParams.get("cursor")) rawParams.cursor = searchParams.get("cursor") as string;
  if (searchParams.get("limit")) rawParams.limit = searchParams.get("limit") as string;

  const parsed = v.safeParse(listSchema, rawParams);
  if (!parsed.success) return NextResponse.json({ error: "Invalid query params" }, { status: 400 });

  const limit = parsed.output.limit ?? 20;
  const cursor = parsed.output.cursor;

  const db = getDb();

  const conditions = [eq(workouts.userId, user.id)];
  if (cursor) conditions.push(lt(workouts.startedAt, new Date(cursor)));

  const workoutList = await db
    .select()
    .from(workouts)
    .where(and(...conditions))
    .orderBy(desc(workouts.startedAt))
    .limit(limit);

  const abandonedThreshold = new Date(Date.now() - 86_400_000);

  if (workoutList.length === 0) {
    return NextResponse.json({ data: [], nextCursor: null });
  }

  const workoutIds = workoutList.map((w) => w.id);

  const aggregates = await db
    .select({
      workoutId: workoutSets.workoutId,
      exerciseCount: countDistinct(workoutSets.exerciseId),
      totalSets: count(workoutSets.id),
      totalVolume: sql<string>`COALESCE(SUM(${workoutSets.reps} * COALESCE(${workoutSets.weightKg}::numeric, 0)), 0)`,
    })
    .from(workoutSets)
    .where(inArray(workoutSets.workoutId, workoutIds))
    .groupBy(workoutSets.workoutId);

  const aggMap = new Map(aggregates.map((a) => [a.workoutId, a]));

  const rows = workoutList.map((w) => {
    const agg = aggMap.get(w.id);
    return {
      ...w,
      exerciseCount: agg?.exerciseCount ?? 0,
      totalSets: agg?.totalSets ?? 0,
      totalVolume: agg ? Number(agg.totalVolume) : 0,
      abandonedWorkout: w.completedAt === null && w.startedAt < abandonedThreshold,
    };
  });

  const nextCursor =
    rows.length === limit ? (rows[rows.length - 1]?.startedAt?.toISOString() ?? null) : null;

  return NextResponse.json({ data: rows, nextCursor });
}

const createSchema = v.object({
  name: v.optional(v.pipe(v.string(), v.maxLength(256))),
  userProgramId: v.optional(v.pipe(v.string(), v.uuid())),
});

export async function POST(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = v.safeParse(createSchema, body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const db = getDb();

  // Verify program belongs to user if provided
  if (parsed.output.userProgramId) {
    const prog = await db.query.userPrograms.findFirst({
      where: and(
        eq(userPrograms.id, parsed.output.userProgramId),
        eq(userPrograms.userId, user.id),
      ),
    });
    if (!prog) return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  const [workout] = await db
    .insert(workouts)
    .values({
      userId: user.id,
      userProgramId: parsed.output.userProgramId ?? null,
      name: parsed.output.name ?? "Workout",
      startedAt: new Date(),
    })
    .returning();

  return NextResponse.json({ data: workout }, { status: 201 });
}
