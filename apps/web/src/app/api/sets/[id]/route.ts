import { auth } from "@/lib/auth";
import { getDb, users, workoutSets, workouts } from "@saifit/db";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";

const patchSchema = v.object({
  weightKg: v.optional(v.pipe(v.string(), v.maxLength(20))),
  reps: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  notes: v.optional(v.string()),
  isWarmup: v.optional(v.boolean()),
});

async function resolveSet(request: NextRequest, setId: string) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return { error: "Unauthorized", status: 401 } as const;

  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.betterAuthId, session.user.id) });
  if (!user) return { error: "User not found", status: 404 } as const;

  const set = await db.query.workoutSets.findFirst({ where: eq(workoutSets.id, setId) });
  if (!set) return { error: "Not found", status: 404 } as const;

  const workout = await db.query.workouts.findFirst({
    where: and(eq(workouts.id, set.workoutId), eq(workouts.userId, user.id)),
  });
  if (!workout) return { error: "Forbidden", status: 403 } as const;

  return { set, user, db } as const;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resolved = await resolveSet(request, id);
  if ("error" in resolved)
    return NextResponse.json({ error: resolved.error }, { status: resolved.status as number });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = v.safeParse(patchSchema, body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updateData: Record<string, unknown> = {};
  if (parsed.output.weightKg !== undefined) updateData.weightKg = parsed.output.weightKg;
  if (parsed.output.reps !== undefined) updateData.reps = parsed.output.reps;
  if (parsed.output.notes !== undefined) updateData.notes = parsed.output.notes;
  if (parsed.output.isWarmup !== undefined) updateData.isWarmup = parsed.output.isWarmup;

  if (Object.keys(updateData).length === 0) return NextResponse.json({ ok: true });

  await resolved.db.update(workoutSets).set(updateData).where(eq(workoutSets.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const resolved = await resolveSet(request, id);
  if ("error" in resolved)
    return NextResponse.json({ error: resolved.error }, { status: resolved.status as number });
  await resolved.db.delete(workoutSets).where(eq(workoutSets.id, id));
  return NextResponse.json({ ok: true });
}
