"use client";

import { signOut } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DataExportSection() {
  const t = useTranslations("settings");
  const router = useRouter();

  const [exporting, setExporting] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/me/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "saifit-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch("/api/me", { method: "DELETE" });
      await signOut();
      router.push("/sign-in");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  return (
    <>
      <div style={{ margin: "20px 24px 6px" }}>
        <span className="t-label" style={{ paddingLeft: 2 }}>
          {t("data")}
        </span>
      </div>
      <div className="glass" style={{ margin: "8px 24px", padding: "4px 0" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--glass-line)" }}>
          <button
            type="button"
            className="btn-glass"
            style={{ width: "100%" }}
            disabled={exporting}
            onClick={handleExport}
          >
            {exporting ? t("exporting") : t("exportData")}
          </button>
        </div>
        <div style={{ padding: "12px 18px" }}>
          {!deleteConfirming ? (
            <button
              type="button"
              className="btn-glass"
              style={{ width: "100%", color: "var(--danger)", borderColor: "var(--danger)" }}
              onClick={() => setDeleteConfirming(true)}
            >
              {t("deleteAccount")}
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p
                style={{
                  fontFamily: "K2D, sans-serif",
                  fontSize: 14,
                  color: "var(--ink)",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                {t("deleteConfirmMsg")}
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="btn-glass"
                  style={{ flex: 1, color: "var(--ink-soft)" }}
                  onClick={() => setDeleteConfirming(false)}
                  disabled={deleting}
                >
                  {t("deleteConfirmNo")}
                </button>
                <button
                  type="button"
                  className="btn-glass"
                  style={{ flex: 1, color: "var(--danger)", borderColor: "var(--danger)" }}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? t("deleting") : t("deleteConfirmYes")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "28px 24px 0" }}>
        <button
          type="button"
          onClick={handleSignOut}
          className="btn-glass"
          style={{ width: "100%" }}
        >
          {t("signOut")}
        </button>
      </div>
    </>
  );
}
