export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Saifit API",
    description:
      "REST API for the Saifit fitness tracking PWA. All authenticated endpoints require a valid Better Auth session cookie obtained via `/api/auth/**`.",
    version: "1.0.0",
  },
  servers: [
    { url: "http://localhost:3000", description: "Local development" },
    { url: "https://saifit.app", description: "Production" },
  ],
  tags: [
    { name: "User", description: "Profile & account management" },
    { name: "Exercises", description: "Exercise library" },
    { name: "Workouts", description: "Workout sessions & set logging" },
    { name: "Templates", description: "Pre-built program templates" },
    { name: "Programs", description: "User's active program" },
    { name: "Routines", description: "Custom user-created routines" },
    { name: "Progress", description: "Stats, PRs, charts, heatmap" },
    { name: "Body", description: "Body measurements" },
    { name: "Run", description: "Running sessions" },
    { name: "Food", description: "Food & nutrition logging" },
    { name: "Push", description: "Web Push notification subscriptions" },
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "better-auth.session_token",
        description:
          "Session cookie issued by Better Auth after sign-in. Send login request to `POST /api/auth/sign-in/email` or use LINE OAuth flow.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string", example: "Unauthorized" },
        },
      },
      Ok: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
        },
      },
      Exercise: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          slug: { type: "string", example: "barbell-back-squat" },
          nameEn: { type: "string", example: "Barbell Back Squat" },
          nameTh: { type: "string", example: "สควอท บาร์เบล" },
          category: {
            type: "string",
            enum: ["chest", "back", "legs", "shoulders", "arms", "core", "cardio", "full_body"],
          },
          muscleGroups: { type: "array", items: { type: "string" }, example: ["legs", "back"] },
          equipment: {
            type: "string",
            enum: [
              "barbell",
              "dumbbell",
              "machine",
              "cable",
              "bodyweight",
              "kettlebell",
              "band",
              "other",
            ],
          },
          isBodyweight: { type: "boolean" },
        },
      },
      WorkoutSet: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          workoutId: { type: "string", format: "uuid" },
          exerciseId: { type: "string", format: "uuid" },
          setNumber: { type: "integer", example: 1 },
          reps: { type: "integer", example: 8 },
          weightKg: { type: "string", nullable: true, example: "100.0" },
          isBodyweight: { type: "boolean" },
          notes: { type: "string", nullable: true },
          clientSetId: { type: "string" },
          completedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      Workout: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          name: { type: "string", example: "Morning Push" },
          notes: { type: "string", nullable: true },
          startedAt: { type: "string", format: "date-time" },
          completedAt: { type: "string", format: "date-time", nullable: true },
          durationSeconds: { type: "integer", nullable: true },
        },
      },
      UserProfile: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          displayName: { type: "string", example: "สมชาย" },
          avatarUrl: { type: "string", nullable: true },
          goal: {
            type: "string",
            enum: ["build_muscle", "lose_fat", "get_stronger", "stay_active"],
            nullable: true,
          },
          experienceLevel: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced"],
            nullable: true,
          },
          daysPerWeek: { type: "integer", minimum: 1, maximum: 7, nullable: true },
          gymType: {
            type: "string",
            enum: ["commercial", "home_equipment", "home_no_equipment"],
            nullable: true,
          },
          unitsPreference: { type: "string", enum: ["kg", "lb"], default: "kg" },
          locale: { type: "string", enum: ["th", "en"], default: "th" },
          reminderEnabled: { type: "boolean" },
          reminderTime: { type: "string", example: "18:00" },
          onboardingCompleted: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/api/me": {
      get: {
        tags: ["User"],
        summary: "Get current user profile",
        security: [{ sessionCookie: [] }],
        responses: {
          200: {
            description: "User profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserProfile" },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
      patch: {
        tags: ["User"],
        summary: "Update user preferences",
        security: [{ sessionCookie: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  goal: {
                    type: "string",
                    enum: ["build_muscle", "lose_fat", "get_stronger", "stay_active"],
                  },
                  experienceLevel: {
                    type: "string",
                    enum: ["beginner", "intermediate", "advanced"],
                  },
                  daysPerWeek: { type: "integer", minimum: 1, maximum: 7 },
                  gymType: {
                    type: "string",
                    enum: ["commercial", "home_equipment", "home_no_equipment"],
                  },
                  onboardingCompleted: { type: "boolean" },
                  unitsPreference: { type: "string", enum: ["kg", "lb"] },
                  locale: { type: "string", enum: ["th", "en"] },
                  reminderEnabled: { type: "boolean" },
                  reminderTime: { type: "string", example: "18:00", description: "HH:MM format" },
                  displayName: { type: "string", maxLength: 128 },
                  avatarUrl: { type: "string", nullable: true },
                  defaultTargetKcal: { type: "integer", minimum: 500, maximum: 10000 },
                  defaultTargetProteinG: { type: "integer", minimum: 0, maximum: 1000 },
                  defaultTargetCarbsG: { type: "integer", minimum: 0, maximum: 1500 },
                  defaultTargetFatG: { type: "integer", minimum: 0, maximum: 500 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Ok" } } },
          },
          400: { description: "Invalid input" },
          401: { description: "Unauthorized" },
        },
      },
      delete: {
        tags: ["User"],
        summary: "Delete account and all data",
        security: [{ sessionCookie: [] }],
        responses: {
          200: {
            description: "Deleted",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Ok" } } },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/me/export": {
      get: {
        tags: ["User"],
        summary: "Export all user data as JSON",
        security: [{ sessionCookie: [] }],
        responses: {
          200: {
            description: "JSON export file (Content-Disposition: attachment)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/UserProfile" },
                    workouts: {
                      type: "array",
                      items: {
                        allOf: [
                          { $ref: "#/components/schemas/Workout" },
                          {
                            type: "object",
                            properties: {
                              sets: {
                                type: "array",
                                items: { $ref: "#/components/schemas/WorkoutSet" },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/exercises": {
      get: {
        tags: ["Exercises"],
        summary: "List exercises (public)",
        parameters: [
          {
            name: "q",
            in: "query",
            schema: { type: "string", maxLength: 100 },
            description: "Name search",
          },
          {
            name: "muscle",
            in: "query",
            schema: { type: "string", maxLength: 50 },
            description: "Filter by muscle group",
          },
          {
            name: "equipment",
            in: "query",
            schema: { type: "string", maxLength: 50 },
            description: "Filter by equipment",
          },
          {
            name: "cursor",
            in: "query",
            schema: { type: "string" },
            description: "Slug-based pagination cursor",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
          },
        ],
        responses: {
          200: {
            description: "Paginated exercise list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Exercise" } },
                    nextCursor: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Exercises"],
        summary: "Create custom exercise",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["nameTh", "category", "muscleGroups", "equipment"],
                properties: {
                  nameTh: { type: "string", minLength: 1, maxLength: 128 },
                  nameEn: { type: "string", maxLength: 128 },
                  category: {
                    type: "string",
                    enum: [
                      "chest",
                      "back",
                      "legs",
                      "shoulders",
                      "arms",
                      "core",
                      "cardio",
                      "full_body",
                    ],
                  },
                  muscleGroups: { type: "array", items: { type: "string" }, minItems: 1 },
                  equipment: {
                    type: "string",
                    enum: [
                      "barbell",
                      "dumbbell",
                      "machine",
                      "cable",
                      "bodyweight",
                      "kettlebell",
                      "band",
                      "other",
                    ],
                  },
                  isBodyweight: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Exercise" } } },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/exercises/{slug}": {
      get: {
        tags: ["Exercises"],
        summary: "Get exercise detail with user history",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        security: [{ sessionCookie: [] }],
        responses: {
          200: {
            description: "Exercise detail",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      allOf: [
                        { $ref: "#/components/schemas/Exercise" },
                        {
                          type: "object",
                          properties: {
                            difficulty: {
                              type: "string",
                              enum: ["beginner", "intermediate", "advanced"],
                            },
                            beginnerCueTh: { type: "string" },
                            beginnerCueEn: { type: "string" },
                            commonMistakeTh: { type: "string" },
                            commonMistakeEn: { type: "string" },
                            history: {
                              nullable: true,
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  workoutId: { type: "string", format: "uuid" },
                                  date: { type: "string", format: "date-time" },
                                  sets: {
                                    type: "array",
                                    items: {
                                      type: "object",
                                      properties: {
                                        setNumber: { type: "integer" },
                                        weightKg: { type: "string", nullable: true },
                                        reps: { type: "integer" },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          404: { description: "Not found" },
        },
      },
    },

    "/api/workouts": {
      get: {
        tags: ["Workouts"],
        summary: "List user's workouts",
        security: [{ sessionCookie: [] }],
        parameters: [
          {
            name: "cursor",
            in: "query",
            schema: { type: "string", format: "date-time" },
            description: "ISO8601 timestamp cursor",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
          },
        ],
        responses: {
          200: {
            description: "Paginated workout list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        allOf: [
                          { $ref: "#/components/schemas/Workout" },
                          {
                            type: "object",
                            properties: {
                              exerciseCount: { type: "integer" },
                              totalSets: { type: "integer" },
                              totalVolume: { type: "number" },
                              abandonedWorkout: { type: "boolean" },
                            },
                          },
                        ],
                      },
                    },
                    nextCursor: { type: "string", format: "date-time", nullable: true },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Workouts"],
        summary: "Start a new workout",
        security: [{ sessionCookie: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", maxLength: 256 },
                  userProgramId: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Workout created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Workout" } },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/workouts/{id}": {
      get: {
        tags: ["Workouts"],
        summary: "Get workout with all sets",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: {
            description: "Workout detail",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      allOf: [
                        { $ref: "#/components/schemas/Workout" },
                        {
                          type: "object",
                          properties: {
                            sets: {
                              type: "array",
                              items: {
                                allOf: [
                                  { $ref: "#/components/schemas/WorkoutSet" },
                                  {
                                    type: "object",
                                    properties: {
                                      exercise: {
                                        type: "object",
                                        properties: {
                                          id: { type: "string", format: "uuid" },
                                          nameEn: { type: "string" },
                                          nameTh: { type: "string" },
                                          slug: { type: "string" },
                                          muscleGroups: {
                                            type: "array",
                                            items: { type: "string" },
                                          },
                                        },
                                      },
                                    },
                                  },
                                ],
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      patch: {
        tags: ["Workouts"],
        summary: "Update workout (complete, rename, add notes)",
        description: "Setting `completedAt` triggers streak update and LINE push notification.",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", maxLength: 256 },
                  notes: { type: "string" },
                  completedAt: { type: "string", format: "date-time" },
                  durationSeconds: { type: "integer", minimum: 0 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Ok" } } },
          },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      delete: {
        tags: ["Workouts"],
        summary: "Delete workout and all its sets",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: {
            description: "Deleted",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Ok" } } },
          },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },

    "/api/workouts/{id}/sets": {
      post: {
        tags: ["Workouts"],
        summary: "Log a set (with idempotency & PR detection)",
        description:
          "Idempotent via `clientSetId`. Returns PR information if a personal record was beaten.",
        security: [{ sessionCookie: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Workout ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["clientSetId", "exerciseId", "setNumber", "reps", "completedAt"],
                properties: {
                  clientSetId: {
                    type: "string",
                    minLength: 1,
                    maxLength: 36,
                    description: "Client-generated unique ID for idempotency",
                  },
                  exerciseId: { type: "string", format: "uuid" },
                  setNumber: { type: "integer", minimum: 1 },
                  weightKg: { type: "string", maxLength: 20, nullable: true, example: "80.5" },
                  reps: { type: "integer", minimum: 0 },
                  isBodyweight: { type: "boolean", default: false },
                  completedAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Set logged",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      allOf: [
                        { $ref: "#/components/schemas/WorkoutSet" },
                        {
                          type: "object",
                          properties: {
                            prBeaten: { type: "boolean" },
                            prTypes: {
                              type: "array",
                              items: { type: "string", enum: ["max_weight", "estimated_1rm"] },
                            },
                            newPrValue: { type: "number", nullable: true },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          404: { description: "Workout not found" },
        },
      },
    },

    "/api/workouts/{id}/sync": {
      post: {
        tags: ["Workouts"],
        summary: "Sync offline IndexedDB queue",
        description:
          "Reconciles offline operations by sequence number. Not a blind replay — server validates and rejects conflicts.",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["clientId", "lastSyncSeq", "pendingOps"],
                properties: {
                  clientId: { type: "string", format: "uuid" },
                  lastSyncSeq: { type: "integer" },
                  pendingOps: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["seq", "type", "payload"],
                      properties: {
                        seq: { type: "integer" },
                        type: {
                          type: "string",
                          enum: [
                            "create_set",
                            "update_set",
                            "delete_set",
                            "complete_workout",
                            "update_workout",
                          ],
                        },
                        payload: { type: "object" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Sync result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        accepted: { type: "array", items: { type: "integer" } },
                        rejected: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              seq: { type: "integer" },
                              reason: { type: "string" },
                            },
                          },
                        },
                        serverSets: {
                          type: "array",
                          items: { $ref: "#/components/schemas/WorkoutSet" },
                        },
                        serverWorkout: { $ref: "#/components/schemas/Workout" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/workouts/{id}/repeat": {
      post: {
        tags: ["Workouts"],
        summary: "Duplicate a completed workout",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          201: {
            description: "New workout created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: { id: { type: "string", format: "uuid" } },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },

    "/api/sets/{id}": {
      patch: {
        tags: ["Workouts"],
        summary: "Update a set (weight, reps, notes)",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  weightKg: { type: "string", maxLength: 20 },
                  reps: { type: "integer", minimum: 0 },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Ok" } } },
          },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      delete: {
        tags: ["Workouts"],
        summary: "Delete a set",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: {
            description: "Deleted",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Ok" } } },
          },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },

    "/api/templates": {
      get: {
        tags: ["Templates"],
        summary: "List program templates (public)",
        parameters: [
          {
            name: "goal",
            in: "query",
            schema: {
              type: "string",
              enum: ["build_muscle", "lose_fat", "get_stronger", "stay_active"],
            },
          },
          {
            name: "difficulty",
            in: "query",
            schema: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
          },
          { name: "daysPerWeek", in: "query", schema: { type: "integer", minimum: 1, maximum: 7 } },
        ],
        responses: {
          200: {
            description: "Template list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uuid" },
                          slug: { type: "string" },
                          nameEn: { type: "string" },
                          nameTh: { type: "string" },
                          goal: { type: "string" },
                          difficulty: { type: "string" },
                          daysPerWeek: { type: "integer" },
                          isAdvanced: { type: "boolean" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/api/templates/{id}": {
      get: {
        tags: ["Templates"],
        summary: "Get template detail with split schedule (public)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "Template detail" },
          404: { description: "Not found" },
        },
      },
    },

    "/api/programs/active": {
      get: {
        tags: ["Programs"],
        summary: "Get active program",
        security: [{ sessionCookie: [] }],
        responses: {
          200: {
            description: "Active program or null",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      nullable: true,
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        userId: { type: "string", format: "uuid" },
                        templateId: { type: "string", format: "uuid" },
                        startedAt: { type: "string", format: "date-time" },
                        isActive: { type: "boolean" },
                        template: {
                          type: "object",
                          properties: {
                            id: { type: "string", format: "uuid" },
                            nameEn: { type: "string" },
                            nameTh: { type: "string" },
                            goal: { type: "string" },
                            difficulty: { type: "string" },
                            daysPerWeek: { type: "integer" },
                            splitJson: {
                              type: "string",
                              description: "JSON string of the weekly split schedule",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      delete: {
        tags: ["Programs"],
        summary: "Deactivate active program",
        security: [{ sessionCookie: [] }],
        responses: {
          200: {
            description: "Deactivated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Ok" } } },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/programs/start": {
      post: {
        tags: ["Programs"],
        summary: "Start a program from a template",
        description: "Deactivates any currently active program before starting the new one.",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["templateId"],
                properties: {
                  templateId: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Program started" },
          401: { description: "Unauthorized" },
          404: { description: "Template not found" },
        },
      },
    },

    "/api/routines": {
      get: {
        tags: ["Routines"],
        summary: "List user's custom routines",
        security: [{ sessionCookie: [] }],
        responses: {
          200: {
            description: "Routine list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uuid" },
                          name: { type: "string" },
                          notes: { type: "string", nullable: true },
                          lastUsedAt: { type: "string", format: "date-time", nullable: true },
                          createdAt: { type: "string", format: "date-time" },
                          exerciseCount: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Routines"],
        summary: "Create a custom routine",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "exercises"],
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 100 },
                  notes: { type: "string", nullable: true },
                  exercises: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["exerciseId", "targetSets", "targetReps"],
                      properties: {
                        exerciseId: { type: "string", format: "uuid" },
                        targetSets: { type: "integer", minimum: 1, maximum: 20 },
                        targetReps: { type: "string", maxLength: 20, example: "8-12" },
                        targetWeightKg: { type: "number", nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: { id: { type: "string", format: "uuid" } },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/routines/{id}": {
      get: {
        tags: ["Routines"],
        summary: "Get routine with exercises",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "Routine detail" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      patch: {
        tags: ["Routines"],
        summary: "Update routine name, notes, or exercises",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 100 },
                  notes: { type: "string", nullable: true },
                  exercises: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
      delete: {
        tags: ["Routines"],
        summary: "Delete routine",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          204: { description: "Deleted" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },

    "/api/routines/{id}/start": {
      post: {
        tags: ["Routines"],
        summary: "Start a workout from a routine",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: {
            description: "Workout started",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        workoutId: { type: "string", format: "uuid" },
                        routineId: { type: "string", format: "uuid" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          404: { description: "Routine not found" },
        },
      },
    },

    "/api/progress/summary": {
      get: {
        tags: ["Progress"],
        summary: "Overall stats: streak, volume, total workouts",
        security: [{ sessionCookie: [] }],
        responses: {
          200: {
            description: "Progress summary",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        totalWorkouts: { type: "integer" },
                        totalVolume: { type: "number" },
                        currentStreak: { type: "integer" },
                        longestStreak: { type: "integer" },
                        lastWorkoutDate: { type: "string", format: "date-time", nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/progress/prs": {
      get: {
        tags: ["Progress"],
        summary: "Personal records grouped by exercise",
        security: [{ sessionCookie: [] }],
        responses: {
          200: {
            description: "PR list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          exerciseId: { type: "string", format: "uuid" },
                          slug: { type: "string" },
                          nameEn: { type: "string" },
                          nameTh: { type: "string" },
                          records: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                recordType: {
                                  type: "string",
                                  enum: ["max_weight", "estimated_1rm"],
                                },
                                value: { type: "number" },
                                achievedAt: { type: "string", format: "date-time" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/progress/heatmap": {
      get: {
        tags: ["Progress"],
        summary: "52-week activity heatmap (Bangkok timezone)",
        security: [{ sessionCookie: [] }],
        responses: {
          200: {
            description: "Heatmap data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          date: { type: "string", format: "date", example: "2025-01-15" },
                          count: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/progress/weekly": {
      get: {
        tags: ["Progress"],
        summary: "Weekly volume by muscle category (last 12 weeks)",
        security: [{ sessionCookie: [] }],
        responses: {
          200: {
            description: "Weekly chart data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          weekStart: { type: "string", format: "date-time" },
                          totalVolume: { type: "number" },
                          byCategory: {
                            type: "object",
                            additionalProperties: { type: "number" },
                            example: { chest: 1200, back: 900, legs: 1800 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/progress/exercise/{slug}": {
      get: {
        tags: ["Progress"],
        summary: "Weight progression for a specific exercise (last 24 sessions)",
        security: [{ sessionCookie: [] }],
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Progression data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          date: { type: "string", format: "date-time" },
                          maxWeightKg: { type: "number", nullable: true },
                          maxReps: { type: "integer" },
                          estimated1RM: {
                            type: "number",
                            nullable: true,
                            description: "Null when reps > 12 (Brzycki unreliable)",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/body/measurements": {
      get: {
        tags: ["Body"],
        summary: "Get body measurements (last 90 days)",
        security: [{ sessionCookie: [] }],
        responses: {
          200: { description: "Measurements array" },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Body"],
        summary: "Log a body measurement",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["recordedAt"],
                properties: {
                  recordedAt: { type: "string", format: "date", example: "2025-05-11" },
                  weightKg: { type: "number", minimum: 0 },
                  bodyFatPct: { type: "number", minimum: 0, maximum: 100 },
                  chestCm: { type: "number", minimum: 0 },
                  waistCm: { type: "number", minimum: 0 },
                  armCm: { type: "number", minimum: 0 },
                  thighCm: { type: "number", minimum: 0 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Logged",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Ok" } } },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/body/summary": {
      get: {
        tags: ["Body"],
        summary: "Latest measurement + 90-day weight trend",
        security: [{ sessionCookie: [] }],
        responses: {
          200: {
            description: "Body summary",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    latest: { type: "object", nullable: true },
                    deltas: {
                      type: "object",
                      properties: {
                        weightKg: { type: "number", nullable: true },
                        bodyFatPct: { type: "number", nullable: true },
                        chestCm: { type: "number", nullable: true },
                        waistCm: { type: "number", nullable: true },
                        armCm: { type: "number", nullable: true },
                        thighCm: { type: "number", nullable: true },
                      },
                    },
                    trend90: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          date: { type: "string", format: "date" },
                          weightKg: { type: "number", nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/run/sessions": {
      get: {
        tags: ["Run"],
        summary: "Get running sessions (last 30)",
        security: [{ sessionCookie: [] }],
        responses: {
          200: { description: "Sessions array" },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Run"],
        summary: "Log a running session",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["runDate", "distanceKm", "durationSeconds"],
                properties: {
                  runDate: { type: "string", format: "date", example: "2025-05-11" },
                  distanceKm: { type: "number", minimum: 0.01 },
                  durationSeconds: { type: "integer", minimum: 1 },
                  runType: {
                    type: "string",
                    enum: ["easy", "tempo", "interval", "long"],
                    default: "easy",
                  },
                  notes: { type: "string", maxLength: 500, nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Session logged" },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/run/summary": {
      get: {
        tags: ["Run"],
        summary: "Current week running summary",
        security: [{ sessionCookie: [] }],
        responses: {
          200: {
            description: "Week plan with per-day sessions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    weekPlan: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          th: { type: "string" },
                          en: { type: "string" },
                          date: { type: "string", format: "date" },
                          isToday: { type: "boolean" },
                          session: { type: "object", nullable: true },
                        },
                      },
                    },
                    totalKm: { type: "number" },
                    longestKm: { type: "number" },
                    latestPace: { type: "string", nullable: true, example: "5:30" },
                    weekRange: {
                      type: "object",
                      properties: {
                        from: { type: "string", format: "date" },
                        to: { type: "string", format: "date" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/food/logs": {
      get: {
        tags: ["Food"],
        summary: "Get food log for a date (defaults to today Bangkok time)",
        security: [{ sessionCookie: [] }],
        parameters: [
          {
            name: "date",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "YYYY-MM-DD (defaults to today Bangkok)",
          },
        ],
        responses: {
          200: {
            description: "Food log with items",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    log: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        logDate: { type: "string", format: "date" },
                        targetKcal: { type: "integer" },
                        targetProteinG: { type: "integer" },
                        targetCarbsG: { type: "integer" },
                        targetFatG: { type: "integer" },
                      },
                    },
                    items: { type: "array", items: { type: "object" } },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      patch: {
        tags: ["Food"],
        summary: "Update daily nutrition targets",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["date"],
                properties: {
                  date: { type: "string", format: "date" },
                  targetKcal: { type: "integer", minimum: 0 },
                  targetProteinG: { type: "integer", minimum: 0 },
                  targetCarbsG: { type: "integer", minimum: 0 },
                  targetFatG: { type: "integer", minimum: 0 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Ok" } } },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/food/logs/{date}/meals": {
      post: {
        tags: ["Food"],
        summary: "Add a meal item",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "date", in: "path", required: true, schema: { type: "string", format: "date" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["mealType", "name", "kcal", "proteinG", "carbsG", "fatG"],
                properties: {
                  mealType: { type: "string", enum: ["breakfast", "lunch", "snack", "dinner"] },
                  name: { type: "string", minLength: 1, maxLength: 200 },
                  kcal: { type: "integer", minimum: 0 },
                  proteinG: { type: "number", minimum: 0 },
                  carbsG: { type: "number", minimum: 0 },
                  fatG: { type: "number", minimum: 0 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Meal item added" },
          401: { description: "Unauthorized" },
        },
      },
      patch: {
        tags: ["Food"],
        summary: "Mark meal item done/undone",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "date", in: "path", required: true, schema: { type: "string", format: "date" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id", "isDone"],
                properties: {
                  id: { type: "string", format: "uuid" },
                  isDone: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Ok" } } },
          },
          401: { description: "Unauthorized" },
        },
      },
      delete: {
        tags: ["Food"],
        summary: "Delete a meal item",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "date", in: "path", required: true, schema: { type: "string", format: "date" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id"],
                properties: {
                  id: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Deleted",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Ok" } } },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/push/subscribe": {
      post: {
        tags: ["Push"],
        summary: "Subscribe to web push notifications",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["endpoint", "p256dh", "auth"],
                properties: {
                  endpoint: { type: "string", maxLength: 2048 },
                  p256dh: { type: "string", maxLength: 512 },
                  auth: { type: "string", maxLength: 256 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Subscribed",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Ok" } } },
          },
          401: { description: "Unauthorized" },
        },
      },
      delete: {
        tags: ["Push"],
        summary: "Unsubscribe from push notifications",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["endpoint"],
                properties: {
                  endpoint: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Unsubscribed",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Ok" } } },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
  },
} as const;
