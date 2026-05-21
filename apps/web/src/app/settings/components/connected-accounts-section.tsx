"use client";

import { signIn } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { ConnectedAccount } from "./settings-types";

export function ConnectedAccountsSection() {
  const t = useTranslations("settings");
  const { data: accounts, isLoading } = useQuery<ConnectedAccount[]>({
    queryKey: ["auth-accounts"],
    queryFn: () => fetch("/api/auth/list-accounts").then((r) => r.json()),
    staleTime: 30_000,
  });

  const isConnected = (provider: string) =>
    accounts?.some((a) => (a.provider ?? a.providerId) === provider) ?? false;

  return (
    <>
      <div style={{ margin: "20px 24px 6px" }}>
        <span className="t-label" style={{ paddingLeft: 2 }}>
          {t("accounts")}
        </span>
      </div>
      <div className="glass" style={{ margin: "8px 24px" }}>
        {isLoading ? (
          <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
            {(["line-sk", "google-sk"] as const).map((k) => (
              <div
                key={k}
                style={{
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : (
          [
            { provider: "line", label: "LINE" },
            { provider: "google", label: "Google" },
          ].map((acct, idx, arr) => {
            const connected = isConnected(acct.provider);
            return (
              <div
                key={acct.provider}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 18px",
                  minHeight: 56,
                  ...(idx < arr.length - 1 ? { borderBottom: "1px solid var(--glass-line)" } : {}),
                }}
              >
                <span style={{ fontFamily: "K2D, sans-serif", fontSize: 14, color: "var(--ink)" }}>
                  {acct.label}
                </span>
                {connected ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: acct.provider === "line" ? "#00B900" : "var(--success)",
                        boxShadow:
                          acct.provider === "line" ? "0 0 8px #00B900" : "0 0 8px var(--success)",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "K2D, sans-serif",
                        fontSize: 12,
                        color: "var(--ink-soft)",
                      }}
                    >
                      {t("accountConnected")}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-glass"
                    style={{ height: 36, padding: "0 16px", fontSize: 13 }}
                    onClick={() =>
                      signIn.social({
                        provider: acct.provider as "line" | "google",
                        callbackURL: "/settings",
                      })
                    }
                  >
                    {t("accountConnect")}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
