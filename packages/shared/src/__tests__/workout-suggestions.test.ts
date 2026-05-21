import { describe, expect, it } from "vitest";
import { type PrevSet, type SetForMerge, mergeSetsWithPrev } from "../workout-suggestions";

const set = (overrides: Partial<SetForMerge> = {}): SetForMerge => ({
  id: "set-1",
  exerciseId: "bench",
  setNumber: 1,
  weightKg: null,
  reps: 0,
  ...overrides,
});

const prev = (overrides: Partial<PrevSet> = {}): PrevSet => ({
  exerciseId: "bench",
  setNumber: 1,
  weightKg: "80",
  reps: 5,
  ...overrides,
});

describe("mergeSetsWithPrev", () => {
  it("suggests prev values when the current set is empty and a match exists", () => {
    const [m] = mergeSetsWithPrev([set()], [prev()]);
    expect(m).toEqual({ setId: "set-1", weight: "80", reps: "5", isSuggested: true });
  });

  it("uses server values (not suggestions) when the current set already has data", () => {
    const [m] = mergeSetsWithPrev([set({ weightKg: "85", reps: 6 })], [prev()]);
    expect(m).toEqual({ setId: "set-1", weight: "85", reps: "6", isSuggested: false });
  });

  it("returns empty strings when no prev match exists", () => {
    const [m] = mergeSetsWithPrev([set()], []);
    expect(m).toEqual({ setId: "set-1", weight: "", reps: "", isSuggested: false });
  });

  it("does not suggest when prev has null weight (bodyweight exercise)", () => {
    const [m] = mergeSetsWithPrev([set()], [prev({ weightKg: null, reps: 10 })]);
    expect(m).toEqual({ setId: "set-1", weight: "", reps: "", isSuggested: false });
  });

  it("matches by exerciseId AND setNumber together (not just one)", () => {
    const current = [set({ id: "s1", setNumber: 2 })];
    const prevs = [prev({ setNumber: 1 })]; // different setNumber
    const [m] = mergeSetsWithPrev(current, prevs);
    expect(m.isSuggested).toBe(false);
    expect(m.weight).toBe("");
  });

  it("handles set-count mismatch: more current than prev", () => {
    const current = [
      set({ id: "s1", setNumber: 1 }),
      set({ id: "s2", setNumber: 2 }),
      set({ id: "s3", setNumber: 3 }),
    ];
    const prevs = [prev({ setNumber: 1 }), prev({ setNumber: 2 })];
    const merged = mergeSetsWithPrev(current, prevs);
    expect(merged[0].isSuggested).toBe(true);
    expect(merged[1].isSuggested).toBe(true);
    expect(merged[2].isSuggested).toBe(false);
    expect(merged[2].weight).toBe("");
  });

  it("does not cross-match between different exercises", () => {
    const current = [set({ exerciseId: "squat" })];
    const prevs = [prev({ exerciseId: "bench" })];
    const [m] = mergeSetsWithPrev(current, prevs);
    expect(m.isSuggested).toBe(false);
  });

  it("preserves the input setId on each merged entry", () => {
    const merged = mergeSetsWithPrev([set({ id: "abc" }), set({ id: "xyz", setNumber: 2 })], []);
    expect(merged.map((m) => m.setId)).toEqual(["abc", "xyz"]);
  });
});
