"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushNotificationsSection() {
  const t = useTranslations("settings");
  const [pushStatus, setPushStatus] = useState<"idle" | "subscribed" | "denied" | "unsupported">(
    "idle",
  );
  const [pushLoading, setPushLoading] = useState(false);
  const [pushTestSent, setPushTestSent] = useState(false);

  useEffect(() => {
    if (!("PushManager" in window) || !("serviceWorker" in navigator)) {
      setPushStatus("unsupported");
      return;
    }
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setPushStatus(sub ? "subscribed" : "idle");
      });
    });
  }, []);

  async function handleSubscribe() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setPushStatus("denied");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });
      const { endpoint, keys: subKeys } = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, p256dh: subKeys.p256dh, auth: subKeys.auth }),
      });
      setPushStatus("subscribed");
    } finally {
      setPushLoading(false);
    }
  }

  async function handleUnsubscribe() {
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushStatus("idle");
    } finally {
      setPushLoading(false);
    }
  }

  async function handleSendTest() {
    setPushLoading(true);
    try {
      await fetch("/api/push/send-test", { method: "POST" });
      setPushTestSent(true);
      setTimeout(() => setPushTestSent(false), 3000);
    } finally {
      setPushLoading(false);
    }
  }

  if (pushStatus === "unsupported") return null;

  return (
    <>
      <div style={{ margin: "20px 24px 6px" }}>
        <span className="t-label" style={{ paddingLeft: 2 }}>
          {t("pushNotifications")}
        </span>
      </div>
      <div className="glass" style={{ margin: "8px 24px", padding: "4px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 18px",
            minHeight: 56,
            borderBottom: pushStatus === "subscribed" ? "1px solid var(--glass-line)" : "none",
          }}
        >
          <div>
            <span style={{ fontFamily: "K2D, sans-serif", fontSize: 14, color: "var(--ink)" }}>
              {t("pushLabel")}
            </span>
            {pushStatus === "denied" && (
              <p
                style={{
                  fontFamily: "K2D, sans-serif",
                  fontSize: 11,
                  color: "var(--danger)",
                  marginTop: 2,
                  lineHeight: "var(--leading-relaxed)",
                }}
              >
                {t("pushDenied")}
              </p>
            )}
          </div>
          {pushStatus === "subscribed" ? (
            <button
              type="button"
              className="btn-glass"
              style={{ height: 36, padding: "0 14px", fontSize: 12 }}
              disabled={pushLoading}
              onClick={handleUnsubscribe}
            >
              {t("pushOff")}
            </button>
          ) : (
            <button
              type="button"
              className="btn-glass"
              style={{
                height: 36,
                padding: "0 14px",
                fontSize: 12,
                background: "rgba(140,100,255,0.12)",
                borderColor: "var(--violet-edge)",
              }}
              disabled={pushLoading || pushStatus === "denied"}
              onClick={handleSubscribe}
            >
              {pushLoading ? "..." : t("pushOn")}
            </button>
          )}
        </div>
        {pushStatus === "subscribed" && (
          <div style={{ padding: "12px 18px" }}>
            <button
              type="button"
              className="btn-glass"
              style={{ width: "100%", fontSize: 13 }}
              disabled={pushLoading || pushTestSent}
              onClick={handleSendTest}
            >
              {pushTestSent ? t("pushTestSent") : t("pushTest")}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
