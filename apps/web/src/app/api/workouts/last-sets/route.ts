import { requireUser } from "@/lib/auth-helpers";
import { getLastWorkoutSetsForExercise } from "@saifit/db";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";

const querySchema = v.object({
  exerciseId: v.pipe(v.string(), v.minLength(1)),
});

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const { searchParams } = new URL(request.url);
  const parsed = v.safeParse(querySchema, { exerciseId: searchParams.get("exerciseId") ?? "" });
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const sets = await getLastWorkoutSetsForExercise(user.id, parsed.output.exerciseId);
  return NextResponse.json({ data: sets });
}
