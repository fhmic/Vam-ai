import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Priority test #6 (Phase 1A Final Production Readiness Audit, Phase 6):
 * verifyAuthenticatedUser authorization enforcement.
 *
 * This is the single choke point every privileged Route Handler goes
 * through before touching the service-role admin client (see
 * src/lib/supabase/auth-guard.ts and ADR-002). Mocks
 * @/lib/supabase/server so the RLS-scoped query chain
 * (.from("profiles").select("deleted_at").eq("id", ...).single()) can be
 * controlled per-test without a live Supabase project.
 */
const getUserMock = vi.fn();
const singleMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: singleMock,
        }),
      }),
    }),
  }),
}));

import { verifyAuthenticatedUser } from "@/lib/supabase/auth-guard";

describe("verifyAuthenticatedUser", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    singleMock.mockReset();
  });

  it("rejects with 401 when there is no session", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    const result = await verifyAuthenticatedUser();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
    // Must never reach the profile lookup without a user.
    expect(singleMock).not.toHaveBeenCalled();
  });

  it("rejects with 401 when Supabase returns an auth error", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: new Error("boom") });

    const result = await verifyAuthenticatedUser();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("rejects a soft-deleted user even with an otherwise-valid session", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    singleMock.mockResolvedValue({
      data: { deleted_at: "2026-01-01T00:00:00.000Z" },
      error: null,
    });

    const result = await verifyAuthenticatedUser();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("accepts an authenticated, non-deleted user", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    singleMock.mockResolvedValue({ data: { deleted_at: null }, error: null });

    const result = await verifyAuthenticatedUser();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user.id).toBe("user-1");
    }
  });
});
