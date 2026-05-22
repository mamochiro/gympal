# Saifit Plans.md

Created: 2026-05-20 · Last updated: 2026-05-22

---

## 🔴 In Progress

(none)

---

## 🟡 Not Started

### Phase 22 — Audit follow-ups (2026-05-22)

Direct payoff from Phase-22-precursor audit dispatched via tmux multiagent: 3 missing hot-path indexes + 1 remaining LINE handler still on plain text. Tasks 22.1 + 22.2 are domain-isolated (db-only / line-bot-only), so dispatching them in parallel to `db-agent` and `line-bot-agent` is honest use of the tmux orchestrator pattern.

| Task | Description | DoD | Depends | Status |
|------|-------------|-----|---------|--------|
| 22.1 | Add 3 missing indexes via a new Drizzle migration: (a) `workouts(user_id, completed_at)` for 18.4 repeat-last-workout query; (b) `personal_records(workout_set_id)` for 20.1 `prsAchieved` lookup; (c) `workout_sets(workout_id, exercise_id)` for 15.2 last-sets query. Run `drizzle-kit generate` to produce the migration SQL. [tdd:skip:additive-index-only-no-behavior-change] | New migration file in `packages/db/drizzle/`; `pnpm --filter @saifit/db typecheck` green; existing 5 db vitest cases still pass; no schema-data change | - | cc:TODO |
| 22.2 | Migrate `handleCheckIn` in `apps/line-bot/src/handlers/scheduled.ts` from plain-text push to Flex Message. Create `apps/line-bot/src/lib/flex-checkin.ts` exporting `buildCheckInFlex(locale, webAppUrl)` mirroring 21.1's shape (kicker / title / body / CTA). [tdd:required] | New builder; ≥4 vitest cases (TH / EN / shape / CTA uri); `handleCheckIn` sends Flex; line-bot tsc + vitest green | - | cc:完了 |

#### Non-goals for Phase 22

- No bundle audit of /workout/[id] or /sign-in (deferred — needs investigation budget)
- No new product features
- No schema-data changes (22.1 is additive indexes only)
- No new orchestration infrastructure (use existing tmux multiagent)

---

## 🟢 Completed

Detail lives in commit messages + `memory/decisions.md`. One-line summaries here for the trail.

| Phase | Theme | Tasks | Key commits | Outcome |
|-------|-------|-------|-------------|---------|
| **21** | LINE notification polish + bundle audit (2026-05-22) | 3/3 | (this batch) | Daily-reminder + streak-warning Flex; `/progress` & `/exercises/[slug]` −103 kB First Load each (−43%) via dynamic-import of recharts. Workspace 121/121 tests. |
| **20** | Post-workout reward (2026-05-21) | 1/1 | `301f92a` | Summary page shows PR callout + streak badge; share-to-LINE text localized + enriched with PR. Workspace 109/109. |
| **19** | Weekly summary polish (2026-05-21) | 1/1 | `f6de45e` | Sunday digest upgraded from plain text to LINE Flex bubble (header + stat rows + delta line + CTA). |
| **18** | Return-user loop (2026-05-21) | 5/6 (1 deferred) | `dfbd872` `6d419f2` `2e4b4b8` `ebda689` | Auto-fill from prev session, plate calculator, bar-weight default, home repeat-last-workout card. 18.3 progression nudge **deferred** — heuristics need telemetry; see `memory/decisions.md`. |
| **17** | CLAUDE.md compliance gaps (2026-05-21) | 5/5 | `1830ea0` `be7fab4` `d1f5fde` `8a6c746` | LINE OAuth interstitial EN copy; auth-expiry recovery during active workout (`useAuthStore` + `apiFetch`); cross-driver date coercion audit + lock-in test; empty-state copy upgrade. |
| **16** | Tech debt sweep (2026-05-21) | 8/8 | `a7839ce` `26745b7` `3d530d0` `b1aa855` `a5a5b0f` `16614ae` + UI splits | `requireUser` helper sweep across 28 API routes; shared Valibot schemas; `@saifit/db` queries split by domain; `workout-logger-view` 945→225 LOC; `settings/page` 1024→64 LOC; OpenAPI spec moved out of route file. Browser smoke for 16.4/16.5 still recommended. |
| **15** | Guided workout v2 + warm-up sets (2026-05-20) | 14/14 | `f644a8f` `54f1fa5` `59821bc` `92a5b19` `b246437` `9969030` | warm-up DB schema + API; guided workout view; warm-up toggle in set-row; rest-timer persistence; summary page redesign; error/not-found boundaries; PWA icon refresh; weekly summary volume-delta. |
| 1–14 | (tracked in `SPRINT.md`, all ✅ as of `c687c08`) | — | — | — |

---

## 📦 Archive

Active phases (15–21) live above with one-line summaries. Move them here once a phase is older than ~30 days and no longer worth keeping in the active log.

---

## Status Marker Legend

> The marker tokens (`cc:完了`, `pm:依頼中`, `pm:確認済`) are **protocol values** searched by the compiled `harness` Go binary. They look Japanese but function as opaque identifiers — like Git's `HEAD` or `refs/heads`. Do not translate the tokens themselves; only the descriptions are localized.

| Marker | Meaning |
|--------|---------|
| `pm:依頼中` | PM requested work |
| `cc:TODO` | Not started by Claude Code |
| `cc:WIP` | Claude Code is working |
| `cc:完了` | Claude Code completed; awaiting confirmation |
| `pm:確認済` | PM confirmed completion |
| `blocked` | Blocked; include reason next to task |

---

## Open caveats (not blocking)

- Browser smoke test still pending for: 16.4 / 16.5 / 17.2 / 18.4 / 20.1 (UI changes verified by tsc + biome + vitest only).
- LINE Flex bubbles from 19.1 / 21.1 / 21.2 haven't been seen on a real LINE app yet — schema-valid is necessary but not sufficient.
- Cross-driver integration test against real Neon endpoint deferred to CI infra task.
- 18.3 (progression nudge) deferred pending telemetry; revisit conditions in `memory/decisions.md`.
