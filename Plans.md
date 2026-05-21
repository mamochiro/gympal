---
_harness_template: "Plans.md.template"
_harness_version: "4.3.3"
---

# Saifit Plans.md

> **Project**: saifit
> **Last updated**: 2026-05-20
> **Updated by**: Claude Code

---

## 🔴 In Progress

(none)

---

## 🟡 Not Started

### Phase 16 — Tech Debt Sweep (target: this week, 2026-05-21 → 2026-05-28)

Refactor-focused. **No new product behavior.** Goals: reduce duplication, shrink large files, raise test coverage on hot paths. Each task is a self-contained PR-sized unit.

| Task | Description | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 16.1 | Extract `requireUser(request)` helper in `apps/web/src/lib/auth-helpers.ts` — returns `{ session, user }` or throws/returns 401 NextResponse. Returns the app's `users` row (with `betterAuthId` joined) so callers skip the second lookup. [tdd:required] | New helper exported; unit tests cover 401 (no session), 404 (no user row), happy path; tsc + vitest green | - | cc:完了 [a7839ce] |
| 16.2 | Refactor 28 protected API routes (`apps/web/src/app/api/**/route.ts`) to call `requireUser` instead of inline `getSession` + `users.findFirst`. `exercises/[slug]` is intentionally skipped (optional-auth). [tdd:skip:covered-by-existing-unauth-tests] | 28 routes use `requireUser`; `unauth.test.ts` (9 tests) still passes; biome + tsc green | 16.1 | cc:完了 [26745b7] |
| 16.3 | Extract shared Valibot schemas to `packages/shared/src/schemas/api.ts` — uuid, dateString, isoTimestamp, nonNegativeInt, weightString, cursorPaginationSchema. [tdd:required] | 6 schemas with 20 unit tests; ≥4 consumers migrated; tsc + vitest green | - | cc:完了 [3d530d0] |
| 16.4 | Split `workout-logger-view.tsx` (945 LOC) into sub-components: `WorkoutHeader`, `ExerciseGroupCard`, `inline-set-row` (FirstSetRow+LastSessionRow), `workout-extras` (ExerciseProgressBar+PendingExerciseCard+AddExerciseButton), `useWorkoutSync` hook, shared types. [tdd:skip:no-ui-test-fw-yet] | Top-level file 225 LOC (DoD ≤300); no behavior change; tsc + biome + vitest (75) green; dev-server middleware compile clean | - | cc:完了 — browser smoke test still pending |
| 16.5 | Split `settings/page.tsx` (1024 LOC) into 9 section components: `ProfileSection`, `TrainingSection`, `NutritionSection`, `UnitsSection`, `PushNotificationsSection`, `RemindersSection`, `ConnectedAccountsSection`, `DataExportSection`, plus shared `settings-controls` + `settings-types`. [tdd:skip:no-ui-test-fw-yet] | Top-level page.tsx 64 LOC (DoD ≤250); each section is its own file in `apps/web/src/app/settings/components/`; tsc + biome + vitest green | - | cc:完了 — browser smoke test still pending |
| 16.6 | Consolidate `@saifit/db` query layer into `queries/{user,workout,cron}.ts` + barrel; `helpers.ts` retained as re-export shim for line-bot's relative-path import. [tdd:skip:no-behavior-change-existing-tests-cover] | Each domain file ≤150 LOC; barrel export works; callers in web + line-bot unchanged; tsc + vitest green | - | cc:完了 [b1aa855] |
| 16.7 | Reduce `apps/web/src/app/api/docs/route.ts` (1809 LOC). Move inline OpenAPI spec to `apps/web/src/lib/openapi-spec.ts`; route.ts just imports + serves. [tdd:skip:docs-only-no-behavior-change] | `route.ts` ≤100 LOC; `openapi-spec.ts` is the single source of truth; `/api/docs` still serves valid OpenAPI 3.x JSON; biome + tsc green | - | cc:完了 [a5a5b0f] |
| 16.8 | Add tests for hot paths: `getLastWorkoutSetsForExercise` (db queries), `estimate1RM` edge cases (already 17 tests — verify gaps), guided-workout state transitions if reducer-shaped. [tdd:required] | 13 new test cases across packages; vitest green (75 total) | 16.1, 16.6 | cc:完了 [16614ae] |

#### Non-goals for Phase 16

- No new features (warm-up logic, last-sets, guided view are already shipped in Phase 15)
- No design changes (`globals.css` / Tailwind tokens stay frozen)
- No DB schema migrations (no new tables/columns)
- No dependency upgrades

---

## 🟢 Completed

### Phase 15 — Guided Workout v2 + Warm-up Sets (2026-05-20)

| Task | Description | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 15.1 | DB schema: `workout_sets.is_warmup` (migration `0007_friendly_lester.sql`) | Migration applies, journal updated, tsc green | - | cc:完了 [f644a8f] |
| 15.2 | `packages/db/src/queries.ts` — `getLastWorkoutSetsForExercise` | Exported from `@saifit/db`, tsc green | 15.1 | cc:完了 [f644a8f] |
| 15.3 | New API: `GET /api/workouts/last-sets` (auth + valibot) | Route 200/401/400 paths exist | 15.2 | cc:完了 [f644a8f] |
| 15.4 | `PATCH /api/sets/[id]` accepts `isWarmup` | Valibot accepts optional boolean, persisted | 15.1 | cc:完了 [f644a8f] |
| 15.5 | Guided workout view (new `guided-workout-view.tsx`) [tdd:skip:ui-only] | Component compiles, used by page.tsx | 15.3 | cc:完了 [54f1fa5] |
| 15.6 | Warm-up toggle in `set-row.tsx` | Toggle calls PATCH isWarmup, undo path preserved | 15.4 | cc:完了 [54f1fa5] |
| 15.7 | Rest-timer + store update | Persistence across navigation | - | cc:完了 [54f1fa5] |
| 15.8 | Workout summary page redesign | Page renders completed-workout data | 15.1 | cc:完了 [54f1fa5] |
| 15.9 | Error/not-found boundaries (exercises, templates, workout) | Boundaries present, Thai+EN copy | - | cc:完了 [59821bc] |
| 15.10 | PWA icon refresh + generate-icons.mjs | manifest.json valid, sharp-based generator added | - | cc:完了 [92a5b19] |
| 15.11 | i18n keys for new features (th + en) [tdd:skip:parity-check-is-the-test] | 337/337 key parity confirmed | 15.5, 15.6, 15.8 | cc:完了 [54f1fa5] |
| 15.12 | LINE bot weekly summary — prior-week volume delta | line-bot tsc green, 5 tests pass | - | cc:完了 [b246437] |
| 15.13 | Misc polish: globals.css, layout, home, templates page [tdd:skip:visual] | biome + tsc clean | 15.10 | cc:完了 [59821bc] |
| 15.14 | Quality gate (biome + tsc + vitest 38 tests) | All three green | 15.1–15.13 | cc:完了 [9969030] |

#### Commit summary

| Hash | Scope | Tasks |
|------|-------|-------|
| `f644a8f` | feat(workout): warm-up sets — DB schema + API | 15.1–15.4 |
| `54f1fa5` | feat(workout): guided view, warm-up UX, summary, rest timer | 15.5–15.8, 15.11 |
| `59821bc` | feat(web): error/not-found boundaries + page polish | 15.9, 15.13 |
| `92a5b19` | feat(pwa): refresh app icons + generate-icons.mjs | 15.10 |
| `b246437` | feat(line-bot): weekly summary prior-week comparison | 15.12 |
| `9969030` | fix(scripts): multiagent.sh path | (cleanup) |

> Phases 1–14 are tracked in `SPRINT.md` and all marked ✅ as of commit `c687c08`.

---

## 📦 Archive

<!-- Move older completed tasks here. -->

---

## Status Marker Legend

> The marker tokens below (`cc:完了`, `pm:依頼中`, `pm:確認済`) are **protocol
> values** searched by the compiled `harness` Go binary. They look Japanese but
> function as opaque identifiers — like Git's `HEAD` or `refs/heads`. Do not
> translate the tokens themselves; only the descriptions are localized.

| Marker | Meaning |
|--------|---------|
| `pm:依頼中` | PM requested work |
| `cc:TODO` | Not started by Claude Code |
| `cc:WIP` | Claude Code is working |
| `cc:完了` | Claude Code completed; awaiting confirmation |
| `pm:確認済` | PM confirmed completion |
| `blocked` | Blocked; include reason next to task |

---

## Last Update

- **Updated at**: 2026-05-20
- **Last session owner**: Claude Code (Opus 4.7)
- **Branch**: main
- **Sync source**: detected via /harness-plan sync against 26 uncommitted files
