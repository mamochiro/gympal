export interface User {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  unitsPreference: "kg" | "lb";
  locale: "th" | "en";
  reminderEnabled: boolean;
  reminderTime: string;
  goal: "build_muscle" | "lose_fat" | "get_stronger" | "stay_active" | null;
  gymType: "commercial" | "home_equipment" | "home_no_equipment" | null;
  daysPerWeek: number | null;
  defaultTargetKcal: number | null;
  defaultTargetProteinG: number | null;
  defaultTargetCarbsG: number | null;
  defaultTargetFatG: number | null;
}

export interface ConnectedAccount {
  id: string;
  provider?: string;
  providerId?: string;
}

export async function patchMe(data: Record<string, unknown>): Promise<void> {
  await fetch("/api/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
