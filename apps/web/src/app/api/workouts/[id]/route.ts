import { requireUser } from "@/lib/auth-helpers";
import { exercises, getDb, pushSubscriptions, streaks, workoutSets, workouts } from "@saifit/db";
import { computeStreakUpdate } from "@saifit/shared";
import { and, asc, count, eq, sum } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as v from "valibot";

const patchSchema = v.object({
  name: v.optional(v.pipe(v.string(), v.maxLength(256))),
  notes: v.optional(v.string()),
  completedAt: v.optional(v.pipe(v.string(), v.isoTimestamp())),
  durationSeconds: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;
  const db = getDb();

  const workout = await db.query.workouts.findFirst({
    where: and(eq(workouts.id, id), eq(workouts.userId, user.id)),
  });
  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sets = await db
    .select({
      id: workoutSets.id,
      workoutId: workoutSets.workoutId,
      exerciseId: workoutSets.exerciseId,
      setNumber: workoutSets.setNumber,
      reps: workoutSets.reps,
      weightKg: workoutSets.weightKg,
      isBodyweight: workoutSets.isBodyweight,
      notes: workoutSets.notes,
      clientSetId: workoutSets.clientSetId,
      completedAt: workoutSets.completedAt,
      exercise: {
        id: exercises.id,
        nameEn: exercises.nameEn,
        nameTh: exercises.nameTh,
        slug: exercises.slug,
        muscleGroups: exercises.muscleGroups,
      },
    })
    .from(workoutSets)
    .leftJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(eq(workoutSets.workoutId, id))
    .orderBy(asc(workoutSets.setNumber));

  return NextResponse.json({ data: { ...workout, sets } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = v.safeParse(patchSchema, body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const db = getDb();

  const workout = await db.query.workouts.findFirst({
    where: and(eq(workouts.id, id), eq(workouts.userId, user.id)),
  });
  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.output.name !== undefined) updateData.name = parsed.output.name;
  if (parsed.output.notes !== undefined) updateData.notes = parsed.output.notes;
  if (parsed.output.completedAt !== undefined)
    updateData.completedAt = new Date(parsed.output.completedAt);
  if (parsed.output.durationSeconds !== undefined)
    updateData.durationSeconds = parsed.output.durationSeconds;

  await db.update(workouts).set(updateData).where(eq(workouts.id, id));

  // Update streak when completing a workout
  if (parsed.output.completedAt !== undefined) {
    const todayBangkok = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });

    const streak = await db.query.streaks.findFirst({ where: eq(streaks.userId, user.id) });

    const lastStr = streak?.lastWorkoutDate ?? null;

    if (lastStr !== todayBangkok) {
      const { newCurrent, newLongest } = computeStreakUpdate(
        {
          currentStreak: streak?.currentStreak ?? 0,
          longestStreak: streak?.longestStreak ?? 0,
          lastWorkoutDate: lastStr,
        },
        todayBangkok,
      );

      if (!streak) {
        await db.insert(streaks).values({
          userId: user.id,
          currentStreak: newCurrent,
          longestStreak: newLongest,
          lastWorkoutDate: todayBangkok,
        });
      } else {
        await db
          .update(streaks)
          .set({
            currentStreak: newCurrent,
            longestStreak: newLongest,
            lastWorkoutDate: todayBangkok,
            updatedAt: new Date(),
          })
          .where(eq(streaks.userId, user.id));
      }
    }
  }

  // Notify user (LINE + web push) on workout completion
  if (parsed.output.completedAt !== undefined) {
    const setsResult = await db
      .select({ setCount: count(), totalVolume: sum(workoutSets.weightKg) })
      .from(workoutSets)
      .where(eq(workoutSets.workoutId, id));

    const setCount = Number(setsResult[0]?.setCount ?? 0);
    const totalVol = Math.round(Number(setsResult[0]?.totalVolume ?? 0));
    const mins = parsed.output.durationSeconds
      ? Math.round(parsed.output.durationSeconds / 60)
      : null;

    const titleTh = "✅ ออกกำลังกายเสร็จแล้ว!";
    const bodyTh = `${setCount} เซ็ต · ${totalVol.toLocaleString()} กก.${mins ? ` · ${mins} นาที` : ""}`;
    const titleEn = "✅ Workout done!";
    const bodyEn = `${setCount} sets · ${totalVol.toLocaleString()} kg${mins ? ` · ${mins} min` : ""}`;

    // LINE push
    if (user.lineUserId && process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      const text =
        user.locale === "en"
          ? `${titleEn} ${bodyEn}\nSee your progress → ${process.env.WEB_APP_URL}/progress`
          : `${titleTh} ${bodyTh}\nดูความก้าวหน้าได้ที่ → ${process.env.WEB_APP_URL}/progress`;

      fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ to: user.lineUserId, messages: [{ type: "text", text }] }),
      }).catch((err) => console.error("LINE push failed:", err));
    }

    // Web push to all subscribed PWA devices
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      const subs = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, user.id));

      if (subs.length > 0) {
        const webpush = await import("web-push");
        webpush.setVapidDetails(
          `mailto:${process.env.VAPID_EMAIL ?? "noreply@saifit.app"}`,
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY,
        );
        const payload = JSON.stringify({
          title: user.locale === "en" ? titleEn : titleTh,
          body: user.locale === "en" ? bodyEn : bodyTh,
          url: "/progress",
        });
        for (const sub of subs) {
          webpush
            .sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
            )
            .catch(() => {});
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;
  const db = getDb();

  const workout = await db.query.workouts.findFirst({
    where: and(eq(workouts.id, id), eq(workouts.userId, user.id)),
  });
  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(workoutSets).where(eq(workoutSets.workoutId, id));
  await db.delete(workouts).where(and(eq(workouts.id, id), eq(workouts.userId, user.id)));

  return NextResponse.json({ ok: true });
}
