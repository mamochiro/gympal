/**
 * Unit tests for getLastWorkoutSetsForExercise.
 *
 * The function calls getDb() internally — we mock the client module to
 * inject a query builder spy and assert branching behavior.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const selectChain = (returnValue: unknown) => ({
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(returnValue),
          }),
        }),
      }),
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(returnValue),
      }),
    }),
  }),
});

vi.mock("../../client", () => ({
  getDb: vi.fn(),
}));

const { getDb } = await import("../../client");
const { getLastWorkoutSetsForExercise } = await import("../workout");

describe("getLastWorkoutSetsForExercise", () => {
  beforeEach(() => {
    vi.mocked(getDb).mockReset();
  });

  it("returns [] when the user has no completed workouts for the exercise", async () => {
    // First call to db.select() returns [] (no last workout)
    vi.mocked(getDb).mockReturnValue(selectChain([]) as never);

    const result = await getLastWorkoutSetsForExercise("user-1", "exercise-1");
    expect(result).toEqual([]);
  });

  it("returns the sets of the most recent completed workout when one exists", async () => {
    const mockSets = [
      { reps: 10, weightKg: "80", isWarmup: false },
      { reps: 8, weightKg: "80", isWarmup: false },
      { reps: 6, weightKg: "85", isWarmup: false },
    ];

    // The function calls db.select() twice — first for the last workout id,
    // then for the sets in that workout. Use a fresh chain that returns
    // the workout id on the first call and the sets on the second.
    let callCount = 0;
    vi.mocked(getDb).mockReturnValue({
      select: vi.fn().mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          // Last workout lookup
          return {
            from: () => ({
              innerJoin: () => ({
                where: () => ({
                  orderBy: () => ({
                    limit: () => Promise.resolve([{ id: "workout-abc" }]),
                  }),
                }),
              }),
            }),
          };
        }
        // Sets lookup
        return {
          from: () => ({
            where: () => ({
              orderBy: () => Promise.resolve(mockSets),
            }),
          }),
        };
      }),
    } as never);

    const result = await getLastWorkoutSetsForExercise("user-1", "exercise-1");
    expect(result).toEqual(mockSets);
  });
});
