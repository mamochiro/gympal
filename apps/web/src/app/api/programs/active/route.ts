import { requireUser } from "@/lib/auth-helpers";
import { getDb, templates, userPrograms } from "@saifit/db";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;
  const db = getDb();

  const program = await db
    .select({
      id: userPrograms.id,
      userId: userPrograms.userId,
      templateId: userPrograms.templateId,
      startedAt: userPrograms.startedAt,
      isActive: userPrograms.isActive,
      template: {
        id: templates.id,
        nameEn: templates.nameEn,
        nameTh: templates.nameTh,
        goal: templates.goal,
        difficulty: templates.difficulty,
        daysPerWeek: templates.daysPerWeek,
        splitJson: templates.splitJson,
      },
    })
    .from(userPrograms)
    .leftJoin(templates, eq(userPrograms.templateId, templates.id))
    .where(and(eq(userPrograms.userId, user.id), eq(userPrograms.isActive, true)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!program) return NextResponse.json({ data: null });
  return NextResponse.json({ data: program });
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;
  const db = getDb();

  await db
    .update(userPrograms)
    .set({ isActive: false, endedAt: new Date() })
    .where(and(eq(userPrograms.userId, user.id), eq(userPrograms.isActive, true)));

  return NextResponse.json({ ok: true });
}
