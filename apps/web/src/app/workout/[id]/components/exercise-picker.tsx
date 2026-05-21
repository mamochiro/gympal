"use client";

import { ExerciseAnimation } from "@/components/exercise-animation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface Exercise {
  id: string;
  slug: string;
  nameEn: string;
  nameTh: string;
  category: string;
  muscleGroups: string[];
  equipment: string;
}

export type PickedExercise = Pick<
  Exercise,
  "id" | "nameTh" | "nameEn" | "muscleGroups" | "equipment"
>;

const MUSCLE_FILTERS = [
  { value: "", labelKey: "filterAll" },
  { value: "chest", labelKey: "muscles.chest" },
  { value: "back", labelKey: "muscles.back" },
  { value: "legs", labelKey: "muscles.legs" },
  { value: "shoulders", labelKey: "muscles.shoulders" },
  { value: "arms", labelKey: "muscles.arms" },
  { value: "core", labelKey: "muscles.core" },
  { value: "cardio", labelKey: "muscles.cardio" },
  { value: "full_body", labelKey: "muscles.fullBody" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "chest", label: "หน้าอก" },
  { value: "back", label: "หลัง" },
  { value: "legs", label: "ขา" },
  { value: "shoulders", label: "ไหล่" },
  { value: "arms", label: "แขน" },
  { value: "core", label: "แกนกลาง" },
  { value: "cardio", label: "คาร์ดิโอ" },
  { value: "full_body", label: "ทั้งร่างกาย" },
] as const;

const EQUIPMENT_OPTIONS = [
  { value: "barbell", label: "บาร์เบล" },
  { value: "dumbbell", label: "ดัมเบล" },
  { value: "machine", label: "เครื่อง" },
  { value: "cable", label: "เคเบิล" },
  { value: "bodyweight", label: "น้ำหนักตัว" },
  { value: "kettlebell", label: "เคตเทิลเบล" },
  { value: "band", label: "ยางยืด" },
  { value: "other", label: "อื่นๆ" },
] as const;

// ─── CreateExerciseForm ───────────────────────────────────────────────────────

function CreateExerciseForm({
  onCreated,
  onCancel,
}: {
  onCreated: (ex: PickedExercise) => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [nameTh, setNameTh] = useState("");
  const [category, setCategory] = useState<string>("");
  const [equipment, setEquipment] = useState<string>("");
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);

  const { mutate, isPending, error } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameTh, category, equipment, muscleGroups }),
      });
      if (!res.ok) throw new Error("สร้างท่าออกกำลังกายล้มเหลว");
      return res.json() as Promise<Exercise>;
    },
    onSuccess: (ex) => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      onCreated({
        id: ex.id,
        nameTh: ex.nameTh,
        nameEn: ex.nameEn,
        muscleGroups: ex.muscleGroups,
        equipment: ex.equipment,
      });
    },
  });

  const canSubmit =
    nameTh.trim().length > 0 && category !== "" && equipment !== "" && muscleGroups.length > 0;

  function toggleMuscle(val: string) {
    setMuscleGroups((prev) =>
      prev.includes(val) ? prev.filter((m) => m !== val) : [...prev, val],
    );
  }

  return (
    <div className="overflow-y-auto flex-1 px-4 pb-6 pt-2">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Name */}
        <div>
          <label htmlFor="ex-name" className="text-xs text-muted-foreground block mb-1">
            ชื่อท่า (ภาษาไทย) *
          </label>
          <input
            id="ex-name"
            type="text"
            placeholder="เช่น ดัมเบล หน้าอก"
            value={nameTh}
            onChange={(e) => setNameTh(e.target.value)}
            className="w-full h-12 px-4 bg-secondary border border-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Category */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">กลุ่มกล้ามเนื้อหลัก *</p>
          <div className="flex gap-2 flex-wrap">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                  category === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Muscle groups (multi-select) */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">กล้ามเนื้อที่ใช้ * (เลือกได้หลายกลุ่ม)</p>
          <div className="flex gap-2 flex-wrap">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleMuscle(opt.value)}
                className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                  muscleGroups.includes(opt.value)
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">อุปกรณ์ *</p>
          <div className="flex gap-2 flex-wrap">
            {EQUIPMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEquipment(opt.value)}
                className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                  equipment === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{(error as Error).message}</p>}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-12 rounded-xl bg-secondary text-sm text-muted-foreground font-medium"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => mutate()}
            disabled={!canSubmit || isPending}
            className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
          >
            {isPending ? "กำลังสร้าง..." : "สร้างท่า"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ExercisePicker ───────────────────────────────────────────────────────────

export function ExercisePicker({
  workoutId: _workoutId,
  onClose,
  onSelect,
}: {
  workoutId: string;
  onClose: () => void;
  onSelect: (exercise: PickedExercise) => void;
}) {
  const t = useTranslations("exercises");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [selectedMuscle, setSelectedMuscle] = useState("");
  const [creating, setCreating] = useState(false);

  const handleSearch = (val: string) => {
    setQ(val);
    if (timer) clearTimeout(timer);
    setTimer(setTimeout(() => setDebouncedQ(val), 300));
  };

  const { data, isLoading } = useQuery<{ data: Exercise[] }>({
    queryKey: ["exercises", debouncedQ, selectedMuscle],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      if (selectedMuscle) params.set("muscle", selectedMuscle);
      params.set("limit", "30");
      return fetch(`/api/exercises?${params.toString()}`).then((r) => r.json());
    },
    staleTime: 60_000,
  });

  const exercises = data?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Close"
      />

      {/* Sheet */}
      <div className="relative mt-auto bg-background border-t border-border rounded-t-2xl max-h-[80vh] flex flex-col">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {!creating && <ExerciseAnimation size="sm" />}
              <h2 className="text-base font-semibold leading-[1.7]">
                {creating ? "สร้างท่าใหม่" : t("search")}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {!creating && (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="h-8 px-3 rounded-full bg-secondary text-xs font-medium text-muted-foreground flex items-center gap-1"
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> สร้างท่าใหม่
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center text-muted-foreground"
              >
                ✕
              </button>
            </div>
          </div>

          {!creating && (
            <input
              type="search"
              placeholder={t("search")}
              value={q}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-12 px-4 bg-secondary border border-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-ring"
              // biome-ignore lint/a11y/noAutofocus: intentional — sheet opens for search
              autoFocus
            />
          )}
        </div>

        {creating ? (
          <CreateExerciseForm
            onCreated={(ex) => {
              setCreating(false);
              onSelect(ex);
            }}
            onCancel={() => setCreating(false)}
          />
        ) : (
          <>
            {/* Muscle filter chips */}
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
              {MUSCLE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setSelectedMuscle(f.value)}
                  className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                    selectedMuscle === f.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {t(f.labelKey)}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto flex-1 px-4 pb-6">
              {isLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">กำลังโหลด...</div>
              ) : exercises.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {t("noResults")}
                  <p className="mt-3">
                    <button
                      type="button"
                      onClick={() => setCreating(true)}
                      className="text-primary underline"
                    >
                      สร้างท่าใหม่
                    </button>
                  </p>
                </div>
              ) : (
                <div className="space-y-1 mt-2">
                  {exercises.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() =>
                        onSelect({
                          id: ex.id,
                          nameTh: ex.nameTh,
                          nameEn: ex.nameEn,
                          muscleGroups: ex.muscleGroups,
                          equipment: ex.equipment,
                        })
                      }
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-secondary transition-colors text-left min-h-14"
                    >
                      <div>
                        <p className="text-sm font-medium leading-[1.7]">{ex.nameTh}</p>
                        <p className="text-xs text-muted-foreground">
                          {ex.muscleGroups.join(" · ")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
