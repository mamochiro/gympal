import { requireUser } from "@/lib/auth-helpers";
import { bodyMeasurements, getDb } from "@saifit/db";
import { apiSchemas } from "@saifit/shared";
import { and, desc, eq, gte } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";

const postSchema = v.object({
  recordedAt: apiSchemas.dateString,
  weightKg: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0)))),
  bodyFatPct: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0), v.maxValue(100)))),
  chestCm: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0)))),
  waistCm: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0)))),
  armCm: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0)))),
  thighCm: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0)))),
});

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceStr = since.toISOString().slice(0, 10);

  const rows = await db
    .select()
    .from(bodyMeasurements)
    .where(and(eq(bodyMeasurements.userId, user.id), gte(bodyMeasurements.recordedAt, sinceStr)))
    .orderBy(desc(bodyMeasurements.recordedAt));

  return NextResponse.json({ data: rows });
}

export async function POST(request: NextRequest) {
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

  const db = getDb();
  const { recordedAt, weightKg, bodyFatPct, chestCm, waistCm, armCm, thighCm } = result.output;

  const [row] = await db
    .insert(bodyMeasurements)
    .values({
      userId: user.id,
      recordedAt,
      weightKg: weightKg != null ? String(weightKg) : null,
      bodyFatPct: bodyFatPct != null ? String(bodyFatPct) : null,
      chestCm: chestCm != null ? String(chestCm) : null,
      waistCm: waistCm != null ? String(waistCm) : null,
      armCm: armCm != null ? String(armCm) : null,
      thighCm: thighCm != null ? String(thighCm) : null,
    })
    .onConflictDoNothing()
    .returning();

  if (!row) {
    await db
      .update(bodyMeasurements)
      .set({
        weightKg: weightKg != null ? String(weightKg) : null,
        bodyFatPct: bodyFatPct != null ? String(bodyFatPct) : null,
        chestCm: chestCm != null ? String(chestCm) : null,
        waistCm: waistCm != null ? String(waistCm) : null,
        armCm: armCm != null ? String(armCm) : null,
        thighCm: thighCm != null ? String(thighCm) : null,
      })
      .where(
        and(eq(bodyMeasurements.userId, user.id), eq(bodyMeasurements.recordedAt, recordedAt)),
      );
  }

  return NextResponse.json({ ok: true });
}
