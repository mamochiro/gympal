import { requireUser } from "@/lib/auth-helpers";
import {
  getDb,
  personalRecords,
  reminderLog,
  streaks,
  subscriptions,
  userPrograms,
  users,
  workoutSets,
  workouts,
} from "@saifit/db";
import { eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";

const patchSchema = v.object({
  goal: v.optional(
    v.picklist(["build_muscle", "lose_fat", "get_stronger", "stay_active"] as const),
  ),
  experienceLevel: v.optional(v.picklist(["beginner", "intermediate", "advanced"] as const)),
  daysPerWeek: v.optional(
    v.pipe(
      v.number(),
      v.check((n) => Number.isInteger(n) && n >= 1 && n <= 7, "Days per week must be 1–7"),
    ),
  ),
  gymType: v.optional(v.picklist(["commercial", "home_equipment", "home_no_equipment"] as const)),
  onboardingCompleted: v.optional(v.boolean()),
  unitsPreference: v.optional(v.picklist(["kg", "lb"] as const)),
  locale: v.optional(v.picklist(["th", "en"] as const)),
  reminderEnabled: v.optional(v.boolean()),
  reminderTime: v.optional(
    v.pipe(v.string(), v.regex(/^\d{2}:\d{2}$/, "Invalid time format HH:MM")),
  ),
  displayName: v.optional(v.pipe(v.string(), v.maxLength(128))),
  avatarUrl: v.optional(v.nullable(v.string())),
  defaultTargetKcal: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(500), v.maxValue(10000)),
  ),
  defaultTargetProteinG: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1000)),
  ),
  defaultTargetCarbsG: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1500))),
  defaultTargetFatG: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(500))),
});

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  return NextResponse.json(user);
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = v.safeParse(patchSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const {
    goal,
    experienceLevel,
    daysPerWeek,
    gymType,
    onboardingCompleted,
    unitsPreference,
    locale,
    reminderEnabled,
    reminderTime,
    displayName,
    avatarUrl,
    defaultTargetKcal,
    defaultTargetProteinG,
    defaultTargetCarbsG,
    defaultTargetFatG,
  } = result.output;
  const updateData = Object.fromEntries(
    Object.entries({
      goal,
      experienceLevel,
      daysPerWeek,
      gymType,
      onboardingCompleted,
      unitsPreference,
      locale,
      reminderEnabled,
      reminderTime,
      displayName,
      avatarUrl,
      defaultTargetKcal,
      defaultTargetProteinG,
      defaultTargetCarbsG,
      defaultTargetFatG,
    }).filter(([, val]) => val !== undefined),
  );

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const db = getDb();
  await db
    .update(users)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const db = getDb();
  const uid = user.id;

  // Delete in dependency order (tables without ON DELETE CASCADE).
  // Tables with CASCADE (bodyMeasurements, runningSessions, foodLogs→mealItems)
  // are cleaned up automatically when the users row is deleted.
  await db.delete(reminderLog).where(eq(reminderLog.userId, uid));
  await db.delete(subscriptions).where(eq(subscriptions.userId, uid));
  await db.delete(personalRecords).where(eq(personalRecords.userId, uid));
  await db.delete(streaks).where(eq(streaks.userId, uid));

  const userWorkoutIds = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(eq(workouts.userId, uid));

  if (userWorkoutIds.length > 0) {
    await db.delete(workoutSets).where(
      inArray(
        workoutSets.workoutId,
        userWorkoutIds.map((w) => w.id),
      ),
    );
  }

  await db.delete(workouts).where(eq(workouts.userId, uid));
  await db.delete(userPrograms).where(eq(userPrograms.userId, uid));
  await db.delete(users).where(eq(users.id, uid));

  return NextResponse.json({ ok: true });
}
