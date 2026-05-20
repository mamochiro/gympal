import { requireUser } from "@/lib/auth-helpers";
import { getDb, workouts } from "@saifit/db";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;
  const db = getDb();

  const original = await db.query.workouts.findFirst({
    where: and(eq(workouts.id, id), eq(workouts.userId, user.id)),
  });
  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [newWorkout] = await db
    .insert(workouts)
    .values({ userId: user.id, name: original.name, startedAt: new Date() })
    .returning();

  if (!newWorkout) return NextResponse.json({ error: "Failed to create" }, { status: 500 });

  return NextResponse.json({ data: { id: newWorkout.id } }, { status: 201 });
}
