import { requireUser } from "@/lib/auth-helpers";
import { bodyMeasurements, getDb } from "@saifit/db";
import { and, desc, eq, gte } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const db = getDb();
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  const since30Str = since30.toISOString().slice(0, 10);

  const since90 = new Date();
  since90.setDate(since90.getDate() - 90);
  const since90Str = since90.toISOString().slice(0, 10);

  const [latest] = await db
    .select()
    .from(bodyMeasurements)
    .where(eq(bodyMeasurements.userId, user.id))
    .orderBy(desc(bodyMeasurements.recordedAt))
    .limit(1);

  const rows30 = await db
    .select()
    .from(bodyMeasurements)
    .where(and(eq(bodyMeasurements.userId, user.id), gte(bodyMeasurements.recordedAt, since30Str)))
    .orderBy(desc(bodyMeasurements.recordedAt));

  const rows90 = await db
    .select()
    .from(bodyMeasurements)
    .where(and(eq(bodyMeasurements.userId, user.id), gte(bodyMeasurements.recordedAt, since90Str)))
    .orderBy(bodyMeasurements.recordedAt);

  const oldest30 = rows30.at(-1);

  const delta = (
    field: "weightKg" | "bodyFatPct" | "chestCm" | "waistCm" | "armCm" | "thighCm",
  ): number | null => {
    if (!latest || !oldest30) return null;
    const cur = latest[field];
    const old = oldest30[field];
    if (cur == null || old == null) return null;
    return Math.round((Number(cur) - Number(old)) * 10) / 10;
  };

  return NextResponse.json({
    latest: latest ?? null,
    deltas: {
      weightKg: delta("weightKg"),
      bodyFatPct: delta("bodyFatPct"),
      chestCm: delta("chestCm"),
      waistCm: delta("waistCm"),
      armCm: delta("armCm"),
      thighCm: delta("thighCm"),
    },
    trend90: rows90.map((r) => ({
      date: r.recordedAt,
      weightKg: r.weightKg != null ? Number(r.weightKg) : null,
    })),
  });
}
