import { auth } from "@/lib/auth";
import { getDb, getLastWorkoutSetsForExercise, users } from "@saifit/db";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";

const querySchema = v.object({
  exerciseId: v.pipe(v.string(), v.minLength(1)),
});

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parsed = v.safeParse(querySchema, { exerciseId: searchParams.get("exerciseId") ?? "" });
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.betterAuthId, session.user.id) });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const sets = await getLastWorkoutSetsForExercise(user.id, parsed.output.exerciseId);
  return NextResponse.json({ data: sets });
}
