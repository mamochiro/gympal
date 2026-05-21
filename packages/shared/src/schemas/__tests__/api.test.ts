import { describe, expect, it } from "vitest";
import * as v from "valibot";
import {
  cursorPaginationSchema,
  dateString,
  isoTimestamp,
  nonNegativeInt,
  uuid,
  weightString,
} from "../api";

describe("uuid", () => {
  it("accepts a valid v4 uuid", () => {
    expect(v.safeParse(uuid, "550e8400-e29b-41d4-a716-446655440000").success).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(v.safeParse(uuid, "").success).toBe(false);
  });

  it("rejects a non-uuid string", () => {
    expect(v.safeParse(uuid, "not-a-uuid").success).toBe(false);
  });
});

describe("dateString", () => {
  it("accepts YYYY-MM-DD", () => {
    expect(v.safeParse(dateString, "2026-05-21").success).toBe(true);
  });

  it("rejects ISO timestamp (has time component)", () => {
    expect(v.safeParse(dateString, "2026-05-21T10:00:00Z").success).toBe(false);
  });

  it("rejects a malformed date string", () => {
    expect(v.safeParse(dateString, "21/05/2026").success).toBe(false);
  });
});

describe("isoTimestamp", () => {
  it("accepts an ISO-8601 timestamp", () => {
    expect(v.safeParse(isoTimestamp, "2026-05-21T10:00:00.000Z").success).toBe(true);
  });

  it("rejects a plain date string", () => {
    expect(v.safeParse(isoTimestamp, "2026-05-21").success).toBe(false);
  });
});

describe("nonNegativeInt", () => {
  it("accepts 0", () => {
    expect(v.safeParse(nonNegativeInt, 0).success).toBe(true);
  });

  it("accepts a positive integer", () => {
    expect(v.safeParse(nonNegativeInt, 42).success).toBe(true);
  });

  it("rejects negative", () => {
    expect(v.safeParse(nonNegativeInt, -1).success).toBe(false);
  });

  it("rejects a float", () => {
    expect(v.safeParse(nonNegativeInt, 1.5).success).toBe(false);
  });
});

describe("weightString", () => {
  it("accepts a decimal string", () => {
    expect(v.safeParse(weightString, "82.5").success).toBe(true);
  });

  it("accepts an empty string (callers compose with minLength when needed)", () => {
    expect(v.safeParse(weightString, "").success).toBe(true);
  });

  it("rejects a 21+ character string", () => {
    expect(v.safeParse(weightString, "1".repeat(21)).success).toBe(false);
  });
});

describe("cursorPaginationSchema()", () => {
  const schema = cursorPaginationSchema(50);

  it("accepts an empty object (all fields optional)", () => {
    expect(v.safeParse(schema, {}).success).toBe(true);
  });

  it("transforms limit string -> number", () => {
    const result = v.safeParse(schema, { limit: "25" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.output.limit).toBe(25);
  });

  it("rejects limit above maxLimit", () => {
    const result = v.safeParse(cursorPaginationSchema(10), { limit: "11" });
    expect(result.success).toBe(false);
  });

  it("accepts an ISO timestamp cursor", () => {
    expect(v.safeParse(schema, { cursor: "2026-05-21T10:00:00Z" }).success).toBe(true);
  });

  it("rejects a non-ISO cursor", () => {
    expect(v.safeParse(schema, { cursor: "yesterday" }).success).toBe(false);
  });
});
