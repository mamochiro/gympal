"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { VioletToggle } from "./settings-controls";
import { type User, patchMe } from "./settings-types";

export function RemindersSection({ user }: { user: User }) {
  const t = useTranslations("settings");
  const queryClient = useQueryClient();

  async function handleEnabled(enabled: boolean) {
    await patchMe({ reminderEnabled: enabled });
    queryClient.setQueryData<User>(["me"], (old) =>
      old ? { ...old, reminderEnabled: enabled } : old,
    );
  }

  async function handleTime(time: string) {
    await patchMe({ reminderTime: time });
    queryClient.setQueryData<User>(["me"], (old) => (old ? { ...old, reminderTime: time } : old));
  }

  return (
    <>
      <div style={{ margin: "20px 24px 6px" }}>
        <span className="t-label" style={{ paddingLeft: 2 }}>
          {t("reminders")}
        </span>
      </div>
      <div className="glass" style={{ margin: "8px 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 18px",
            minHeight: 56,
          }}
        >
          <span style={{ fontFamily: "K2D, sans-serif", fontSize: 14, color: "var(--ink)" }}>
            {t("reminderEnabled")}
          </span>
          <VioletToggle checked={user.reminderEnabled} onChange={handleEnabled} />
        </div>
        {user.reminderEnabled && (
          <div style={{ borderTop: "1px solid var(--glass-line)", padding: "12px 18px" }}>
            <label
              htmlFor="reminderTime"
              style={{
                fontFamily: "K2D, sans-serif",
                fontSize: 12,
                color: "var(--ink-soft)",
                display: "block",
                marginBottom: 6,
              }}
            >
              {t("reminderTime")}
            </label>
            <div className="glass-input" style={{ height: 44 }}>
              <input
                id="reminderTime"
                type="time"
                value={user.reminderTime}
                onChange={(e) => handleTime(e.target.value)}
                style={{ colorScheme: "dark" }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
