import { and, eq } from "drizzle-orm";
import type { getDb } from "../client";
import { templates, userPrograms } from "../schema";

type Db = ReturnType<typeof getDb>;

/**
 * Returns the user's active program with its template nested, or null if none exists.
 * Uses an INNER JOIN so the result is only returned when a template is linked.
 */
export async function getUserActiveProgram(db: Db, userId: string) {
  const [row] = await db
    .select({
      id: userPrograms.id,
      userId: userPrograms.userId,
      templateId: userPrograms.templateId,
      startedAt: userPrograms.startedAt,
      endedAt: userPrograms.endedAt,
      isActive: userPrograms.isActive,
      template: {
        id: templates.id,
        nameEn: templates.nameEn,
        nameTh: templates.nameTh,
        descriptionEn: templates.descriptionEn,
        descriptionTh: templates.descriptionTh,
        goal: templates.goal,
        difficulty: templates.difficulty,
        daysPerWeek: templates.daysPerWeek,
        splitJson: templates.splitJson,
      },
    })
    .from(userPrograms)
    .innerJoin(templates, eq(userPrograms.templateId, templates.id))
    .where(and(eq(userPrograms.userId, userId), eq(userPrograms.isActive, true)))
    .limit(1);

  return row ?? null;
}

export type ActiveProgram = NonNullable<Awaited<ReturnType<typeof getUserActiveProgram>>>;
