import type { messagingApi } from "@line/bot-sdk";

export type CheckInLocale = "th" | "en";

const COPY: Record<
  CheckInLocale,
  {
    kicker: string;
    title: string;
    body: string;
    cta: string;
    alt: string;
  }
> = {
  th: {
    kicker: "CHECK-IN",
    title: "วันนี้ยังไม่ได้บันทึก",
    body: "บันทึกสักเซ็ตก็ยังดี — ความสม่ำเสมอชนะทุกอย่าง",
    cta: "บันทึกเซ็ตเดียว",
    alt: "ยังไม่ได้บันทึกการออกกำลังกายวันนี้",
  },
  en: {
    kicker: "CHECK-IN",
    title: "Haven't logged today",
    body: "No workout yet today. Even one set counts — consistency beats intensity.",
    cta: "Log one set",
    alt: "Check-in reminder",
  },
};

/**
 * Build a LINE Flex Message for the end-of-day check-in (sent to users with
 * no workout logged today). Mirrors 21.1's daily-reminder shape — header
 * (kicker + title) / body / footer button.
 */
export function buildCheckInFlex(
  locale: CheckInLocale,
  webAppUrl: string,
): messagingApi.FlexMessage {
  const copy = COPY[locale];

  return {
    type: "flex",
    altText: copy.alt,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#1A1730",
        paddingAll: "20px",
        contents: [
          { type: "text", text: copy.kicker, color: "#7A6DD6", weight: "bold", size: "xs" },
          {
            type: "text",
            text: copy.title,
            color: "#FFFFFF",
            weight: "bold",
            size: "xl",
            margin: "sm",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: copy.body,
            color: "#C8C8DC",
            size: "sm",
            wrap: true,
            lineSpacing: "4px",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#785AFF",
            height: "sm",
            action: { type: "uri", label: copy.cta, uri: webAppUrl },
          },
        ],
      },
    },
  };
}
