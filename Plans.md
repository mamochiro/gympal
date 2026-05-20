---
_harness_template: "Plans.md.template"
_harness_version: "4.3.3"
---

# Saifit Plans.md

> **Project**: saifit
> **Last updated**: 2026-05-20
> **Updated by**: Claude Code

---

## 🔴 進行中のタスク

(none)

---

## 🟡 未着手のタスク

(none for Phase 15)

---

## 🟢 完了タスク

### Phase 15 — Guided Workout v2 + Warm-up Sets (2026-05-20)

| Task | 内容 | DoD | Depends | Status |
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

## 📦 アーカイブ

<!-- Move older completed tasks here. -->

---

## Status Marker Legend

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
