import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const localeEnum = pgEnum("locale", ["th", "en"]);
export const goalEnum = pgEnum("goal", ["build_muscle", "lose_fat", "get_stronger", "stay_active"]);
export const experienceLevelEnum = pgEnum("experience_level", [
  "beginner",
  "intermediate",
  "advanced",
]);
export const gymTypeEnum = pgEnum("gym_type", [
  "commercial",
  "home_equipment",
  "home_no_equipment",
]);
export const unitsEnum = pgEnum("units_preference", ["kg", "lb"]);
export const categoryEnum = pgEnum("exercise_category", [
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
  "cardio",
  "full_body",
]);
export const equipmentEnum = pgEnum("equipment", [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "kettlebell",
  "band",
  "other",
]);
export const difficultyEnum = pgEnum("difficulty", ["beginner", "intermediate", "advanced"]);
export const recordTypeEnum = pgEnum("record_type", [
  "max_weight",
  "max_reps",
  "max_volume",
  "estimated_1rm",
]);
export const reminderTypeEnum = pgEnum("reminder_type", [
  "daily",
  "checkin",
  "weekly",
  "streak_warning",
]);
export const planEnum = pgEnum("plan", ["free", "pro"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    betterAuthId: text("better_auth_id").unique(),
    lineUserId: varchar("line_user_id", { length: 64 }).unique(),
    displayName: varchar("display_name", { length: 128 }).notNull(),
    avatarUrl: text("avatar_url"),
    email: varchar("email", { length: 256 }),
    locale: localeEnum("locale").notNull().default("th"),
    goal: goalEnum("goal"),
    experienceLevel: experienceLevelEnum("experience_level"),
    daysPerWeek: integer("days_per_week"),
    gymType: gymTypeEnum("gym_type"),
    unitsPreference: unitsEnum("units_preference").notNull().default("kg"),
    reminderEnabled: boolean("reminder_enabled").notNull().default(false),
    reminderTime: varchar("reminder_time", { length: 8 }).notNull().default("18:00"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Bangkok"),
    onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
    defaultTargetKcal: integer("default_target_kcal").notNull().default(2100),
    defaultTargetProteinG: integer("default_target_protein_g").notNull().default(150),
    defaultTargetCarbsG: integer("default_target_carbs_g").notNull().default(220),
    defaultTargetFatG: integer("default_target_fat_g").notNull().default(70),
    createdAt: timestamp("created_at").notNull().defaultNow().$type<Date>(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$type<Date>(),
  },
  (t) => [index("idx_users_line_user_id").on(t.lineUserId)],
);

export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  nameEn: varchar("name_en", { length: 128 }).notNull(),
  nameTh: varchar("name_th", { length: 128 }).notNull(),
  category: categoryEnum("category").notNull(),
  muscleGroups: text("muscle_groups").array().notNull(),
  equipment: equipmentEnum("equipment").notNull(),
  isBodyweight: boolean("is_bodyweight").notNull().default(false),
  difficulty: difficultyEnum("difficulty").notNull(),
  beginnerCueEn: text("beginner_cue_en").notNull(),
  beginnerCueTh: text("beginner_cue_th").notNull(),
  commonMistakeEn: text("common_mistake_en").notNull(),
  commonMistakeTh: text("common_mistake_th").notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow().$type<Date>(),
});

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  nameEn: varchar("name_en", { length: 128 }).notNull(),
  nameTh: varchar("name_th", { length: 128 }).notNull(),
  descriptionEn: text("description_en").notNull(),
  descriptionTh: text("description_th").notNull(),
  goal: goalEnum("goal").notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  daysPerWeek: integer("days_per_week").notNull(),
  splitJson: jsonb("split_json").notNull(),
  isAdvanced: boolean("is_advanced").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow().$type<Date>(),
});

export const userPrograms = pgTable("user_programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  templateId: uuid("template_id").references(() => templates.id),
  startedAt: timestamp("started_at").notNull().defaultNow().$type<Date>(),
  endedAt: timestamp("ended_at").$type<Date>(),
  isActive: boolean("is_active").notNull().default(true),
});

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    userProgramId: uuid("user_program_id").references(() => userPrograms.id),
    name: varchar("name", { length: 256 }).notNull(),
    startedAt: timestamp("started_at").notNull().$type<Date>(),
    completedAt: timestamp("completed_at").$type<Date>(),
    durationSeconds: integer("duration_seconds"),
    notes: text("notes"),
    totalVolume: numeric("total_volume"),
    createdAt: timestamp("created_at").notNull().defaultNow().$type<Date>(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$type<Date>(),
  },
  (t) => [index("idx_workouts_user_started").on(t.userId, t.startedAt)],
);

export const workoutSets = pgTable(
  "workout_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id),
    setNumber: integer("set_number").notNull(),
    reps: integer("reps").notNull(),
    weightKg: numeric("weight_kg"),
    isBodyweight: boolean("is_bodyweight").notNull().default(false),
    isWarmup: boolean("is_warmup").notNull().default(false),
    rpe: integer("rpe"),
    notes: text("notes"),
    clientSetId: varchar("client_set_id", { length: 36 }),
    completedAt: timestamp("completed_at").notNull().$type<Date>(),
    createdAt: timestamp("created_at").notNull().defaultNow().$type<Date>(),
  },
  (t) => [
    index("idx_workout_sets_workout_id").on(t.workoutId),
    uniqueIndex("idx_workout_sets_client_set_id").on(t.workoutId, t.clientSetId),
  ],
);

export const personalRecords = pgTable(
  "personal_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id),
    recordType: recordTypeEnum("record_type").notNull(),
    value: numeric("value").notNull(),
    achievedAt: timestamp("achieved_at").notNull().$type<Date>(),
    workoutSetId: uuid("workout_set_id").references(() => workoutSets.id),
  },
  (t) => [index("idx_prs_user_exercise").on(t.userId, t.exerciseId)],
);

export const streaks = pgTable("streaks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastWorkoutDate: date("last_workout_date", { mode: "date" }).$type<Date>(),
  graceUsedThisWindow: boolean("grace_used_this_window").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$type<Date>(),
});

export const reminderLog = pgTable("reminder_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  lineUserId: varchar("line_user_id", { length: 64 }).notNull(),
  reminderType: reminderTypeEnum("reminder_type").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow().$type<Date>(),
  success: boolean("success").notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  plan: planEnum("plan").notNull().default("free"),
  startedAt: timestamp("started_at").notNull().defaultNow().$type<Date>(),
  endsAt: timestamp("ends_at").$type<Date>(),
  createdAt: timestamp("created_at").notNull().defaultNow().$type<Date>(),
});

export const bodyMeasurements = pgTable("body_measurements", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  recordedAt: date("recorded_at").notNull(),
  weightKg: numeric("weight_kg", { precision: 5, scale: 2 }),
  bodyFatPct: numeric("body_fat_pct", { precision: 4, scale: 1 }),
  chestCm: numeric("chest_cm", { precision: 5, scale: 1 }),
  waistCm: numeric("waist_cm", { precision: 5, scale: 1 }),
  armCm: numeric("arm_cm", { precision: 5, scale: 1 }),
  thighCm: numeric("thigh_cm", { precision: 5, scale: 1 }),
  createdAt: timestamp("created_at").defaultNow().notNull().$type<Date>(),
});

export const runningSessions = pgTable("running_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  runDate: date("run_date").notNull(),
  distanceKm: numeric("distance_km", { precision: 6, scale: 2 }).notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  avgPaceSecPerKm: integer("avg_pace_sec_per_km"),
  runType: text("run_type").notNull().default("easy"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull().$type<Date>(),
});

export const foodLogs = pgTable(
  "food_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
    targetKcal: integer("target_kcal").notNull().default(2100),
    targetProteinG: integer("target_protein_g").notNull().default(150),
    targetCarbsG: integer("target_carbs_g").notNull().default(220),
    targetFatG: integer("target_fat_g").notNull().default(70),
    createdAt: timestamp("created_at").defaultNow().notNull().$type<Date>(),
  },
  (t) => [uniqueIndex("food_logs_user_date_idx").on(t.userId, t.logDate)],
);

export const mealItems = pgTable("meal_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  foodLogId: uuid("food_log_id")
    .notNull()
    .references(() => foodLogs.id, { onDelete: "cascade" }),
  mealType: text("meal_type").notNull(),
  name: text("name").notNull(),
  kcal: integer("kcal").notNull(),
  proteinG: numeric("protein_g", { precision: 5, scale: 1 }).notNull(),
  carbsG: numeric("carbs_g", { precision: 5, scale: 1 }).notNull(),
  fatG: numeric("fat_g", { precision: 5, scale: 1 }).notNull(),
  isDone: boolean("is_done").notNull().default(false),
  loggedAt: timestamp("logged_at").defaultNow().notNull().$type<Date>(),
});

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow().$type<Date>(),
  },
  (t) => [
    uniqueIndex("push_subscriptions_endpoint_idx").on(t.endpoint),
    index("push_subscriptions_user_id_idx").on(t.userId),
  ],
);

export const routines = pgTable("routines", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  notes: text("notes"),
  lastUsedAt: timestamp("last_used_at").$type<Date>(),
  createdAt: timestamp("created_at").defaultNow().notNull().$type<Date>(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$type<Date>(),
});

export const routineExercises = pgTable("routine_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  routineId: uuid("routine_id")
    .notNull()
    .references(() => routines.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id")
    .notNull()
    .references(() => exercises.id),
  orderIndex: integer("order_index").notNull(),
  targetSets: integer("target_sets").notNull().default(3),
  targetReps: text("target_reps").notNull().default("10"),
  targetWeightKg: numeric("target_weight_kg", { precision: 6, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull().$type<Date>(),
});

// ─── Relations (TypeScript-only, no migration needed) ─────────────────────────

export const userProgramsRelations = relations(userPrograms, ({ one }) => ({
  user: one(users, { fields: [userPrograms.userId], references: [users.id] }),
  template: one(templates, { fields: [userPrograms.templateId], references: [templates.id] }),
}));

export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  user: one(users, { fields: [workouts.userId], references: [users.id] }),
  userProgram: one(userPrograms, {
    fields: [workouts.userProgramId],
    references: [userPrograms.id],
  }),
  sets: many(workoutSets),
}));

export const workoutSetsRelations = relations(workoutSets, ({ one }) => ({
  workout: one(workouts, { fields: [workoutSets.workoutId], references: [workouts.id] }),
  exercise: one(exercises, { fields: [workoutSets.exerciseId], references: [exercises.id] }),
}));

export const routinesRelations = relations(routines, ({ one, many }) => ({
  user: one(users, { fields: [routines.userId], references: [users.id] }),
  exercises: many(routineExercises),
}));

export const routineExercisesRelations = relations(routineExercises, ({ one }) => ({
  routine: one(routines, { fields: [routineExercises.routineId], references: [routines.id] }),
  exercise: one(exercises, { fields: [routineExercises.exerciseId], references: [exercises.id] }),
}));

export const personalRecordsRelations = relations(personalRecords, ({ one }) => ({
  user: one(users, { fields: [personalRecords.userId], references: [users.id] }),
  exercise: one(exercises, { fields: [personalRecords.exerciseId], references: [exercises.id] }),
  workoutSet: one(workoutSets, {
    fields: [personalRecords.workoutSetId],
    references: [workoutSets.id],
  }),
}));
