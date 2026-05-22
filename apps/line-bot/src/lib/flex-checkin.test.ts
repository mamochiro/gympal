import { describe, expect, it } from "vitest";
import { buildCheckInFlex } from "./flex-checkin";

const URL = "https://saifit.app/";

describe("buildCheckInFlex", () => {
  it("returns a Flex bubble with header / body / footer", () => {
    const msg = buildCheckInFlex("th", URL);
    expect(msg.type).toBe("flex");
    const c = msg.contents as { type: string; header?: unknown; body?: unknown; footer?: unknown };
    expect(c.type).toBe("bubble");
    expect(c.header).toBeDefined();
    expect(c.body).toBeDefined();
    expect(c.footer).toBeDefined();
  });

  it("uses Thai locale strings when locale = th", () => {
    const msg = buildCheckInFlex("th", URL);
    const flat = JSON.stringify(msg);
    expect(flat).toContain("ยังไม่ได้บันทึก");
    expect(flat).toContain("บันทึกสักเซ็ต");
  });

  it("uses English locale strings when locale = en", () => {
    const msg = buildCheckInFlex("en", URL);
    const flat = JSON.stringify(msg);
    expect(flat).toContain("No workout yet");
    expect(flat).toContain("Log one set");
  });

  it("CTA button uri matches webAppUrl argument", () => {
    const msg = buildCheckInFlex("en", URL);
    const bubble = msg.contents as {
      footer: { contents: { action: { type: string; uri: string } }[] };
    };
    expect(bubble.footer.contents[0]?.action.uri).toBe(URL);
    expect(bubble.footer.contents[0]?.action.type).toBe("uri");
  });

  it("includes a non-empty altText for fallback clients", () => {
    const msgTh = buildCheckInFlex("th", URL);
    const msgEn = buildCheckInFlex("en", URL);
    expect(msgTh.altText.length).toBeGreaterThan(0);
    expect(msgEn.altText.length).toBeGreaterThan(0);
  });
});
