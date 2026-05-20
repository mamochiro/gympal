import { requireUser } from "@/lib/auth-helpers";
import { getDb, runningSessions } from "@saifit/db";
import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";

const postSchema = v.object({
  runDate: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")),
  distanceKm: v.pipe(v.number(), v.minValue(0.01)),
  durationSeconds: v.pipe(v.number(), v.integer(), v.minValue(1)),
  runType: v.optional(v.picklist(["easy", "tempo", "interval", "long"] as const), "easy"),
  notes: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(500)))),
});

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const db = getDb();
  const rows = await db
    .select()
    .from(runningSessions)
    .where(eq(runningSessions.userId, user.id))
    .orderBy(desc(runningSessions.runDate))
    .limit(30);

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
  const { runDate, distanceKm, durationSeconds, runType, notes } = result.output;
  const avgPaceSecPerKm = distanceKm > 0 ? Math.round(durationSeconds / distanceKm) : null;

  const [row] = await db
    .insert(runningSessions)
    .values({
      userId: user.id,
      runDate,
      distanceKm: String(distanceKm),
      durationSeconds,
      avgPaceSecPerKm,
      runType: runType ?? "easy",
      notes: notes ?? null,
    })
    .returning();

  return NextResponse.json({ data: row });
}
