import { requireUser } from "@/lib/auth-helpers";
import { getDb, workoutSets, workouts } from "@saifit/db";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";

const syncSchema = v.object({
  clientId: v.pipe(v.string(), v.uuid()),
  lastSyncSeq: v.number(),
  pendingOps: v.array(
    v.object({
      seq: v.number(),
      type: v.picklist([
        "create_set",
        "update_set",
        "delete_set",
        "complete_workout",
        "update_workout",
      ]),
      payload: v.unknown(),
    }),
  ),
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

  const parsed = v.safeParse(syncSchema, body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const db = getDb();

  const workout = await db.query.workouts.findFirst({
    where: and(eq(workouts.id, workoutId), eq(workouts.userId, user.id)),
  });
  if (!workout) return NextResponse.json({ error: "Workout not found" }, { status: 404 });

  const accepted: number[] = [];
  const rejected: Array<{ seq: number; reason: string }> = [];

  // Process ops in sequence order — this is the reconciliation logic, NOT blind replay
  const ops = [...parsed.output.pendingOps].sort((a, b) => a.seq - b.seq);

  for (const op of ops) {
    try {
      if (op.type === "create_set") {
        const p = op.payload as {
          clientSetId: string;
          exerciseId: string;
          setNumber: number;
          weightKg: string | null;
          reps: number;
          isBodyweight: boolean;
          completedAt: string;
        };
        // Idempotency check — skip duplicates, don't error
        const dup = await db.query.workoutSets.findFirst({
          where: and(
            eq(workoutSets.workoutId, workoutId),
            eq(workoutSets.clientSetId, p.clientSetId),
          ),
        });
        if (!dup) {
          await db.insert(workoutSets).values({
            workoutId,
            exerciseId: p.exerciseId,
            setNumber: p.setNumber,
            weightKg: p.weightKg ?? null,
            reps: p.reps,
            isBodyweight: p.isBodyweight ?? false,
            clientSetId: p.clientSetId,
            completedAt: new Date(p.completedAt),
          });
        }
        accepted.push(op.seq);
      } else if (op.type === "update_set") {
        const p = op.payload as {
          setId: string;
          weightKg?: string;
          reps?: number;
          notes?: string;
        };
        const updateData: Record<string, unknown> = {};
        if (p.weightKg !== undefined) updateData.weightKg = p.weightKg;
        if (p.reps !== undefined) updateData.reps = p.reps;
        if (p.notes !== undefined) updateData.notes = p.notes;
        if (Object.keys(updateData).length > 0) {
          await db.update(workoutSets).set(updateData).where(eq(workoutSets.id, p.setId));
        }
        accepted.push(op.seq);
      } else if (op.type === "delete_set") {
        const p = op.payload as { setId: string };
        await db.delete(workoutSets).where(eq(workoutSets.id, p.setId));
        accepted.push(op.seq);
      } else if (op.type === "complete_workout" || op.type === "update_workout") {
        const p = op.payload as {
          completedAt?: string;
          durationSeconds?: number;
          name?: string;
          notes?: string;
        };
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (p.completedAt) updateData.completedAt = new Date(p.completedAt);
        if (p.durationSeconds !== undefined) updateData.durationSeconds = p.durationSeconds;
        if (p.name !== undefined) updateData.name = p.name;
        if (p.notes !== undefined) updateData.notes = p.notes;
        await db.update(workouts).set(updateData).where(eq(workouts.id, workoutId));
        accepted.push(op.seq);
      } else {
        rejected.push({ seq: op.seq, reason: "Unknown operation type" });
      }
    } catch (e) {
      rejected.push({ seq: op.seq, reason: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  // Return current server state so client can reconcile local IndexedDB
  const serverSets = await db.query.workoutSets.findMany({
    where: eq(workoutSets.workoutId, workoutId),
  });
  const serverWorkout = await db.query.workouts.findFirst({
    where: eq(workouts.id, workoutId),
  });

  return NextResponse.json({ data: { accepted, rejected, serverSets, serverWorkout } });
}
