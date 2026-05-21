import { requireUser } from "@/lib/auth-helpers";
import { foodLogs, getDb, mealItems } from "@saifit/db";
import { apiSchemas } from "@saifit/shared";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";

const patchSchema = v.object({
  date: apiSchemas.dateString,
  targetKcal: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  targetProteinG: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  targetCarbsG: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  targetFatG: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
});

async function getOrCreateLog(
  db: ReturnType<typeof getDb>,
  userId: string,
  logDate: string,
  userDefaults: {
    defaultTargetKcal: number;
    defaultTargetProteinG: number;
    defaultTargetCarbsG: number;
    defaultTargetFatG: number;
  },
) {
  const existing = await db.query.foodLogs.findFirst({
    where: and(eq(foodLogs.userId, userId), eq(foodLogs.logDate, logDate)),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(foodLogs)
    .values({
      userId,
      logDate,
      targetKcal: userDefaults.defaultTargetKcal,
      targetProteinG: userDefaults.defaultTargetProteinG,
      targetCarbsG: userDefaults.defaultTargetCarbsG,
      targetFatG: userDefaults.defaultTargetFatG,
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  return await db.query.foodLogs.findFirst({
    where: and(eq(foodLogs.userId, userId), eq(foodLogs.logDate, logDate)),
  });
}

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const db = getDb();
  const todayBkk = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  const dateParam = request.nextUrl.searchParams.get("date") ?? todayBkk;

  const log = await getOrCreateLog(db, user.id, dateParam, {
    defaultTargetKcal: user.defaultTargetKcal,
    defaultTargetProteinG: user.defaultTargetProteinG,
    defaultTargetCarbsG: user.defaultTargetCarbsG,
    defaultTargetFatG: user.defaultTargetFatG,
  });

  if (!log) return NextResponse.json({ error: "Failed to get log" }, { status: 500 });

  const items = await db
    .select()
    .from(mealItems)
    .where(eq(mealItems.foodLogId, log.id))
    .orderBy(mealItems.loggedAt);

  return NextResponse.json({ log, items });
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
  if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const db = getDb();
  const { date, targetKcal, targetProteinG, targetCarbsG, targetFatG } = result.output;

  const updateData = Object.fromEntries(
    Object.entries({ targetKcal, targetProteinG, targetCarbsG, targetFatG }).filter(
      ([, v]) => v !== undefined,
    ),
  );

  if (Object.keys(updateData).length === 0) return NextResponse.json({ ok: true });

  const existing = await db.query.foodLogs.findFirst({
    where: and(eq(foodLogs.userId, user.id), eq(foodLogs.logDate, date)),
    columns: { id: true },
  });

  if (existing) {
    await db.update(foodLogs).set(updateData).where(eq(foodLogs.id, existing.id));
  }

  return NextResponse.json({ ok: true });
}
