import { describe, expect, it } from "vitest";
import { buildStreakWarningFlex } from "./flex-streak-warning";

const URL = "https://saifit.app/";

describe("buildStreakWarningFlex", () => {
  it("returns a Flex bubble with amber header background", () => {
    const msg = buildStreakWarningFlex(7, "th", URL);
    expect(msg.type).toBe("flex");
    const bubble = msg.contents as { header: { backgroundColor: string } };
    expect(bubble.header.backgroundColor).toBe("#2A1B10");
  });

  it("embeds the streakDays number in title and altText (TH)", () => {
    const msg = buildStreakWarningFlex(12, "th", URL);
    const flat = JSON.stringify(msg);
    expect(flat).toContain("12");
    expect(msg.altText).toContain("12");
  });

  it("uses English locale strings when locale = en", () => {
    const msg = buildStreakWarningFlex(3, "en", URL);
    const flat = JSON.stringify(msg);
    expect(flat).toContain("3-day streak fading");
    expect(flat).toContain("Log a set");
    expect(flat).toContain("before midnight");
  });

  it("handles streakDays = 1 (singular edge)", () => {
    const msg = buildStreakWarningFlex(1, "en", URL);
    const flat = JSON.stringify(msg);
    // English copy says "1-day streak fading" — acceptable; not English-grammatical
    // perfection but consistent shape, fits the chip rendering
    expect(flat).toContain("1-day");
  });

  it("handles a large streak (30) without truncation", () => {
    const msg = buildStreakWarningFlex(30, "th", URL);
    const flat = JSON.stringify(msg);
    expect(flat).toContain("30");
  });

  it("CTA button uri matches webAppUrl argument", () => {
    const msg = buildStreakWarningFlex(7, "en", URL);
    const bubble = msg.contents as {
      footer: { contents: { action: { uri: string } }[] };
    };
    expect(bubble.footer.contents[0]?.action.uri).toBe(URL);
  });

  it("CTA button uses amber primary color", () => {
    const msg = buildStreakWarningFlex(7, "th", URL);
    const bubble = msg.contents as {
      footer: { contents: { color?: string }[] };
    };
    expect(bubble.footer.contents[0]?.color).toBe("#F59E0B");
  });
});
