import { requireUser } from "@/lib/auth-helpers";
import { getDb, personalRecords, workoutSets, workouts } from "@saifit/db";
import { estimate1RM } from "@saifit/shared";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";

const createSetSchema = v.object({
  clientSetId: v.pipe(v.string(), v.minLength(1), v.maxLength(36)),
  exerciseId: v.pipe(v.string(), v.uuid()),
  setNumber: v.pipe(v.number(), v.integer(), v.minValue(1)),
  weightKg: v.nullable(v.pipe(v.string(), v.maxLength(20))),
  reps: v.pipe(v.number(), v.integer(), v.minValue(0)),
  isBodyweight: v.optional(v.boolean(), false),
  completedAt: v.pipe(v.string(), v.isoTimestamp()),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: workoutId } = await params;
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = v.safeParse(createSetSchema, body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const db = getDb();

  // Verify workout ownership
  const workout = await db.query.workouts.findFirst({
    where: and(eq(workouts.id, workoutId), eq(workouts.userId, user.id)),
  });
  if (!workout) return NextResponse.json({ error: "Workout not found" }, { status: 404 });

  const { clientSetId, exerciseId, setNumber, weightKg, reps, isBodyweight, completedAt } =
    parsed.output;

  // Idempotency: if clientSetId already exists for this workout, return existing
  const existing = await db.query.workoutSets.findFirst({
    where: and(eq(workoutSets.workoutId, workoutId), eq(workoutSets.clientSetId, clientSetId)),
  });
  if (existing) {
    return NextResponse.json({
      data: { ...existing, prBeaten: false, prTypes: [], newPrValue: null },
    });
  }

  // Insert set
  const [newSet] = await db
    .insert(workoutSets)
    .values({
      workoutId,
      exerciseId,
      setNumber,
      weightKg: weightKg ?? null,
      reps,
      isBodyweight: isBodyweight ?? false,
      clientSetId,
      completedAt: new Date(completedAt),
    })
    .returning();

  if (!newSet) return NextResponse.json({ error: "Insert failed" }, { status: 500 });

  // PR detection
  let prBeaten = false;
  const prTypes: string[] = [];
  let newPrValue: number | null = null;

  if (weightKg !== null && reps > 0) {
    const weightNum = Number.parseFloat(weightKg);

    // Check max_weight PR
    const existingWeightPR = await db.query.personalRecords.findFirst({
      where: and(
        eq(personalRecords.userId, user.id),
        eq(personalRecords.exerciseId, exerciseId),
        eq(personalRecords.recordType, "max_weight"),
      ),
    });

    const currentMaxWeight = existingWeightPR
      ? Number.parseFloat(String(existingWeightPR.value))
      : 0;
    if (weightNum > currentMaxWeight) {
      prBeaten = true;
      prTypes.push("max_weight");
      newPrValue = weightNum;
      if (existingWeightPR) {
        await db
          .update(personalRecords)
          .set({
            value: String(weightNum),
            achievedAt: new Date(completedAt),
            workoutSetId: newSet.id,
          })
          .where(eq(personalRecords.id, existingWeightPR.id));
      } else {
        await db.insert(personalRecords).values({
          userId: user.id,
          exerciseId,
          recordType: "max_weight",
          value: String(weightNum),
          achievedAt: new Date(completedAt),
          workoutSetId: newSet.id,
        });
      }
    }

    // Check estimated_1rm PR
    const new1RM = estimate1RM(weightNum, reps);
    if (new1RM !== null) {
      const existing1RMPR = await db.query.personalRecords.findFirst({
        where: and(
          eq(personalRecords.userId, user.id),
          eq(personalRecords.exerciseId, exerciseId),
          eq(personalRecords.recordType, "estimated_1rm"),
        ),
      });
      const current1RM = existing1RMPR ? Number.parseFloat(String(existing1RMPR.value)) : 0;
      if (new1RM > current1RM) {
        prBeaten = true;
        if (!prTypes.includes("estimated_1rm")) prTypes.push("estimated_1rm");
        if (newPrValue === null) newPrValue = new1RM;
        if (existing1RMPR) {
          await db
            .update(personalRecords)
            .set({
              value: String(new1RM),
              achievedAt: new Date(completedAt),
              workoutSetId: newSet.id,
            })
            .where(eq(personalRecords.id, existing1RMPR.id));
        } else {
          await db.insert(personalRecords).values({
            userId: user.id,
            exerciseId,
            recordType: "estimated_1rm",
            value: String(new1RM),
            achievedAt: new Date(completedAt),
            workoutSetId: newSet.id,
          });
        }
      }
    }
  }

  return NextResponse.json({ data: { ...newSet, prBeaten, prTypes, newPrValue } }, { status: 201 });
}
