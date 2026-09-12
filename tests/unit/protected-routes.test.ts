import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse, NextRequest } from "next/server";

/**
 * Priority test #5 (Protected route behavior). Mocks
 * @/lib/supabase/middleware (the actual Supabase session refresh, which
 * needs a real network round trip) so the middleware's *routing logic*
 * — the part with all the actual bugs waiting to happen — can be tested
 * without a live Supabase project: unauthenticated redirect, auth-route
 * redirect-away-when-signed-in, onboarding gate, and legal re-acceptance
 * gate (Change #1).
 */
const updateSessionMock = vi.fn();

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: (...args: unknown[]) => updateSessionMock(...args),
}));

function makeRequest(pathname: string, cookies: Record<string, string> = {}) {
  const request = new NextRequest(new URL(pathname, "https://example.com"));
  for (const [name, value] of Object.entries(cookies)) {
    request.cookies.set(name, value);
  }
  return request;
}

function mockSession(user: { id: string } | null, softDeleted = false) {
  updateSessionMock.mockResolvedValue({
    supabaseResponse: NextResponse.next(),
    user,
    softDeleted,
  });
}

describe("middleware route protection", () => {
  beforeEach(() => {
    vi.resetModules();
    updateSessionMock.mockReset();
  });

  it("redirects an unauthenticated user away from a protected route", async () => {
    mockSession(null);
    const { middleware } = await import("../../middleware");

    const response = await middleware(makeRequest("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/sign-in");
  });

  it("lets an unauthenticated user reach a public legal route", async () => {
    mockSession(null);
    const { middleware } = await import("../../middleware");

    const response = await middleware(makeRequest("/legal/terms"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects a signed-in user away from /sign-in", async () => {
    mockSession({ id: "user-1" });
    const { middleware } = await import("../../middleware");

    const response = await middleware(
      makeRequest("/sign-in", { va_onboarding_done: "1", va_legal_current: "1" }),
    );

    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("forces onboarding for a signed-in user without the onboarding cookie", async () => {
    mockSession({ id: "user-1" });
    const { middleware } = await import("../../middleware");

    const response = await middleware(makeRequest("/dashboard"));

    expect(response.headers.get("location")).toContain("/onboarding");
  });

  it("forces legal re-acceptance for an onboarded user missing the legal cookie", async () => {
    mockSession({ id: "user-1" });
    const { middleware } = await import("../../middleware");

    const response = await middleware(makeRequest("/dashboard", { va_onboarding_done: "1" }));

    expect(response.headers.get("location")).toContain("/legal/re-accept");
  });

  it("passes through a fully-cleared signed-in user", async () => {
    mockSession({ id: "user-1" });
    const { middleware } = await import("../../middleware");

    const response = await middleware(
      makeRequest("/dashboard", { va_onboarding_done: "1", va_legal_current: "1" }),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects a soft-deleted user to /account/restore from a protected route", async () => {
    mockSession({ id: "user-1" }, true);
    const { middleware } = await import("../../middleware");

    const response = await middleware(
      makeRequest("/dashboard", { va_onboarding_done: "1", va_legal_current: "1" }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/account/restore");
  });

  it("redirects a soft-deleted user to /account/restore even from /onboarding", async () => {
    // Soft-delete check must precede onboarding/legal gates; otherwise a
    // soft-deleted user would get bounced to /onboarding which would
    // either error or let them re-complete onboarding and silently
    // recover their account.
    mockSession({ id: "user-1" }, true);
    const { middleware } = await import("../../middleware");

    const response = await middleware(makeRequest("/onboarding"));

    expect(response.headers.get("location")).toContain("/account/restore");
  });

  it("lets a soft-deleted user reach /account/restore itself", async () => {
    mockSession({ id: "user-1" }, true);
    const { middleware } = await import("../../middleware");

    const response = await middleware(makeRequest("/account/restore"));

    expect(response.headers.get("location")).toBeNull();
  });
});
