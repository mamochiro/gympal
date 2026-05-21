import { describe, expect, it } from "vitest";
import { calculateVolume, computeStreakUpdate, estimate1RM, normalizeDecimal } from "../utils";

describe("estimate1RM", () => {
  it("returns weight unchanged for 1 rep (identity)", () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });

  it("calculates Brzycki 1RM for 8 reps at 100kg", () => {
    const result = estimate1RM(100, 8);
    expect(result).not.toBeNull();
    expect(result as number).toBeCloseTo(124.14, 1);
  });

  it("returns null for reps > 12", () => {
    expect(estimate1RM(80, 13)).toBeNull();
    expect(estimate1RM(80, 20)).toBeNull();
  });

  it("returns a value (not null) for exactly 12 reps", () => {
    const result = estimate1RM(80, 12);
    expect(result).not.toBeNull();
    expect(result as number).toBeGreaterThan(80);
  });
});

describe("normalizeDecimal", () => {
  it("replaces comma with dot", () => {
    expect(normalizeDecimal("60,5")).toBe("60.5");
  });

  it("leaves existing dot unchanged", () => {
    expect(normalizeDecimal("60.5")).toBe("60.5");
  });

  it("leaves integers unchanged", () => {
    expect(normalizeDecimal("100")).toBe("100");
  });
});

describe("calculateVolume", () => {
  it("sums reps × weightKg for all sets", () => {
    expect(
      calculateVolume([
        { reps: 10, weightKg: 100 },
        { reps: 8, weightKg: 80 },
      ]),
    ).toBe(1640);
  });

  it("treats null weightKg as 0 contribution", () => {
    expect(
      calculateVolume([
        { reps: 10, weightKg: null },
        { reps: 5, weightKg: 50 },
      ]),
    ).toBe(250);
  });

  it("returns 0 for empty array", () => {
    expect(calculateVolume([])).toBe(0);
  });
});

describe("computeStreakUpdate (streak grace-day)", () => {
  const base = { currentStreak: 5, longestStreak: 10, lastWorkoutDate: "2025-05-08" };

  it("no change when today already logged", () => {
    const r = computeStreakUpdate(base, "2025-05-08");
    expect(r).toEqual({ newCurrent: 5, newLongest: 10 });
  });

  it("increments streak on consecutive day", () => {
    const r = computeStreakUpdate(base, "2025-05-09");
    expect(r).toEqual({ newCurrent: 6, newLongest: 10 });
  });

  it("grace day — 1-day gap keeps streak alive", () => {
    // Missed 2025-05-09; logging on 2025-05-10 still extends
    const r = computeStreakUpdate(base, "2025-05-10");
    expect(r.newCurrent).toBe(6);
    expect(r.newLongest).toBe(10);
  });

  it("resets to 1 after 2-day gap (no grace available)", () => {
    const r = computeStreakUpdate(base, "2025-05-11");
    expect(r).toEqual({ newCurrent: 1, newLongest: 10 });
  });

  it("starts streak at 1 when no previous workout", () => {
    const r = computeStreakUpdate(
      { currentStreak: 0, longestStreak: 0, lastWorkoutDate: null },
      "2025-05-10",
    );
    expect(r).toEqual({ newCurrent: 1, newLongest: 1 });
  });

  it("updates longestStreak when current exceeds it", () => {
    const r = computeStreakUpdate(
      { currentStreak: 10, longestStreak: 10, lastWorkoutDate: "2025-05-09" },
      "2025-05-10",
    );
    expect(r).toEqual({ newCurrent: 11, newLongest: 11 });
  });

  it("longestStreak preserved (not overwritten) on reset", () => {
    const r = computeStreakUpdate(base, "2025-05-15"); // 7-day gap
    expect(r.newCurrent).toBe(1);
    expect(r.newLongest).toBe(10); // unchanged
  });
});

// ─── Phase 16.8 — hot-path coverage gaps ─────────────────────────────────

describe("estimate1RM (additional edge cases)", () => {
  it("returns weight unchanged when weight is 0 and reps === 1", () => {
    expect(estimate1RM(0, 1)).toBe(0);
  });

  it("scales linearly with weight at fixed reps", () => {
    const r5 = estimate1RM(100, 5);
    const r10 = estimate1RM(200, 5);
    expect(r5).not.toBeNull();
    expect(r10).not.toBeNull();
    expect((r10 as number) / (r5 as number)).toBeCloseTo(2, 5);
  });

  it("Brzycki for 12 reps matches the formula (locked at the cutoff)", () => {
    // 100 * 36 / (37 - 12) = 144
    expect(estimate1RM(100, 12)).toBeCloseTo(144, 1);
  });
});

describe("normalizeDecimal (additional edge cases)", () => {
  it("returns empty string unchanged", () => {
    expect(normalizeDecimal("")).toBe("");
  });

  it("replaces only the FIRST comma (current behavior — locked)", () => {
    // Documents current impl: String.replace(",", ".") replaces only the first match.
    expect(normalizeDecimal("1,000,5")).toBe("1.000,5");
  });

  it("preserves surrounding whitespace (caller trims)", () => {
    expect(normalizeDecimal(" 60,5 ")).toBe(" 60.5 ");
  });
});

describe("calculateVolume (additional edge cases)", () => {
  it("single set with weight is weight × reps", () => {
    expect(calculateVolume([{ reps: 5, weightKg: 100 }])).toBe(500);
  });

  it("sums correctly across mixed null and non-null sets", () => {
    expect(
      calculateVolume([
        { reps: 8, weightKg: 80 }, // 640
        { reps: 10, weightKg: null }, // 0 (bodyweight)
        { reps: 5, weightKg: 100 }, // 500
      ]),
    ).toBe(1140);
  });
});

describe("computeStreakUpdate (additional edge cases)", () => {
  it("first-ever workout preserves existing longestStreak when ≥ 1", () => {
    // Edge case: longestStreak > currentStreak (data inconsistency or imported history)
    const r = computeStreakUpdate(
      { currentStreak: 0, longestStreak: 7, lastWorkoutDate: null },
      "2025-05-10",
    );
    expect(r).toEqual({ newCurrent: 1, newLongest: 7 });
  });

  it("crosses a month boundary correctly", () => {
    const r = computeStreakUpdate(
      { currentStreak: 5, longestStreak: 5, lastWorkoutDate: "2025-04-30" },
      "2025-05-01",
    );
    expect(r).toEqual({ newCurrent: 6, newLongest: 6 });
  });

  it("grace day across month boundary keeps streak", () => {
    // Last on Apr 29, today is May 1 — diff = 2 days → grace path
    const r = computeStreakUpdate(
      { currentStreak: 3, longestStreak: 3, lastWorkoutDate: "2025-04-29" },
      "2025-05-01",
    );
    expect(r).toEqual({ newCurrent: 4, newLongest: 4 });
  });
});
