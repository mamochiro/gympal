/**
 * Tests for requireUser — the single auth + app-user lookup helper that
 * replaces ~6 lines of boilerplate across 29 API routes.
 *
 * Contract:
 *   - Returns NextResponse (401) when no session.
 *   - Returns NextResponse (404) when session exists but no users row maps
 *     to session.user.id via betterAuthId.
 *   - Returns { session, user } on success.
 *
 * Callers narrow via `instanceof NextResponse`.
 */
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const findFirstMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@saifit/db", () => ({
  getDb: () => ({
    query: {
      users: {
        findFirst: findFirstMock,
      },
    },
  }),
  users: { betterAuthId: "users.betterAuthId" },
}));

const { requireUser } = await import("@/lib/auth-helpers");

function req(): NextRequest {
  return new NextRequest("http://localhost/api/anything", {
    headers: { "Content-Type": "application/json" },
  });
}

describe("requireUser", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    findFirstMock.mockReset();
  });

  it("should return NextResponse 401 when no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await requireUser(req());

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("should return NextResponse 404 when session exists but app user row is missing", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "ba_123" } });
    findFirstMock.mockResolvedValueOnce(undefined);

    const result = await requireUser(req());

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(404);
    expect(findFirstMock).toHaveBeenCalledTimes(1);
  });

  it("should return { session, user } when authenticated and user row exists", async () => {
    const session = { user: { id: "ba_123", email: "dev@saifit.local" } };
    const user = { id: "user_abc", betterAuthId: "ba_123", displayName: "Dev" };
    getSessionMock.mockResolvedValueOnce(session);
    findFirstMock.mockResolvedValueOnce(user);

    const result = await requireUser(req());

    expect(result).not.toBeInstanceOf(NextResponse);
    if (result instanceof NextResponse) throw new Error("unreachable");
    expect(result.session).toEqual(session);
    expect(result.user).toEqual(user);
  });

  it("should look up users via betterAuthId from the session", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "ba_xyz" } });
    findFirstMock.mockResolvedValueOnce({ id: "u1", betterAuthId: "ba_xyz" });

    await requireUser(req());

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.anything(),
      }),
    );
  });
});
