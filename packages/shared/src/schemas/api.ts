/**
 * Shared Valibot schemas for API routes.
 *
 * Extracted because the same shapes (uuid params, YYYY-MM-DD dates, ISO
 * pagination cursors, integer reps, decimal-string weights) were duplicated
 * inline across 24+ Valibot v.object() blocks in apps/web/src/app/api.
 *
 * Conventions:
 *  - Schemas are *atoms* (single field types), not full request bodies.
 *  - Compose with v.object({ ... }) in the route handler.
 *  - Names use the suffix Schema only when the shape is a v.object; bare
 *    pipes use a descriptive noun (uuid, dateString, etc.).
 */
import * as v from "valibot";

/** UUID v4/v7 string. */
export const uuid = v.pipe(v.string(), v.uuid());

/** YYYY-MM-DD calendar date string (no time component). */
export const dateString = v.pipe(
  v.string(),
  v.regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
);

/** ISO-8601 timestamp string (used for pagination cursors). */
export const isoTimestamp = v.pipe(v.string(), v.isoTimestamp());

/** Non-negative integer (used for reps). */
export const nonNegativeInt = v.pipe(v.number(), v.integer(), v.minValue(0));

/**
 * Weight as a decimal-string with bounded length. Drizzle stores weight as
 * `numeric` and round-trips it as string under neon-http; web routes pass it
 * through without parsing so a bounded string is the right shape.
 */
export const weightString = v.pipe(v.string(), v.maxLength(20));

/**
 * Cursor-paginated list query. `cursor` is an ISO timestamp, `limit` is a
 * stringly-typed integer (from URLSearchParams) coerced to a number in [1, max].
 */
export function cursorPaginationSchema(maxLimit = 50) {
  return v.object({
    cursor: v.optional(isoTimestamp),
    limit: v.optional(
      v.pipe(v.string(), v.transform(Number), v.integer(), v.minValue(1), v.maxValue(maxLimit)),
    ),
  });
}
