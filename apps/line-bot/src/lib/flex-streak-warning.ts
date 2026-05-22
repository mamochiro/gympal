import type { messagingApi } from "@line/bot-sdk";

export type StreakLocale = "th" | "en";

const COPY: Record<
  StreakLocale,
  {
    kicker: string;
    titleAtRisk: (n: number) => string;
    body: string;
    deadline: string;
    cta: string;
    alt: (n: number) => string;
  }
> = {
  th: {
    kicker: "STREAK AT RISK",
    titleAtRisk: (n) => `🔥 Streak ${n} วันใกล้หาย`,
    body: "บันทึกสักเซ็ตหนึ่งก็พอ สตรีคจะอยู่ต่อ",
    deadline: "ก่อนเที่ยงคืน",
    cta: "บันทึกเซ็ต",
    alt: (n) => `Streak ${n} วันใกล้หายแล้ว — บันทึกเซ็ตก่อนเที่ยงคืน`,
  },
  en: {
    kicker: "STREAK AT RISK",
    titleAtRisk: (n) => `🔥 ${n}-day streak fading`,
    body: "Log one set and the streak stays alive.",
    deadline: "before midnight",
    cta: "Log a set",
    alt: (n) => `${n}-day streak fading — log a set before midnight`,
  },
};

/**
 * Build a LINE Flex Message for the streak-at-risk warning.
 *
 * Urgency-styled (amber accent) bubble. Header announces the at-risk
 * streak, body reassures it only takes one set, footer CTA links to
 * the web app. Mirrors 19.1's structural shape.
 */
export function buildStreakWarningFlex(
  streakDays: number,
  locale: StreakLocale,
  webAppUrl: string,
): messagingApi.FlexMessage {
  const copy = COPY[locale];

  return {
    type: "flex",
    altText: copy.alt(streakDays),
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#2A1B10",
        paddingAll: "20px",
        contents: [
          { type: "text", text: copy.kicker, color: "#F59E0B", weight: "bold", size: "xs" },
          {
            type: "text",
            text: copy.titleAtRisk(streakDays),
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
        spacing: "sm",
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
          {
            type: "text",
            text: `⏰ ${copy.deadline}`,
            color: "#F59E0B",
            size: "sm",
            weight: "bold",
            margin: "md",
            align: "center",
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
            color: "#F59E0B",
            height: "sm",
            action: { type: "uri", label: copy.cta, uri: webAppUrl },
          },
        ],
      },
    },
  };
}
