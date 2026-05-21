import { randomBytes, scrypt } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import type { getDb } from "../client";
import {
  exercises,
  personalRecords,
  streaks,
  templates,
  userPrograms,
  users,
  workoutSets,
  workouts,
} from "../schema";

type Db = ReturnType<typeof getDb>;

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEV_BETTER_AUTH_ID = "dev-better-auth-00000000000000001";

async function hashPasswordScrypt(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (err, buf) => {
        if (err) reject(err);
        else resolve(buf);
      },
    );
  });
  return `${salt}:${key.toString("hex")}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function workoutStart(daysBack: number, hour: number): Date {
  const d = daysAgo(daysBack);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function workoutEnd(start: Date, durationMinutes: number): Date {
  return new Date(start.getTime() + durationMinutes * 60_000);
}

export async function seedDevUser(db: Db) {
  // ── 1. Better Auth user + credential account ───────────────────────────────
  const passwordHash = await hashPasswordScrypt("devpassword123");

  await db.execute(sql`
    INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
    VALUES (${DEV_BETTER_AUTH_ID}, 'Dev User', 'dev@saifit.local', true, now(), now())
    ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id, updated_at = now()
  `);

  await db.execute(sql`
    INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
    VALUES (
      'dev-account-credential-00000001',
      'dev@saifit.local',
      'credential',
      ${DEV_BETTER_AUTH_ID},
      ${passwordHash},
      now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password, updated_at = now()
  `);

  // ── 2. App user ────────────────────────────────────────────────────────────
  await db
    .insert(users)
    .values({
      id: DEV_USER_ID,
      betterAuthId: DEV_BETTER_AUTH_ID,
      displayName: "Dev User",
      email: "dev@saifit.local",
      locale: "th",
      goal: "build_muscle",
      experienceLevel: "beginner",
      daysPerWeek: 3,
      gymType: "commercial",
      unitsPreference: "kg",
      onboardingCompleted: true,
      reminderEnabled: false,
      timezone: "Asia/Bangkok",
    })
    .onConflictDoNothing();

  // Ensure betterAuthId is set even if user row already existed
  await db.update(users).set({ betterAuthId: DEV_BETTER_AUTH_ID }).where(eq(users.id, DEV_USER_ID));

  // ── 2. Template lookup ─────────────────────────────────────────────────────
  const [template] = await db
    .select({ id: templates.id })
    .from(templates)
    .where(eq(templates.slug, "beginner-full-body-3day"))
    .limit(1);

  if (!template)
    throw new Error("beginner-full-body-3day template not found — run template seed first");

  // ── 3. UserProgram ─────────────────────────────────────────────────────────
  await db
    .insert(userPrograms)
    .values({
      userId: DEV_USER_ID,
      templateId: template.id,
      startedAt: daysAgo(14),
      isActive: true,
    })
    .onConflictDoNothing();

  const [program] = await db
    .select({ id: userPrograms.id })
    .from(userPrograms)
    .where(eq(userPrograms.userId, DEV_USER_ID))
    .limit(1);

  // ── 4. Exercise ID lookup ──────────────────────────────────────────────────
  const exerciseSlugs = [
    "squat",
    "barbell-bench-press",
    "barbell-row",
    "dumbbell-curl",
    "plank",
    "deadlift",
    "overhead-press",
    "lat-pulldown",
    "tricep-pushdown",
    "leg-press",
    "incline-bench-press",
    "seated-cable-row",
    "hammer-curl",
    "leg-curl",
  ];

  const exerciseRows = await db
    .select({ id: exercises.id, slug: exercises.slug })
    .from(exercises)
    .where(inArray(exercises.slug, exerciseSlugs));

  const exerciseMap: Record<string, string> = {};
  for (const row of exerciseRows) {
    exerciseMap[row.slug] = row.id;
  }

  // ── 5. Workouts ────────────────────────────────────────────────────────────
  // 7 sessions over 14 days (Mon/Wed/Fri pattern, alternating A/B/C)
  // Today = day 0, yesterday = day 1, etc.
  // Workout schedule (days ago): 13, 11, 9, 7, 5, 3, 1
  const sessions: Array<{
    daysBack: number;
    label: string;
    exercises: Array<{ slug: string; setsData: Array<{ reps: number; weight: number | null }> }>;
  }> = [
    {
      daysBack: 13,
      label: "Full Body A",
      exercises: [
        {
          slug: "squat",
          setsData: [
            { reps: 8, weight: 40 },
            { reps: 8, weight: 40 },
            { reps: 7, weight: 40 },
          ],
        },
        {
          slug: "barbell-bench-press",
          setsData: [
            { reps: 8, weight: 30 },
            { reps: 8, weight: 30 },
            { reps: 7, weight: 30 },
          ],
        },
        {
          slug: "barbell-row",
          setsData: [
            { reps: 8, weight: 30 },
            { reps: 8, weight: 30 },
            { reps: 8, weight: 30 },
          ],
        },
        {
          slug: "dumbbell-curl",
          setsData: [
            { reps: 10, weight: 10 },
            { reps: 10, weight: 10 },
          ],
        },
        {
          slug: "plank",
          setsData: [
            { reps: 1, weight: null },
            { reps: 1, weight: null },
            { reps: 1, weight: null },
          ],
        },
      ],
    },
    {
      daysBack: 11,
      label: "Full Body B",
      exercises: [
        {
          slug: "deadlift",
          setsData: [
            { reps: 6, weight: 50 },
            { reps: 6, weight: 50 },
            { reps: 6, weight: 50 },
          ],
        },
        {
          slug: "overhead-press",
          setsData: [
            { reps: 8, weight: 25 },
            { reps: 8, weight: 25 },
            { reps: 7, weight: 25 },
          ],
        },
        {
          slug: "lat-pulldown",
          setsData: [
            { reps: 10, weight: 35 },
            { reps: 10, weight: 35 },
            { reps: 9, weight: 35 },
          ],
        },
        {
          slug: "tricep-pushdown",
          setsData: [
            { reps: 12, weight: 15 },
            { reps: 12, weight: 15 },
          ],
        },
      ],
    },
    {
      daysBack: 9,
      label: "Full Body C",
      exercises: [
        {
          slug: "leg-press",
          setsData: [
            { reps: 10, weight: 60 },
            { reps: 10, weight: 60 },
            { reps: 9, weight: 60 },
          ],
        },
        {
          slug: "incline-bench-press",
          setsData: [
            { reps: 8, weight: 27.5 },
            { reps: 8, weight: 27.5 },
            { reps: 7, weight: 27.5 },
          ],
        },
        {
          slug: "seated-cable-row",
          setsData: [
            { reps: 10, weight: 35 },
            { reps: 10, weight: 35 },
            { reps: 10, weight: 35 },
          ],
        },
        {
          slug: "hammer-curl",
          setsData: [
            { reps: 10, weight: 10 },
            { reps: 10, weight: 10 },
          ],
        },
        {
          slug: "leg-curl",
          setsData: [
            { reps: 10, weight: 25 },
            { reps: 10, weight: 25 },
            { reps: 9, weight: 25 },
          ],
        },
      ],
    },
    {
      daysBack: 7,
      label: "Full Body A",
      exercises: [
        {
          slug: "squat",
          setsData: [
            { reps: 8, weight: 42.5 },
            { reps: 8, weight: 42.5 },
            { reps: 8, weight: 42.5 },
          ],
        },
        {
          slug: "barbell-bench-press",
          setsData: [
            { reps: 8, weight: 32.5 },
            { reps: 8, weight: 32.5 },
            { reps: 8, weight: 32.5 },
          ],
        },
        {
          slug: "barbell-row",
          setsData: [
            { reps: 8, weight: 32.5 },
            { reps: 8, weight: 32.5 },
            { reps: 8, weight: 32.5 },
          ],
        },
        {
          slug: "dumbbell-curl",
          setsData: [
            { reps: 10, weight: 10 },
            { reps: 10, weight: 10 },
          ],
        },
        {
          slug: "plank",
          setsData: [
            { reps: 1, weight: null },
            { reps: 1, weight: null },
            { reps: 1, weight: null },
          ],
        },
      ],
    },
    {
      daysBack: 5,
      label: "Full Body B",
      exercises: [
        {
          slug: "deadlift",
          setsData: [
            { reps: 6, weight: 52.5 },
            { reps: 6, weight: 52.5 },
            { reps: 5, weight: 52.5 },
          ],
        },
        {
          slug: "overhead-press",
          setsData: [
            { reps: 8, weight: 25 },
            { reps: 8, weight: 25 },
            { reps: 8, weight: 25 },
          ],
        },
        {
          slug: "lat-pulldown",
          setsData: [
            { reps: 10, weight: 37.5 },
            { reps: 10, weight: 37.5 },
            { reps: 10, weight: 37.5 },
          ],
        },
        {
          slug: "tricep-pushdown",
          setsData: [
            { reps: 12, weight: 17.5 },
            { reps: 12, weight: 17.5 },
          ],
        },
      ],
    },
    {
      daysBack: 3,
      label: "Full Body C",
      exercises: [
        {
          slug: "leg-press",
          setsData: [
            { reps: 10, weight: 65 },
            { reps: 10, weight: 65 },
            { reps: 10, weight: 65 },
          ],
        },
        {
          slug: "incline-bench-press",
          setsData: [
            { reps: 8, weight: 30 },
            { reps: 8, weight: 30 },
            { reps: 8, weight: 30 },
          ],
        },
        {
          slug: "seated-cable-row",
          setsData: [
            { reps: 10, weight: 37.5 },
            { reps: 10, weight: 37.5 },
            { reps: 10, weight: 37.5 },
          ],
        },
        {
          slug: "hammer-curl",
          setsData: [
            { reps: 10, weight: 12 },
            { reps: 10, weight: 12 },
          ],
        },
        {
          slug: "leg-curl",
          setsData: [
            { reps: 10, weight: 27.5 },
            { reps: 10, weight: 27.5 },
            { reps: 9, weight: 27.5 },
          ],
        },
      ],
    },
    {
      daysBack: 1,
      label: "Full Body A",
      exercises: [
        {
          slug: "squat",
          setsData: [
            { reps: 8, weight: 45 },
            { reps: 8, weight: 45 },
            { reps: 7, weight: 45 },
          ],
        },
        {
          slug: "barbell-bench-press",
          setsData: [
            { reps: 8, weight: 35 },
            { reps: 8, weight: 35 },
            { reps: 7, weight: 35 },
          ],
        },
        {
          slug: "barbell-row",
          setsData: [
            { reps: 8, weight: 35 },
            { reps: 8, weight: 35 },
            { reps: 8, weight: 35 },
          ],
        },
        {
          slug: "dumbbell-curl",
          setsData: [
            { reps: 10, weight: 12 },
            { reps: 10, weight: 12 },
          ],
        },
        {
          slug: "plank",
          setsData: [
            { reps: 1, weight: null },
            { reps: 1, weight: null },
            { reps: 1, weight: null },
          ],
        },
      ],
    },
  ];

  // Track max weights for PRs: { exerciseSlug: { value, workoutSetId } }
  const prTracker: Record<string, { value: number; workoutSetId: string; achievedAt: Date }> = {};

  for (const session of sessions) {
    const startTime = workoutStart(session.daysBack, 18);
    const duration = 55 + Math.floor(Math.random() * 20); // 55-75 min

    // Calculate total volume for this workout
    let totalVol = 0;
    for (const ex of session.exercises) {
      for (const s of ex.setsData) {
        if (s.weight !== null) totalVol += s.reps * s.weight;
      }
    }

    const [workout] = await db
      .insert(workouts)
      .values({
        userId: DEV_USER_ID,
        userProgramId: program?.id ?? null,
        name: session.label,
        startedAt: startTime,
        completedAt: workoutEnd(startTime, duration),
        durationSeconds: duration * 60,
        totalVolume: String(totalVol),
      })
      .returning();

    if (!workout) continue;

    for (const ex of session.exercises) {
      const exerciseId = exerciseMap[ex.slug];
      if (!exerciseId) continue;

      for (let i = 0; i < ex.setsData.length; i++) {
        const s = ex.setsData[i];
        if (!s) continue;
        const setCompletedAt = new Date(startTime.getTime() + (i + 1) * 4 * 60_000);

        const [insertedSet] = await db
          .insert(workoutSets)
          .values({
            workoutId: workout.id,
            exerciseId,
            setNumber: i + 1,
            reps: s.reps,
            weightKg: s.weight !== null ? String(s.weight) : null,
            isBodyweight: s.weight === null,
            completedAt: setCompletedAt,
          })
          .returning();

        if (!insertedSet || s.weight === null) continue;

        const existing = prTracker[ex.slug];
        if (!existing || s.weight > existing.value) {
          prTracker[ex.slug] = {
            value: s.weight,
            workoutSetId: insertedSet.id,
            achievedAt: setCompletedAt,
          };
        }
      }
    }
  }

  // ── 6. Personal Records ────────────────────────────────────────────────────
  const prSlugs = ["squat", "barbell-bench-press", "barbell-row"];

  for (const slug of prSlugs) {
    const pr = prTracker[slug];
    const exerciseId = exerciseMap[slug];
    if (!pr || !exerciseId) continue;

    await db
      .insert(personalRecords)
      .values({
        userId: DEV_USER_ID,
        exerciseId,
        recordType: "max_weight",
        value: String(pr.value),
        achievedAt: pr.achievedAt,
        workoutSetId: pr.workoutSetId,
      })
      .onConflictDoNothing();
  }

  // ── 7. Streak ──────────────────────────────────────────────────────────────
  const yesterday = daysAgo(1);

  await db
    .insert(streaks)
    .values({
      userId: DEV_USER_ID,
      currentStreak: 5,
      longestStreak: 7,
      lastWorkoutDate: yesterday.toISOString().slice(0, 10),
      graceUsedThisWindow: false,
    })
    .onConflictDoNothing();

  console.log(
    `  Dev user seeded: ${sessions.length} workouts, ${prSlugs.length} PRs, streak 5 (longest 7). Login: dev@saifit.local / devpassword123`,
  );
}
