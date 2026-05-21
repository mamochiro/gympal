---
_harness_template: "memory/decisions.md.template"
_harness_version: "2.5.27"
---

# Decisions (SSOT)

This file is the Single Source of Truth for **important decisions**.
Don't keep the full debate — record the **conclusion, reasoning, and
trade-offs** briefly and reliably.

## Index

- 2026-05-21: Phase 18 focuses on workout-core depth, not breadth or insights #strategy #mvp #retention

---

## 2026-05-21: Phase 18 focuses on workout-core depth, not breadth or insights #strategy #mvp #retention

### Conclusion

- Phase 18 = "Return-user loop": auto-fill from prev session, plate calculator, +2.5kg progression nudge, repeat-last-workout card, bar-weight default. Make the *second* workout effortless, not the first.

### Background

- Phases 15/16/17 closed feature breadth (warm-up, guided mode, settings split, auth-expiry, CLAUDE.md gaps). The codebase is now broad — 7 top-level features (workout, routines, body, food, run, progress, settings) — but only the workout core delivers the "log in 3s" promise *for first-time use*. On the second workout, you retype every weight/rep. The retention loss happens here, not in feature breadth.

### Options

- A (picked): Workout-core depth — close the gap between displayed prev values (`LastSessionRow` already shows them) and pre-filled inputs. ~6 tasks, ~5h, every task independent.
- B: Cross-feature insights — body recomp scorecard, eat-vs-train balance. Requires users to log multiple silos consistently; gated by direction-A retention.
- C: LINE bot Flex Messages — premium feel, Bangkok-platform leverage. Polishes the messenger before the message is great.
- D: Design polish (haptics, microinteractions). Solo dev without telemetry → guesswork.
- E: Production foundation (Sentry/analytics/E2E). Pays back over time; premature at MVP scale.

### Reasoning

- The product's #1 promise is delivered for novelty users but broken for returning users. Fixing that compounds for every retained user, every workout.
- Every direction-A task reuses existing infra (`getLastWorkoutSetsForExercise` from 15.2, `prevSets` prop on `WorkoutLoggerView`, shared utils package). Net new mechanism count: 0. Cost is low.
- B/C/D/E are all valid follow-ups but each depends on A being great first. Insights need data → data needs logging → logging needs to not suck. Same for polish/LINE/foundation.

### Impact / trade-offs

- Code: ~19 new tests, 5 new helpers in `@saifit/shared`, 1 new UI component (`<RepeatLastWorkoutCard>`), no schema migrations.
- UX: users who progressively overload will love the +2.5kg nudge; users who deload may find it presumptuous (mitigated via deload-detection).
- Future change difficulty: low. Each helper is a pure function; UI hints are dismissible.
- Deferred: voice input, supersets, configurable bar weight, plate calculator settings page.

### Revisit when

- A user logs ≥10 workouts but doesn't progressively overload → progression nudge logic may be wrong.
- Telemetry (if added) shows the repeat-last-workout card has <20% tap-through → home-screen IA needs rethinking.
- The non-workout features (food/body/run) start getting daily-active users → cross-feature insights (option B) becomes the right next move.

### Related

- PR / Issue: Plans.md Phase 18 (2026-05-21)
- references: CLAUDE.md "Core value: Track workouts in seconds. See your gains. Stay consistent."

### Conclusion

- (What was decided, 1–3 lines)

### Background

- (Why this needed deciding now)

### Options

- A: (option)
- B: (option)

### Reasoning

- (Decisive factors; aim for ≤3 bullets)

### Impact / trade-offs

- (Ops cost, dollar cost, future change difficulty, etc.)

### Revisit when

- (Conditions that would justify reopening — SLO breach, scale, requirement change, etc.)

### Related

- PR / Issue:
- references:
