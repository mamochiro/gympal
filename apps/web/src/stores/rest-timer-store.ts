import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface RestTimerState {
  isActive: boolean;
  duration: number;
  preferredRestDuration: number;
  startedAt: number | null;
  pausedAt: number | null;
  elapsed: number;
  workoutId: string | null;
  exerciseName: string | null;
  setNumber: number | null;
  nextWeight: string | null;
  nextReps: string | null;
  nextSetNumber: number | null;
}

interface RestTimerActions {
  start: (opts: {
    duration?: number;
    workoutId: string;
    exerciseName: string;
    setNumber: number;
    nextWeight?: string | null;
    nextReps?: string | null;
    nextSetNumber?: number | null;
  }) => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  addSeconds: (delta: number) => void;
  setPreferredRestDuration: (sec: number) => void;
  getRemaining: () => number;
}

const DEFAULT_REST = 90;

const initialState: RestTimerState = {
  isActive: false,
  duration: DEFAULT_REST,
  preferredRestDuration: DEFAULT_REST,
  startedAt: null,
  pausedAt: null,
  elapsed: 0,
  workoutId: null,
  exerciseName: null,
  setNumber: null,
  nextWeight: null,
  nextReps: null,
  nextSetNumber: null,
};

export const useRestTimerStore = create<RestTimerState & RestTimerActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      start: ({
        duration,
        workoutId,
        exerciseName,
        setNumber,
        nextWeight,
        nextReps,
        nextSetNumber,
      }) => {
        const preferred = get().preferredRestDuration;
        set({
          isActive: true,
          duration: duration ?? preferred,
          startedAt: Date.now(),
          pausedAt: null,
          elapsed: 0,
          workoutId,
          exerciseName,
          setNumber,
          nextWeight: nextWeight ?? null,
          nextReps: nextReps ?? null,
          nextSetNumber: nextSetNumber ?? null,
        });
      },

      pause: () => {
        const { startedAt, elapsed } = get();
        if (!startedAt) return;
        const nowElapsed = elapsed + (Date.now() - startedAt) / 1000;
        set({ pausedAt: Date.now(), elapsed: nowElapsed, startedAt: null });
      },

      resume: () => {
        set({ startedAt: Date.now(), pausedAt: null });
      },

      cancel: () => set({ ...initialState, preferredRestDuration: get().preferredRestDuration }),

      addSeconds: (delta: number) => {
        const { duration } = get();
        const next = Math.max(5, duration + delta);
        set({ duration: next, preferredRestDuration: next });
      },

      setPreferredRestDuration: (sec: number) => {
        const clamped = Math.max(5, Math.min(600, sec));
        set({ preferredRestDuration: clamped });
      },

      getRemaining: () => {
        const { isActive, duration, startedAt, elapsed, pausedAt } = get();
        if (!isActive) return 0;
        if (pausedAt !== null) return Math.max(0, duration - elapsed);
        if (!startedAt) return duration;
        const totalElapsed = elapsed + (Date.now() - startedAt) / 1000;
        return Math.max(0, duration - totalElapsed);
      },
    }),
    {
      name: "saifit-rest-timer",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : localStorage,
      ),
      // Only persist the preference + active timer state — not transient UI
      partialize: (state) => ({
        preferredRestDuration: state.preferredRestDuration,
        isActive: state.isActive,
        duration: state.duration,
        startedAt: state.startedAt,
        pausedAt: state.pausedAt,
        elapsed: state.elapsed,
        workoutId: state.workoutId,
        exerciseName: state.exerciseName,
        setNumber: state.setNumber,
        nextWeight: state.nextWeight,
        nextReps: state.nextReps,
        nextSetNumber: state.nextSetNumber,
      }),
    },
  ),
);
