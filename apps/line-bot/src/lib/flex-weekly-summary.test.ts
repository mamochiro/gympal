import { describe, expect, it } from "vitest";
import { buildWeeklySummaryFlex } from "./flex-weekly-summary";

const baseInput = {
  workoutCount: 5,
  totalVolumeKg: 12500,
  streakDays: 7,
  lastWeekVolumeKg: 10000,
};

const URL = "https://saifit.app/progress";

describe("buildWeeklySummaryFlex", () => {
  it("produces a Flex message with bubble container", () => {
    const msg = buildWeeklySummaryFlex(baseInput, "th", URL);
    expect(msg.type).toBe("flex");
    expect(msg.contents.type).toBe("bubble");
    expect(msg.altText).toBeTruthy();
  });

  it("renders +25% comparison in green for a positive delta (TH)", () => {
    const msg = buildWeeklySummaryFlex(baseInput, "th", URL);
    // 12500 vs 10000 = +25%
    const bubble = msg.contents as { body: { contents: { text: string; color: string }[] } };
    const comparison = bubble.body.contents.find(
      (c) => "text" in c && typeof c.text === "string" && c.text.includes("25"),
    );
    expect(comparison).toBeDefined();
    expect(comparison?.text).toMatch(/\+25%/);
    expect(comparison?.color).toBe("#22C55E");
  });

  it("renders negative delta in amber (EN)", () => {
    const msg = buildWeeklySummaryFlex(
      { ...baseInput, totalVolumeKg: 8000, lastWeekVolumeKg: 10000 },
      "en",
      URL,
    );
    const bubble = msg.contents as { body: { contents: { text?: string; color?: string }[] } };
    const comparison = bubble.body.contents.find(
      (c) => typeof c.text === "string" && c.text.includes("vs last week"),
    );
    expect(comparison?.text).toMatch(/-20%/);
    expect(comparison?.color).toBe("#F59E0B");
  });

  it("uses first-week copy + neutral color when lastWeekVolumeKg is 0", () => {
    const msg = buildWeeklySummaryFlex({ ...baseInput, lastWeekVolumeKg: 0 }, "th", URL);
    const bubble = msg.contents as { body: { contents: { text?: string; color?: string }[] } };
    const comparison = bubble.body.contents.find(
      (c) => typeof c.text === "string" && c.text.includes("สัปดาห์แรก"),
    );
    expect(comparison).toBeDefined();
    expect(comparison?.color).toBe("#A0A0B8");
  });

  it("formats volume with thousands separators", () => {
    const msg = buildWeeklySummaryFlex(baseInput, "th", URL);
    expect(msg.altText).toContain("12,500");
  });

  it("uses Thai locale strings when locale = th", () => {
    const msg = buildWeeklySummaryFlex(baseInput, "th", URL);
    const flat = JSON.stringify(msg);
    expect(flat).toContain("ออกกำลังกาย");
    expect(flat).toContain("ปริมาณรวม");
  });

  it("uses English locale strings when locale = en", () => {
    const msg = buildWeeklySummaryFlex(baseInput, "en", URL);
    const flat = JSON.stringify(msg);
    expect(flat).toContain("Workouts");
    expect(flat).toContain("Total volume");
  });

  it("CTA button uri matches webAppUrl argument", () => {
    const msg = buildWeeklySummaryFlex(baseInput, "en", URL);
    const bubble = msg.contents as {
      footer: { contents: { action: { type: string; uri: string } }[] };
    };
    expect(bubble.footer.contents[0]?.action.uri).toBe(URL);
    expect(bubble.footer.contents[0]?.action.type).toBe("uri");
  });
});
