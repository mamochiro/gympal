import type { messagingApi } from "@line/bot-sdk";

export interface WeeklySummaryInput {
  workoutCount: number;
  totalVolumeKg: number;
  streakDays: number;
  /** Most recent prior 7-day window's volume. 0 = no prior week (treat as first week). */
  lastWeekVolumeKg: number;
}

export type SummaryLocale = "th" | "en";

const COPY: Record<
  SummaryLocale,
  {
    kicker: string;
    title: string;
    workouts: string;
    volume: string;
    streak: string;
    workoutsUnit: string;
    streakUnit: string;
    weightUnit: string;
    firstWeek: string;
    positiveDelta: (pct: number) => string;
    negativeDelta: (pct: number) => string;
    cta: string;
    alt: (count: number, volume: string) => string;
  }
> = {
  th: {
    kicker: "WEEKLY",
    title: "สรุปสัปดาห์นี้",
    workouts: "ออกกำลังกาย",
    volume: "ปริมาณรวม",
    streak: "Streak",
    workoutsUnit: "ครั้ง",
    streakUnit: "วัน",
    weightUnit: "กก.",
    firstWeek: "🌱 สัปดาห์แรกของคุณ!",
    positiveDelta: (pct) => `📈 +${pct}% จากสัปดาห์ที่แล้ว`,
    negativeDelta: (pct) => `📉 ${pct}% จากสัปดาห์ที่แล้ว`,
    cta: "ดูสรุปทั้งหมด",
    alt: (count, volume) => `สรุปสัปดาห์นี้: ${count} ครั้ง, ${volume} กก.`,
  },
  en: {
    kicker: "WEEKLY",
    title: "This Week",
    workouts: "Workouts",
    volume: "Total volume",
    streak: "Streak",
    workoutsUnit: "",
    streakUnit: "days",
    weightUnit: "kg",
    firstWeek: "🌱 Your first week!",
    positiveDelta: (pct) => `📈 +${pct}% vs last week`,
    negativeDelta: (pct) => `📉 ${pct}% vs last week`,
    cta: "View full summary",
    alt: (count, volume) => `This week: ${count} workouts, ${volume} kg`,
  },
};

function formatVolume(kg: number): string {
  return Math.round(kg).toLocaleString("en-US");
}

function statRow(label: string, value: string): messagingApi.FlexBox {
  return {
    type: "box",
    layout: "horizontal",
    contents: [
      { type: "text", text: label, color: "#A0A0B8", size: "sm", flex: 4 },
      {
        type: "text",
        text: value,
        color: "#FFFFFF",
        size: "sm",
        weight: "bold",
        align: "end",
        flex: 3,
      },
    ],
  };
}

/**
 * Build a LINE Flex Message for the weekly workout summary.
 *
 * Caller guarantees `workoutCount > 0` (skipped upstream when 0). The bubble
 * shows: header + 3 stat rows + comparison line + CTA button. Falls back to
 * `altText` for clients that don't render Flex.
 */
export function buildWeeklySummaryFlex(
  input: WeeklySummaryInput,
  locale: SummaryLocale,
  webAppUrl: string,
): messagingApi.FlexMessage {
  const copy = COPY[locale];
  const volumeStr = formatVolume(input.totalVolumeKg);

  const comparison =
    input.lastWeekVolumeKg === 0
      ? copy.firstWeek
      : (() => {
          const pct = Math.round(
            ((input.totalVolumeKg - input.lastWeekVolumeKg) / input.lastWeekVolumeKg) * 100,
          );
          return pct >= 0 ? copy.positiveDelta(pct) : copy.negativeDelta(pct);
        })();

  const comparisonColor =
    input.lastWeekVolumeKg === 0
      ? "#A0A0B8"
      : input.totalVolumeKg >= input.lastWeekVolumeKg
        ? "#22C55E"
        : "#F59E0B";

  const workoutsValue =
    locale === "th" ? `${input.workoutCount} ${copy.workoutsUnit}` : `${input.workoutCount}`;

  return {
    type: "flex",
    altText: copy.alt(input.workoutCount, volumeStr),
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
        spacing: "md",
        paddingAll: "20px",
        contents: [
          statRow(copy.workouts, workoutsValue),
          statRow(copy.volume, `${volumeStr} ${copy.weightUnit}`),
          statRow(copy.streak, `🔥 ${input.streakDays} ${copy.streakUnit}`),
          { type: "separator", margin: "md", color: "#33334A" },
          {
            type: "text",
            text: comparison,
            color: comparisonColor,
            size: "sm",
            margin: "md",
            align: "center",
            weight: "bold",
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
