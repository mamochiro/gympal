"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ConnectedAccountsSection } from "./components/connected-accounts-section";
import { DataExportSection } from "./components/data-export-section";
import { NutritionSection } from "./components/nutrition-section";
import { ProfileSection } from "./components/profile-section";
import { PushNotificationsSection } from "./components/push-notifications-section";
import { RemindersSection } from "./components/reminders-section";
import { SettingsSkeleton } from "./components/settings-controls";
import type { User } from "./components/settings-types";
import { TrainingSection } from "./components/training-section";
import { UnitsSection } from "./components/units-section";

export default function SettingsPage() {
  const t = useTranslations("settings");

  const { data, isLoading } = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => fetch("/api/me").then((r) => r.json()),
    staleTime: 60_000,
  });

  if (isLoading || !data) return <SettingsSkeleton />;

  const GOAL_OPTIONS = [
    { value: "build_muscle", label: t("goalBuildMuscle") },
    { value: "lose_fat", label: t("goalLoseFat") },
    { value: "get_stronger", label: t("goalGetStronger") },
    { value: "stay_active", label: t("goalStayActive") },
  ];
  const goalLabel = GOAL_OPTIONS.find((o) => o.value === data.goal)?.label ?? "";

  return (
    <div className="saifit-bg" style={{ minHeight: "100vh", paddingBottom: 110 }}>
      <div style={{ padding: "40px 24px 0" }}>
        <span className="t-label">ACCOUNT</span>
        <h1
          style={{
            fontFamily: "K2D, sans-serif",
            fontWeight: 700,
            fontSize: 26,
            color: "var(--ink)",
            letterSpacing: "-0.01em",
            lineHeight: 1.15,
            margin: "6px 0 28px",
          }}
        >
          {t("title")}
        </h1>
      </div>

      <ProfileSection user={data} goalLabel={goalLabel} />
      <TrainingSection user={data} />
      <NutritionSection user={data} />
      <UnitsSection user={data} />
      <PushNotificationsSection />
      <RemindersSection user={data} />
      <ConnectedAccountsSection />
      <DataExportSection />
    </div>
  );
}
