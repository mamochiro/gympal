"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { GlassSegmented } from "./settings-controls";
import { type User, patchMe } from "./settings-types";

export function UnitsSection({ user }: { user: User }) {
  const t = useTranslations("settings");
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleUnits(units: string) {
    await patchMe({ unitsPreference: units });
    queryClient.setQueryData<User>(["me"], (old) =>
      old ? { ...old, unitsPreference: units as "kg" | "lb" } : old,
    );
  }

  async function handleLocale(locale: string) {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    await patchMe({ locale });
    queryClient.setQueryData<User>(["me"], (old) =>
      old ? { ...old, locale: locale as "th" | "en" } : old,
    );
    router.refresh();
  }

  return (
    <>
      <div style={{ margin: "20px 24px 6px" }}>
        <span className="t-label" style={{ paddingLeft: 2 }}>
          {t("units")}
        </span>
      </div>
      <GlassSegmented
        options={[
          { value: "kg", label: t("kg") },
          { value: "lb", label: t("lb") },
        ]}
        value={user.unitsPreference}
        onChange={handleUnits}
      />

      <div style={{ margin: "20px 24px 6px" }}>
        <span className="t-label" style={{ paddingLeft: 2 }}>
          {t("language")}
        </span>
      </div>
      <GlassSegmented
        options={[
          { value: "th", label: t("thai") },
          { value: "en", label: t("english") },
        ]}
        value={user.locale}
        onChange={handleLocale}
      />
    </>
  );
}
