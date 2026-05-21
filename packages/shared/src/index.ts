// Shared types, schemas, and utilities
export { estimate1RM, normalizeDecimal, calculateVolume, computeStreakUpdate } from "./utils";
export type { StreakState } from "./utils";

export { barWeightForExercise, mergeSetsWithPrev } from "./workout-suggestions";
export type { MergedSet, PrevSet, SetForMerge } from "./workout-suggestions";

export * as apiSchemas from "./schemas/api";
