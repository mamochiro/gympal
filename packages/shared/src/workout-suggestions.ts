// Pre-fill helpers for the workout logger. The "second workout" experience:
// when a user repeats an exercise, the previous session's weight/reps should
// appear as ghost-text suggestions in the inputs. Tap complete without
// editing to accept; type to override.

export interface SetForMerge {
  id: string;
  exerciseId: string;
  setNumber: number;
  weightKg: string | null;
  reps: number;
}

export interface PrevSet {
  exerciseId: string;
  setNumber: number;
  weightKg: string | null;
  reps: number;
}

export interface MergedSet {
  setId: string;
  weight: string;
  reps: string;
  isSuggested: boolean;
}

/**
 * For each current set, return the values to display in the inputs.
 *
 * - Server already has values → use them as-is, isSuggested=false.
 * - Server-empty + matching prev set with a weight → use prev values, isSuggested=true.
 * - Server-empty + no match (or prev has null weight) → empty strings, isSuggested=false.
 *
 * "Matching" = same exerciseId AND same setNumber.
 */
// Available barbell plates (kg), largest first. Greedy fit per side.
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

export interface PlateEntry {
  /** Plate weight in kg (one of PLATES_KG). */
  weightKg: number;
  /** How many of these plates to load on *each* side. */
  count: number;
}

/**
 * Compute the symmetric plate loadout for `weightKg` total on the bar.
 *
 * Returns:
 *   - PlateEntry[] (possibly empty if weightKg === barWeightKg) when the
 *     target weight is representable in 1.25 kg increments per side.
 *   - null when weightKg < barWeightKg, or when the per-side remainder
 *     can't be expressed with the available plate set.
 *
 * Counts are per side; load each plate on both sides for symmetry.
 */
export function computePlates(weightKg: number, barWeightKg: number): PlateEntry[] | null {
  if (weightKg < barWeightKg) return null;
  let perSide = (weightKg - barWeightKg) / 2;
  // 1.25 kg is the smallest plate → per-side weight must be a multiple of 1.25
  const remainder = Math.round(perSide * 10000) % 12500;
  if (remainder !== 0) return null;

  const result: PlateEntry[] = [];
  for (const plate of PLATES_KG) {
    const count = Math.floor((perSide + 1e-9) / plate);
    if (count > 0) {
      result.push({ weightKg: plate, count });
      perSide -= count * plate;
      perSide = Math.round(perSide * 10000) / 10000;
    }
  }
  if (Math.abs(perSide) > 1e-6) return null;
  return result;
}

/**
 * Default starting weight (kg) for the bar of a barbell exercise.
 * Returns 20 for barbell equipment, null otherwise. Saves the user one or
 * two keystrokes when logging a first-ever barbell set with no prev history.
 *
 * Olympic men's bar = 20 kg (Bangkok-gym default). Women's bar (15 kg) and
 * specialty bars (EZ, trap, safety) are deferred until per-user configuration
 * lands; ship a single sensible default.
 */
export function barWeightForExercise(exercise: { equipment: string }): number | null {
  return exercise.equipment === "barbell" ? 20 : null;
}

export function mergeSetsWithPrev(currentSets: SetForMerge[], prevSets: PrevSet[]): MergedSet[] {
  return currentSets.map((current) => {
    const hasServerData = current.weightKg !== null || current.reps > 0;
    if (hasServerData) {
      return {
        setId: current.id,
        weight: current.weightKg ?? "",
        reps: current.reps > 0 ? String(current.reps) : "",
        isSuggested: false,
      };
    }
    const prev = prevSets.find(
      (p) => p.exerciseId === current.exerciseId && p.setNumber === current.setNumber,
    );
    if (!prev || prev.weightKg === null) {
      return {
        setId: current.id,
        weight: "",
        reps: "",
        isSuggested: false,
      };
    }
    return {
      setId: current.id,
      weight: prev.weightKg,
      reps: String(prev.reps),
      isSuggested: true,
    };
  });
}
