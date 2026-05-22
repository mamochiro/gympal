import type { messagingApi } from "@line/bot-sdk";

export type ReminderLocale = "th" | "en";

const COPY: Record<
  ReminderLocale,
  {
    kicker: string;
    title: string;
    body: string;
    cta: string;
    alt: string;
  }
> = {
  th: {
    kicker: "TIME TO TRAIN",
    title: "ถึงเวลาออกกำลังกาย",
    body: "หนึ่งเซ็ตก็มีค่า — เริ่มจากท่าที่ชอบที่สุด แล้วบันทึกใน 3 วินาที",
    cta: "เริ่มออกกำลังกาย",
    alt: "ถึงเวลาออกกำลังกายแล้ว!",
  },
  en: {
    kicker: "TIME TO TRAIN",
    title: "Your move",
    body: "Even one set counts. Start with your favorite lift and log it in 3 seconds.",
    cta: "Log workout",
    alt: "Time to train",
  },
};

/**
 * Build a LINE Flex Message for the daily training reminder.
 *
 * Plain motivational nudge — no contextual data beyond locale and the
 * web-app deep link. Mirrors 19.1's structure (header / body / footer button).
 */
export function buildDailyReminderFlex(
  locale: ReminderLocale,
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
