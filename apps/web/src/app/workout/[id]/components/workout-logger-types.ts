export interface WorkoutSet {
  id: string;
  workoutId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: string | null;
  isBodyweight: boolean;
  isWarmup: boolean;
  notes: string | null;
  clientSetId: string | null;
  completedAt: string;
  exercise: {
    id: string;
    nameEn: string;
    nameTh: string;
    slug: string;
    muscleGroups: string[];
    equipment: string;
  } | null;
}

export interface WorkoutData {
  id: string;
  name: string;
  userId: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  sets: WorkoutSet[];
}

export interface PrevSet {
  exerciseId: string;
  setNumber: number;
  weightKg: string | null;
  reps: number;
}

export interface PrResult {
  exerciseName: string;
  value: number;
  type: string;
}
