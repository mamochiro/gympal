"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useTranslations } from "next-intl";

export function AuthExpiredBanner() {
  const expired = useAuthStore((s) => s.expired);
  const t = useTranslations("workout");
  if (!expired) return null;
  return (
    <div
      role="alert"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        margin: "0 24px",
        padding: "12px 16px",
        borderRadius: 14,
        background: "rgba(255,170,60,0.12)",
        border: "1px solid rgba(255,170,60,0.4)",
        boxShadow: "0 0 18px rgba(255,170,60,0.18)",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span style={{ fontFamily: "K2D, sans-serif", fontSize: 13, color: "var(--ink)", flex: 1 }}>
        {t("authExpiredMessage")}
      </span>
      <a
        href="/sign-in"
        target="_blank"
        rel="noreferrer noopener"
        style={{
          fontFamily: "K2D, sans-serif",
          fontWeight: 600,
          fontSize: 12,
          color: "var(--violet-bright)",
          textDecoration: "none",
          padding: "6px 12px",
          borderRadius: 999,
          border: "1px solid var(--violet-edge)",
          background: "rgba(140,100,255,0.1)",
          minHeight: 32,
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        {t("authExpiredCta")}
      </a>
    </div>
  );
}
