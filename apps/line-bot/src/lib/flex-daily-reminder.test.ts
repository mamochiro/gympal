import { describe, expect, it } from "vitest";
import { buildDailyReminderFlex } from "./flex-daily-reminder";

const URL = "https://saifit.app/";

describe("buildDailyReminderFlex", () => {
  it("returns a Flex bubble with header / body / footer", () => {
    const msg = buildDailyReminderFlex("th", URL);
    expect(msg.type).toBe("flex");
    const c = msg.contents as { type: string; header?: unknown; body?: unknown; footer?: unknown };
    expect(c.type).toBe("bubble");
    expect(c.header).toBeDefined();
    expect(c.body).toBeDefined();
    expect(c.footer).toBeDefined();
  });

  it("uses Thai locale strings when locale = th", () => {
    const msg = buildDailyReminderFlex("th", URL);
    const flat = JSON.stringify(msg);
    expect(flat).toContain("ถึงเวลาออกกำลังกาย");
    expect(flat).toContain("เริ่มออกกำลังกาย");
  });

  it("uses English locale strings when locale = en", () => {
    const msg = buildDailyReminderFlex("en", URL);
    const flat = JSON.stringify(msg);
    expect(flat).toContain("Your move");
    expect(flat).toContain("Log workout");
  });

  it("CTA button uri matches webAppUrl argument", () => {
    const msg = buildDailyReminderFlex("en", URL);
    const bubble = msg.contents as {
      footer: { contents: { action: { type: string; uri: string } }[] };
    };
    expect(bubble.footer.contents[0]?.action.uri).toBe(URL);
    expect(bubble.footer.contents[0]?.action.type).toBe("uri");
  });

  it("includes a non-empty altText for fallback clients", () => {
    const msgTh = buildDailyReminderFlex("th", URL);
    const msgEn = buildDailyReminderFlex("en", URL);
    expect(msgTh.altText.length).toBeGreaterThan(0);
    expect(msgEn.altText.length).toBeGreaterThan(0);
  });
});
