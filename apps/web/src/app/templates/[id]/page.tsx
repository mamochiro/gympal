import { auth } from "@/lib/auth";
import { getDb, templates, userPrograms, users } from "@saifit/db";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { StartProgramButton } from "./StartProgramButton";

interface SplitDay {
  dayLabel: string;
  exercises: Array<{
    exerciseSlug: string;
    sets: number;
    reps: string;
    notes?: string;
  }>;
}

interface SplitJson {
  days: SplitDay[];
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("templates");
  const db = getDb();

  const template = await db.query.templates.findFirst({
    where: eq(templates.id, id),
  });

  if (!template) notFound();

  // Check if this is the user's active program
  let isActiveProgram = false;
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    const user = await db.query.users.findFirst({
      where: eq(users.betterAuthId, session.user.id),
    });
    if (user) {
      const activeProgram = await db.query.userPrograms.findFirst({
        where: eq(userPrograms.userId, user.id),
      });
      isActiveProgram = activeProgram?.isActive === true && activeProgram?.templateId === id;
    }
  }

  const splitJson = template.splitJson as SplitJson;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="px-4 pt-10 pb-6 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs border border-border rounded-full px-2.5 py-0.5 text-muted-foreground">
            {t(`difficultyLabels.${template.difficulty}` as Parameters<typeof t>[0])}
          </span>
          <span className="text-xs text-muted-foreground">
            {t(`goals.${template.goal}` as Parameters<typeof t>[0])}
          </span>
        </div>
        <h1 className="text-2xl font-bold leading-[1.7]">{template.nameTh}</h1>
        <p className="text-sm text-muted-foreground mt-1">{template.nameEn}</p>

        <div className="mt-4 flex items-center gap-6 text-sm">
          <div>
            <span className="font-display tabular-nums text-lg font-semibold">
              {template.daysPerWeek}
            </span>
            <span className="text-muted-foreground ml-1">{t("daysPerWeekUnit")}</span>
          </div>
          <div>
            <span className="tabular-nums text-lg font-semibold">{splitJson.days.length}</span>
            <span className="text-muted-foreground ml-1">{t("trainingDays")}</span>
          </div>
        </div>

        {template.descriptionTh && (
          <p className="mt-4 text-sm text-muted-foreground leading-[1.7]">
            {template.descriptionTh}
          </p>
        )}
      </div>

      {/* Split days */}
      <div className="px-4 pt-6 space-y-6">
        {splitJson.days.map((day) => (
          <div key={day.dayLabel}>
            <h2 className="text-sm font-semibold text-foreground mb-3">{day.dayLabel}</h2>
            <div className="space-y-0 border border-border rounded-xl overflow-hidden">
              {day.exercises.map((ex) => (
                <div
                  key={ex.exerciseSlug}
                  className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0"
                >
                  <span className="text-sm leading-[1.7]">
                    {ex.exerciseSlug.replace(/-/g, " ")}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums shrink-0 ml-4">
                    {ex.sets}×{ex.reps}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <StartProgramButton templateId={id} isActive={isActiveProgram} />
      </div>
    </div>
  );
}
