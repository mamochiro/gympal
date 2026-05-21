// Shared types, schemas, and utilities
export { estimate1RM, normalizeDecimal, calculateVolume, computeStreakUpdate } from "./utils";
export type { StreakState } from "./utils";

export { barWeightForExercise, computePlates, mergeSetsWithPrev } from "./workout-suggestions";
export type { MergedSet, PlateEntry, PrevSet, SetForMerge } from "./workout-suggestions";

export * as apiSchemas from "./schemas/api";
