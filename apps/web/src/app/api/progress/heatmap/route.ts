import { requireUser } from "@/lib/auth-helpers";
import { getDb, workouts } from "@saifit/db";
import { and, asc, count, eq, gte, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;
  const db = getDb();

  const since = new Date();
  since.setDate(since.getDate() - 364);

  const rows = await db
    .select({
      date: sql<string>`DATE(${workouts.startedAt} AT TIME ZONE 'Asia/Bangkok')`,
      count: count(workouts.id),
    })
    .from(workouts)
    .where(and(eq(workouts.userId, user.id), gte(workouts.startedAt, since)))
    .groupBy(sql`DATE(${workouts.startedAt} AT TIME ZONE 'Asia/Bangkok')`)
    .orderBy(asc(sql`DATE(${workouts.startedAt} AT TIME ZONE 'Asia/Bangkok')`));

  return NextResponse.json({
    data: rows.map((r) => ({ date: r.date, count: Number(r.count) })),
  });
}
