"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { PillRow } from "./settings-controls";
import { type User, patchMe } from "./settings-types";

export function TrainingSection({ user }: { user: User }) {
  const t = useTranslations("settings");
  const queryClient = useQueryClient();

  async function handleField(field: "goal" | "gymType" | "daysPerWeek", value: string) {
    const payload = field === "daysPerWeek" ? { daysPerWeek: Number(value) } : { [field]: value };
    await patchMe(payload);
    queryClient.setQueryData<User>(["me"], (old) => (old ? { ...old, ...payload } : old));
  }

  const GOAL_OPTIONS = [
    { value: "build_muscle", label: t("goalBuildMuscle") },
    { value: "lose_fat", label: t("goalLoseFat") },
    { value: "get_stronger", label: t("goalGetStronger") },
    { value: "stay_active", label: t("goalStayActive") },
  ];

  const GYM_OPTIONS = [
    { value: "commercial", label: t("gymCommercial") },
    { value: "home_equipment", label: t("gymHomeEquipment") },
    { value: "home_no_equipment", label: t("gymHomeNoEquipment") },
  ];

  const DAY_OPTIONS = Array.from({ length: 7 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  return (
    <>
      <div style={{ margin: "20px 24px 6px" }}>
        <span className="t-label" style={{ paddingLeft: 2 }}>
          {t("training")}
        </span>
      </div>
      <div className="glass" style={{ margin: "8px 24px", padding: "4px 0" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-line)" }}>
          <p
            style={{
              fontFamily: "K2D, sans-serif",
              fontSize: 12,
              color: "var(--ink-soft)",
              marginBottom: 10,
            }}
          >
            {t("trainingGoal")}
          </p>
          <PillRow
            options={GOAL_OPTIONS}
            value={user.goal}
            onChange={(v) => handleField("goal", v)}
          />
        </div>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-line)" }}>
          <p
            style={{
              fontFamily: "K2D, sans-serif",
              fontSize: 12,
              color: "var(--ink-soft)",
              marginBottom: 10,
            }}
          >
            {t("trainingGymType")}
          </p>
          <PillRow
            options={GYM_OPTIONS}
            value={user.gymType}
            onChange={(v) => handleField("gymType", v)}
          />
        </div>
        <div style={{ padding: "14px 18px" }}>
          <p
            style={{
              fontFamily: "K2D, sans-serif",
              fontSize: 12,
              color: "var(--ink-soft)",
              marginBottom: 10,
            }}
          >
            {t("trainingDaysPerWeek")}
          </p>
          <PillRow
            options={DAY_OPTIONS}
            value={user.daysPerWeek}
            onChange={(v) => handleField("daysPerWeek", v)}
          />
        </div>
      </div>
    </>
  );
}
