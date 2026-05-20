import { requireUser } from "@/lib/auth-helpers";
import { exercises, getDb, personalRecords } from "@saifit/db";
import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;
  const db = getDb();

  const rows = await db
    .select({
      exerciseId: personalRecords.exerciseId,
      slug: exercises.slug,
      nameEn: exercises.nameEn,
      nameTh: exercises.nameTh,
      recordType: personalRecords.recordType,
      value: personalRecords.value,
      achievedAt: personalRecords.achievedAt,
    })
    .from(personalRecords)
    .innerJoin(exercises, eq(personalRecords.exerciseId, exercises.id))
    .where(eq(personalRecords.userId, user.id))
    .orderBy(desc(personalRecords.achievedAt));

  const groupMap = new Map<
    string,
    {
      exerciseId: string;
      slug: string;
      nameEn: string;
      nameTh: string;
      records: Array<{ recordType: string; value: number; achievedAt: string }>;
    }
  >();

  for (const row of rows) {
    if (!groupMap.has(row.exerciseId)) {
      groupMap.set(row.exerciseId, {
        exerciseId: row.exerciseId,
        slug: row.slug,
        nameEn: row.nameEn,
        nameTh: row.nameTh,
        records: [],
      });
    }
    const entry = groupMap.get(row.exerciseId);
    if (entry) {
      entry.records.push({
        recordType: row.recordType,
        value: Number.parseFloat(String(row.value)),
        achievedAt:
          row.achievedAt instanceof Date ? row.achievedAt.toISOString() : String(row.achievedAt),
      });
    }
  }

  return NextResponse.json({ data: Array.from(groupMap.values()) });
}
