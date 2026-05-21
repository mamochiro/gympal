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

### Phase 19 — Weekly Summary Polish (target: 2026-05-21)

Single-task phase. Iteration model: pick the next valuable thing, ship it, repeat. Picked from the engagement-surface audit: the weekly LINE summary is the most-seen recurring touchpoint and is currently plain text. Upgrading it to Flex Message is a premium-feel win for every active user every Sunday, without adding product surface.

| Task | Description | DoD | Depends | Status |
|------|-------------|-----|---------|--------|
| 19.1 | Weekly summary as LINE Flex Message. Replace plain-text `pushMessage` in `handleWeeklySummary` with a Flex bubble: header, stat rows (workouts / total volume / streak), comparison line (vs last week), CTA button to web app. Pure builder `buildWeeklySummaryFlex(summary, locale, webAppUrl)` in `apps/line-bot/src/lib/`. alt-text fallback for older clients. [tdd:required] | `buildWeeklySummaryFlex` shipped with 8 vitest cases (shape / +delta green / -delta amber / first-week neutral / TH / EN / thousands-separator / CTA uri); `handleWeeklySummary` sends Flex; line-bot tsc + vitest 13/13 green; workspace 109/109 | - | cc:完了 |

#### Non-goals for Phase 19

- No upgrade to daily-reminder or streak-warning Flex (each warrants its own design pass; this phase is one shippable iteration)
- No bar chart / sparkline (data shape adequate without it for v1)
- No carousel of multiple bubbles
- No new product features

---

### Phase 18 — Return-User Loop (target: 2026-05-22 → 2026-05-24)

Theme: **make the second workout effortless.** The product's core promise is "log a workout in 3 seconds, see your gains." Right now the first workout requires typing every weight + rep. The second workout requires the same typing again. Closing that gap is the single highest-leverage retention move for MVP. Each task is independent and shippable on its own.

Direction picked over alternatives (cross-feature insights / LINE bot polish / design polish / production foundation) because the core workout loop is the product, and depth in the core compounds for every retained user. Other directions are valuable but secondary.

| Task | Description | DoD | Depends | Status |
|------|-------------|-----|---------|--------|
| 18.1 | Auto-fill weight/reps from previous session. `getLastWorkoutSetsForExercise` already exists (15.2); `LastSessionRow` already *displays* prior values but doesn't *pre-fill*. Wire `prevSets` (already a prop on `WorkoutLoggerView`) into each set row's initial input state so a returning user can tap "complete" without typing if they're repeating. Edits override the pre-fill. [tdd:required] | `mergeSetsWithPrev` helper in `@saifit/shared` (8 vitest cases); `ExerciseGroupCard` computes suggestion map via useMemo; `SetRow` consumes via new `suggested` prop with ghost-text styling; flips off on edit or complete; workspace 90→101 tests | - | cc:完了 [dfbd872] |
| 18.2 | Plate calculator popover. Tap a weight value in `SetRow` → opens a small overlay showing the plate breakdown for that weight (assuming 20 kg bar). Bangkok gyms vary on bar weight; ship with 20 kg hardcoded for now, settings field deferred. [tdd:required] | `computePlates(weightKg, barWeightKg)` in `@saifit/shared` (7 cases incl. fractional / underweight / unrepresentable); inline caption above the input shows plate breakdown ("25 + 5 per side" or "Bar only"). **DoD deviation noted: inline caption replaces popover** — same info, lighter UX, no overlay clutter; TH+EN copy added | - | cc:完了 [6d419f2] |
| 18.3 | Smart progression nudge. If the last 2 completed sessions for an exercise hit target reps on every working set, surface a subtle `+2.5 kg?` chip above the weight input. Tap to accept (pre-fills the suggested weight). Dismissible. Deload-aware: skip if the recent session looks like a deload (≤80% of previous weight). [tdd:required] | (deferred — see deferral note) | - | deferred: heuristic thresholds (2.5 kg jump, 8-rep target, 80% deload) need real-user telemetry to validate. Shipping speculative coaching logic risks nagging users with bad advice. Revisit when there's analytics on rep distributions per exercise + week-over-week weight changes. |
| 18.4 | Home "repeat last workout" card. Above the current in-progress block (or replacing the empty-state CTA), show: "Last workout: {name}, {N} days ago" + a primary CTA "Repeat" that starts a new workout pre-filled with last session's exercises and sets. Uses the 18.1 mechanism. Hidden if user has an in-progress workout (existing resume card wins). [tdd:skip:ui-composition-with-existing-helpers] | Extended `POST /api/workouts` with `cloneFromWorkoutId` — verifies ownership, copies exerciseId/setNumber/isBodyweight/isWarmup as placeholder sets (reps=0, weightKg=null, completedAt=startedAt). Home page queries most recent completed workout (≤14 d). `<RepeatLastWorkoutCard>` renders when no in-progress + last workout exists; clicking POSTs and routes to the new workout. Composes with 18.1 (pre-fill) and 18.5 (bar default). TH+EN copy added | 18.1 | cc:完了 [2e4b4b8] |
| 18.5 | Bar-weight default for barbell exercises. When no last-session data exists *and* the exercise's `muscleGroups` indicates barbell (or `slug` matches a barbell pattern: `^(bench|squat|deadlift|ohp|barbell-)`), default the weight input to 20 kg instead of empty. Removes the "type 20 then your real weight" friction on first-time barbell logs. [tdd:required] | `barWeightForExercise(exercise)` in `@saifit/shared` returns `20 \| null` based on `equipment === 'barbell'` (4 vitest cases). Server pipeline updated to include `equipment` on `set.exercise`. `ExerciseGroupCard` composes bar default on top of 18.1's suggestion when no prev exists; reuses same ghost-text rendering | - | cc:完了 [ebda689] |
| 18.6 | Quality gate: full repo biome + tsc + vitest. Confirm the new helpers landed in `@saifit/shared` with no regression in existing tests. Update CHANGELOG-style summary in commit. [tdd:skip:meta] | tsc clean across web + line-bot + db + shared; biome 0 errors; vitest 101/101 (+19 new: 8 mergeSetsWithPrev, 7 computePlates, 4 barWeightForExercise) | 18.1, 18.2, 18.3, 18.4, 18.5 | cc:完了 |

#### Non-goals for Phase 18

- No new schema migrations (bar-weight stays hardcoded; user-configurable bar weight deferred)
- No voice input, no superset support, no plate calculator settings page — could be Phase 19
- No cross-feature insights (food + body + workout) — different theme, would be its own phase
- No LINE bot enhancements
- No design polish (haptics, microinteractions) — measure first

---

### Phase 17 — CLAUDE.md Compliance Gaps (target: 2026-05-21 → 2026-05-22)

Three specific must-haves from CLAUDE.md that audits confirmed are missing, plus a copy audit. Small, concrete, user-facing. Solo execution (tasks share files).

| Task | Description | DoD | Depends | Status |
|------|-------------|-----|---------|--------|
| 17.1 | LINE OAuth "redirecting…" interstitial. CLAUDE.md: prevents PWA reinstall prompt on Android. Audit found page **already existed** at `/auth/line-callback` with 3-second countdown + auto-redirect, wired from `sign-in/page.tsx:40`. Only gap: copy was Thai-only. Added `auth.lineCallbackSuccess` + `auth.lineCallbackReturning` (with `<num>` rich-text tag) to both `th.json` + `en.json`, switched page to `useTranslations` + `t.rich`. [tdd:skip:ui-redirect-flow] | TH+EN parity 339/339; biome+tsc green; no behavior change | - | cc:完了 |
| 17.2 | Active-workout auth expiry recovery. CLAUDE.md: "LINE auth expiry during active workout → graceful recovery, not logout". `useWorkoutSync` and `FirstSetRow`/`SetRow` POSTs should detect 401, surface an `authExpired` flag instead of redirecting, freeze IndexedDB flush, show a Thai banner with re-signin CTA. [tdd:required] | `useAuthStore` zustand + `apiFetch` helper auto-flip on 401, clear on 2xx; banner with TH+EN copy + new-tab signin link; flush short-circuits when expired; 4 vitest cases cover transitions; full workspace 79/79 green | - | cc:完了 [be7fab4] |
| 17.3 | Cross-driver date coercion audit. Reduced from "test against both drivers" to schema-audit-only after discovering the actual divergence was localized to `streaks.lastWorkoutDate` with two consumer workarounds. Normalized to string mode (consistent with all other `date` columns); removed both workarounds; added `date-modes.test.ts` lock-in (3 cases). Full integration-against-real-Neon test deferred to a CI infra task. [tdd:required] | Schema audit done; 2 consumer workarounds dropped; 3-case lock-in vitest green; workspace 82/82 | - | cc:完了 [d1f5fde] |
| 17.4 | Empty-state copy audit. CLAUDE.md: "encouraging prompt, not blank list". Read `th.json`/`en.json` for keys ending in `.empty` / `.noData` etc.; replace generic copy ("ไม่มีข้อมูล", "Empty") with encouraging variants where applicable. Touch only copy, no UI. [tdd:skip:copy-only] | 4 strings improved (history.empty, progress.noPRs, progress.noData, body.noData) in TH+EN; 341/341 parity; biome+tsc green | - | cc:完了 |
| 17.5 | Quality gate: full repo biome + tsc + vitest. Commit a CHANGELOG-style summary in commit message. [tdd:skip:meta] | tsc per-package green (web/line-bot/db/shared); biome 87 files no fixes; vitest 82/82 green | 17.1, 17.2, 17.3, 17.4 | cc:完了 |

#### Non-goals for Phase 17

- No Playwright/E2E setup (deferred to Phase 18 when a feature justifies the cost)
- No further component splits (16.4/16.5 left set-row.tsx + guided-workout-view.tsx untouched — fine for now)
- No new product features beyond closing documented gaps
- No DB schema changes

---

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
