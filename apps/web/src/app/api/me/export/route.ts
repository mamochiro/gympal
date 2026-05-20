import { requireUser } from "@/lib/auth-helpers";
import { getDb, workouts } from "@saifit/db";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const db = getDb();
  const workoutRows = await db.query.workouts.findMany({
    where: eq(workouts.userId, user.id),
    with: { sets: true },
    orderBy: (w, { desc }) => [desc(w.startedAt)],
  });

  const payload = JSON.stringify({ user, workouts: workoutRows }, null, 2);

  return new NextResponse(payload, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="saifit-export.json"',
    },
  });
}
