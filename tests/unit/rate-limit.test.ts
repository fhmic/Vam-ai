import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkRateLimit,
  rateLimitResponse,
  __resetRateLimitStateForTests,
  type RateLimitConfig,
} from "@/lib/api/rate-limit";

/**
 * Stage 6.1 — rate limiting. Uses vitest's fake timers to control
 * `Date.now()` directly rather than real `setTimeout`/sleeps, since the
 * limiter is a fixed-window counter keyed entirely off elapsed wall-clock
 * time.
 */
describe("checkRateLimit", () => {
  const config: RateLimitConfig = { limit: 3, windowMs: 1000 };

  beforeEach(() => {
    __resetRateLimitStateForTests();
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  it("allows requests up to the configured limit", () => {
    const r1 = checkRateLimit("user-a", config);
    const r2 = checkRateLimit("user-a", config);
    const r3 = checkRateLimit("user-a", config);

    expect(r1).toMatchObject({ allowed: true, remaining: 2 });
    expect(r2).toMatchObject({ allowed: true, remaining: 1 });
    expect(r3).toMatchObject({ allowed: true, remaining: 0 });
  });

  it("rejects the request once the limit is exceeded within the window", () => {
    checkRateLimit("user-a", config);
    checkRateLimit("user-a", config);
    checkRateLimit("user-a", config);
    const r4 = checkRateLimit("user-a", config);

    expect(r4.allowed).toBe(false);
    if (!r4.allowed) {
      expect(r4.retryAfterSeconds).toBeGreaterThan(0);
      expect(r4.retryAfterSeconds).toBeLessThanOrEqual(1);
    }
  });

  it("tracks separate keys independently", () => {
    checkRateLimit("user-a", config);
    checkRateLimit("user-a", config);
    checkRateLimit("user-a", config);

    // user-a is now exhausted, but user-b has made zero requests.
    const userA = checkRateLimit("user-a", config);
    const userB = checkRateLimit("user-b", config);

    expect(userA.allowed).toBe(false);
    expect(userB).toMatchObject({ allowed: true, remaining: 2 });
  });

  it("resets the count once the window elapses", () => {
    checkRateLimit("user-a", config);
    checkRateLimit("user-a", config);
    checkRateLimit("user-a", config);
    expect(checkRateLimit("user-a", config).allowed).toBe(false);

    vi.setSystemTime(config.windowMs + 1);

    const afterWindow = checkRateLimit("user-a", config);
    expect(afterWindow).toMatchObject({ allowed: true, remaining: config.limit - 1 });
  });

  it("does not let a different endpoint's config leak into another key's count", () => {
    const chatConfig: RateLimitConfig = { limit: 1, windowMs: 1000 };
    const voiceConfig: RateLimitConfig = { limit: 5, windowMs: 1000 };

    expect(checkRateLimit("chat:user-a", chatConfig).allowed).toBe(true);
    expect(checkRateLimit("chat:user-a", chatConfig).allowed).toBe(false);

    // Same user, different namespaced key -> independent budget.
    expect(checkRateLimit("voice:user-a", voiceConfig).allowed).toBe(true);
  });
});

describe("rateLimitResponse", () => {
  it("returns a 429 with a Retry-After header and the standard error shape", async () => {
    const response = rateLimitResponse({ allowed: false, retryAfterSeconds: 42, resetAt: 42000 });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");

    const body = await response.json();
    expect(body).toEqual({
      error: { code: "RATE_LIMITED", message: expect.any(String) },
    });
  });
});
