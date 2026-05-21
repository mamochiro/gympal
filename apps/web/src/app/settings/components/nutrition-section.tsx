"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { User } from "./settings-types";

export function NutritionSection({ user }: { user: User }) {
  const t = useTranslations("settings");
  const [nutritionSaved, setNutritionSaved] = useState(false);
  const [kcal, setKcal] = useState(user.defaultTargetKcal ?? 2100);
  const [protein, setProtein] = useState(user.defaultTargetProteinG ?? 150);
  const [carbs, setCarbs] = useState(user.defaultTargetCarbsG ?? 220);
  const [fat, setFat] = useState(user.defaultTargetFatG ?? 70);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    if (user.defaultTargetKcal != null) setKcal(user.defaultTargetKcal);
    if (user.defaultTargetProteinG != null) setProtein(user.defaultTargetProteinG);
    if (user.defaultTargetCarbsG != null) setCarbs(user.defaultTargetCarbsG);
    if (user.defaultTargetFatG != null) setFat(user.defaultTargetFatG);
    initialized.current = true;
  }, [user]);

  async function handleBlur() {
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultTargetKcal: kcal,
        defaultTargetProteinG: protein,
        defaultTargetCarbsG: carbs,
        defaultTargetFatG: fat,
      }),
    });
    if (res.ok) {
      setNutritionSaved(true);
      setTimeout(() => setNutritionSaved(false), 2000);
    }
  }

  const FIELDS = [
    { id: "kcal", label: t("nutritionKcal"), value: kcal, set: setKcal, min: 1000, max: 5000 },
    {
      id: "protein",
      label: t("nutritionProtein"),
      value: protein,
      set: setProtein,
      min: 50,
      max: 400,
    },
    { id: "carbs", label: t("nutritionCarbs"), value: carbs, set: setCarbs, min: 50, max: 600 },
    { id: "fat", label: t("nutritionFat"), value: fat, set: setFat, min: 20, max: 200 },
  ] as const;

  return (
    <>
      <div style={{ margin: "20px 24px 6px", display: "flex", alignItems: "center", gap: 8 }}>
        <span className="t-label" style={{ paddingLeft: 2 }}>
          {t("nutrition")}
        </span>
        {nutritionSaved && (
          <span
            style={{
              fontFamily: "K2D, sans-serif",
              fontSize: 11,
              color: "var(--success)",
              transition: "opacity 0.3s",
            }}
          >
            {t("saveSuccess")}
          </span>
        )}
      </div>
      <div className="glass" style={{ margin: "8px 24px", padding: "4px 0" }}>
        {FIELDS.map((field, idx) => (
          <div
            key={field.id}
            style={{
              padding: "12px 18px",
              ...(idx < FIELDS.length - 1 ? { borderBottom: "1px solid var(--glass-line)" } : {}),
            }}
          >
            <label
              htmlFor={`nutrition-${field.id}`}
              style={{
                fontFamily: "K2D, sans-serif",
                fontSize: 12,
                color: "var(--ink-soft)",
                display: "block",
                marginBottom: 6,
              }}
            >
              {field.label}
            </label>
            <div className="glass-input" style={{ height: 44 }}>
              <input
                id={`nutrition-${field.id}`}
                type="number"
                inputMode="numeric"
                min={field.min}
                max={field.max}
                value={field.value}
                onChange={(e) => field.set(Number(e.target.value) as never)}
                onBlur={handleBlur}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
