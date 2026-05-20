import { requireUser } from "@/lib/auth-helpers";
import { foodLogs, getDb, mealItems } from "@saifit/db";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";

const postSchema = v.object({
  mealType: v.picklist(["breakfast", "lunch", "snack", "dinner"] as const),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
  kcal: v.pipe(v.number(), v.integer(), v.minValue(0)),
  proteinG: v.pipe(v.number(), v.minValue(0)),
  carbsG: v.pipe(v.number(), v.minValue(0)),
  fatG: v.pipe(v.number(), v.minValue(0)),
});

const patchSchema = v.object({
  id: v.string(),
  isDone: v.boolean(),
});

const deleteSchema = v.object({
  id: v.string(),
});

async function resolveLog(
  db: ReturnType<typeof getDb>,
  userId: string,
  dateParam: string,
): Promise<string | null> {
  const log = await db.query.foodLogs.findFirst({
    where: and(eq(foodLogs.userId, userId), eq(foodLogs.logDate, dateParam)),
    columns: { id: true },
  });
  return log?.id ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = v.safeParse(postSchema, body);
  if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const db = getDb();
  const logId = await resolveLog(db, user.id, date);
  if (!logId) return NextResponse.json({ error: "Log not found for date" }, { status: 404 });

  const { mealType, name, kcal, proteinG, carbsG, fatG } = result.output;

  const [item] = await db
    .insert(mealItems)
    .values({
      foodLogId: logId,
      mealType,
      name,
      kcal,
      proteinG: String(proteinG),
      carbsG: String(carbsG),
      fatG: String(fatG),
    })
    .returning();

  return NextResponse.json({ data: item });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
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

  const { date } = await params;
  const db = getDb();
  const logId = await resolveLog(db, user.id, date);
  if (!logId) return NextResponse.json({ error: "Log not found" }, { status: 404 });

  const item = await db.query.mealItems.findFirst({
    where: and(eq(mealItems.id, result.output.id), eq(mealItems.foodLogId, logId)),
    columns: { id: true },
  });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  await db
    .update(mealItems)
    .set({ isDone: result.output.isDone })
    .where(eq(mealItems.id, result.output.id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = v.safeParse(deleteSchema, body);
  if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { date } = await params;
  const db = getDb();
  const logId = await resolveLog(db, user.id, date);
  if (!logId) return NextResponse.json({ error: "Log not found" }, { status: 404 });

  const item = await db.query.mealItems.findFirst({
    where: and(eq(mealItems.id, result.output.id), eq(mealItems.foodLogId, logId)),
    columns: { id: true },
  });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  await db.delete(mealItems).where(eq(mealItems.id, result.output.id));

  return NextResponse.json({ ok: true });
}
