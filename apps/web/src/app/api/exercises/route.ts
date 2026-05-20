import { requireUser } from "@/lib/auth-helpers";
import { exercises, getDb } from "@saifit/db";
import { and, gt, ilike, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";

const listSchema = v.object({
  q: v.optional(v.pipe(v.string(), v.maxLength(100))),
  muscle: v.optional(v.pipe(v.string(), v.maxLength(50))),
  equipment: v.optional(v.pipe(v.string(), v.maxLength(50))),
  cursor: v.optional(v.pipe(v.string(), v.maxLength(128))),
  limit: v.optional(
    v.pipe(v.string(), v.transform(Number), v.integer(), v.minValue(1), v.maxValue(50)),
  ),
});

const exerciseColumns = {
  id: exercises.id,
  slug: exercises.slug,
  nameEn: exercises.nameEn,
  nameTh: exercises.nameTh,
  category: exercises.category,
  muscleGroups: exercises.muscleGroups,
  equipment: exercises.equipment,
  isBodyweight: exercises.isBodyweight,
} as const;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const rawParams = {
    q: searchParams.get("q") ?? undefined,
    muscle: searchParams.get("muscle") ?? undefined,
    equipment: searchParams.get("equipment") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };

  const parsed = v.safeParse(listSchema, rawParams);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const { q = "", muscle, equipment, cursor } = parsed.output;
  const limit = parsed.output.limit ?? 20;

  const db = getDb();

  const conditions: ReturnType<typeof sql>[] = [];

  if (q.trim()) {
    conditions.push(
      or(
        ilike(exercises.nameEn, `%${q}%`),
        ilike(exercises.nameTh, `%${q}%`),
        ilike(exercises.slug, `%${q}%`),
      ) as ReturnType<typeof sql>,
    );
  }

  if (muscle) {
    conditions.push(sql`${exercises.muscleGroups} @> ARRAY[${muscle}]::text[]`);
  }

  if (equipment) {
    conditions.push(sql`${exercises.equipment} = ${equipment}`);
  }

  if (cursor) {
    conditions.push(gt(exercises.slug, cursor) as unknown as ReturnType<typeof sql>);
  }

  const rows = await db
    .select(exerciseColumns)
    .from(exercises)
    .where(conditions.length > 0 ? and(...(conditions as Parameters<typeof and>)) : undefined)
    .orderBy(exercises.slug)
    .limit(limit);

  const nextCursor = rows.length === limit ? (rows[rows.length - 1]?.slug ?? null) : null;

  return NextResponse.json({ data: rows, nextCursor });
}

const createSchema = v.object({
  nameTh: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  nameEn: v.optional(v.pipe(v.string(), v.maxLength(128))),
  category: v.picklist([
    "chest",
    "back",
    "legs",
    "shoulders",
    "arms",
    "core",
    "cardio",
    "full_body",
  ] as const),
  muscleGroups: v.pipe(v.array(v.string()), v.minLength(1)),
  equipment: v.picklist([
    "barbell",
    "dumbbell",
    "machine",
    "cable",
    "bodyweight",
    "kettlebell",
    "band",
    "other",
  ] as const),
  isBodyweight: v.optional(v.boolean()),
});

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

  const result = v.safeParse(createSchema, body);
  if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const db = getDb();
  const { nameTh, nameEn, category, muscleGroups, equipment, isBodyweight } = result.output;
  const slug = `custom-${nameTh
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)}-${Math.random().toString(36).slice(2, 7)}`;

  const [created] = await db
    .insert(exercises)
    .values({
      slug,
      nameTh,
      nameEn: nameEn ?? nameTh,
      category,
      muscleGroups,
      equipment,
      isBodyweight: isBodyweight ?? equipment === "bodyweight",
      difficulty: "beginner",
      beginnerCueEn: "",
      beginnerCueTh: "",
      commonMistakeEn: "",
      commonMistakeTh: "",
      createdBy: user.id,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
