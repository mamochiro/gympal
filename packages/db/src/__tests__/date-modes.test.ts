import { describe, expect, it } from "vitest";
import * as schema from "../schema";

/**
 * Schema lock-in: pg `date` columns return strings (YYYY-MM-DD) by default;
 * `timestamp` columns return Date objects.
 *
 * Cross-driver concern (CLAUDE.md):
 *   node-postgres returns Date for `date` columns in mode:'date'
 *   neon-http (HTTP wire) returns ISO strings
 * To keep both drivers consistent we use string mode for `date` columns and
 * Date for `timestamp` columns. This test makes the contract explicit so a
 * future schema edit can't silently regress to mode:'date' without noticing.
 */
describe("schema: date / timestamp column modes", () => {
  it("streaks.lastWorkoutDate uses string mode (cross-driver safe)", () => {
    // dataType is what Drizzle uses to coerce the value coming out of the driver.
    // pg `date` defaults to "string" — leaving the column without mode:'date'
    // is intentional after the cross-driver audit in Phase 17.
    const col = schema.streaks.lastWorkoutDate;
    expect(col.dataType).toBe("string");
  });

  it("body / running / food log date columns are also string mode", () => {
    expect(schema.bodyMeasurements.recordedAt.dataType).toBe("string");
    expect(schema.runningSessions.runDate.dataType).toBe("string");
    expect(schema.foodLogs.logDate.dataType).toBe("string");
  });

  it("timestamp columns are date mode (Date object out)", () => {
    // node-postgres and neon-http both return Date for `timestamp` via Drizzle's
    // default mode:'date'. Use a representative sample so we notice if anyone
    // adds `mode:'string'` to a timestamp column.
    expect(schema.workouts.startedAt.dataType).toBe("date");
    expect(schema.workouts.completedAt.dataType).toBe("date");
    expect(schema.workoutSets.completedAt.dataType).toBe("date");
    expect(schema.users.createdAt.dataType).toBe("date");
  });
});
