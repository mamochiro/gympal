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
- 2026-05-21: Defer 18.3 (progression nudge) — magic numbers need telemetry, not guesses #scope-reduction #heuristics #ux

---

## 2026-05-21: Defer 18.3 (progression nudge) — magic numbers need telemetry, not guesses #scope-reduction #heuristics #ux

### Conclusion

- 18.3 ("+2.5 kg?" nudge after 2 successful sessions) is deferred mid-phase. The remaining Phase 18 work (18.1, 18.2, 18.4, 18.5, 18.6) stays in scope and ships.

### Background

- 18.3 requires three magic numbers: a fixed +2.5 kg jump, an 8-rep "target" threshold for declaring a session successful, and an 80% recent-vs-prior weight ratio to detect deloads. Without telemetry on rep distributions per exercise or week-over-week weight changes, all three are educated guesses. Shipping speculative coaching logic risks nagging users with bad advice — worse than shipping no coaching.

### Options

- A (picked): Defer. Mark task as `deferred` in Plans.md with the revisit condition. Don't ship 18.3 in Phase 18.
- B: Ship with the magic numbers and reserve the right to tune later. Risk: bad first-impression nags users away.
- C: Ship behind a feature flag, off by default. Cost of adding flag infra > value of the unflipped feature.
- D: Ship as a one-tap settings toggle ("show progression suggestions"). Still doesn't answer "are the thresholds right".

### Reasoning

- Asymmetric risk: a wrong nudge is more harmful than no nudge. Users who notice it don't think "neat suggestion", they think "the app doesn't understand me".
- The other 18.x tasks (auto-fill, plate calculator, bar default, repeat-last-workout card) make the second workout effortless *without* opinionated coaching. That's the actual product promise.
- Telemetry to validate the thresholds doesn't exist yet, and adding it (Sentry / PostHog / etc.) is its own Phase.

### Impact / trade-offs

- Phase 18 ships with 4 user-visible improvements instead of 5. Theme intact.
- No code rot — the helper file is the right place for it later; nothing committed today blocks 18.3 from being picked back up.
- Future Phase pickup: design 18.3 with real rep-distribution data so the threshold is empirically defensible.

### Revisit when

- Per-user telemetry exists for: rep counts per set / session-over-session weight changes per exercise / dismissal rates on similar UI hints.
- A user explicitly asks "why doesn't the app suggest I go up in weight?"
- A power-user persona is being targeted where opinionated coaching is the differentiator (not the current MVP positioning).

### Related

- PR / Issue: Plans.md Phase 18 (2026-05-21), commit b660a7d (phase plan)
- references: [[2026-05-21-phase-18-workout-core-depth]]

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
