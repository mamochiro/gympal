import { useAuthStore } from "@/stores/auth-store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "../api-fetch";

describe("apiFetch", () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("flips authExpired=true on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );
    await apiFetch("/api/anything");
    expect(useAuthStore.getState().expired).toBe(true);
  });

  it("clears authExpired on the next 2xx", async () => {
    useAuthStore.getState().setExpired(true);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('{"ok":true}', { status: 200 })),
    );
    await apiFetch("/api/anything");
    expect(useAuthStore.getState().expired).toBe(false);
  });

  it("does not clear authExpired on non-2xx non-401 responses", async () => {
    useAuthStore.getState().setExpired(true);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 })),
    );
    await apiFetch("/api/anything");
    expect(useAuthStore.getState().expired).toBe(true);
  });

  it("does not set authExpired on first 2xx when flag was already false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('{"ok":true}', { status: 200 })),
    );
    await apiFetch("/api/anything");
    expect(useAuthStore.getState().expired).toBe(false);
  });
});
