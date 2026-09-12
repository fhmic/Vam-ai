import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { hasValidCronSecret } from "@/lib/api/cron-auth";

/**
 * Stage 5 — internal-route authentication. We test the four failure
 * modes and the one success mode directly against the env var; no
 * mocking needed because the helper is a pure function of
 * (request, process.env).
 */
describe("hasValidCronSecret", () => {
  const ORIGINAL_ENV = process.env.INTERNAL_CRON_SECRET;

  beforeEach(() => {
    delete process.env.INTERNAL_CRON_SECRET;
  });

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) delete process.env.INTERNAL_CRON_SECRET;
    else process.env.INTERNAL_CRON_SECRET = ORIGINAL_ENV;
  });

  it("returns false when INTERNAL_CRON_SECRET is not set", () => {
    const request = new Request("https://example.com", { headers: { authorization: "Bearer something" } });
    expect(hasValidCronSecret(request)).toBe(false);
  });

  it("returns false when the Authorization header is missing", () => {
    process.env.INTERNAL_CRON_SECRET = "abc";
    const request = new Request("https://example.com");
    expect(hasValidCronSecret(request)).toBe(false);
  });

  it("returns false when the bearer token does not match", () => {
    process.env.INTERNAL_CRON_SECRET = "abc";
    const request = new Request("https://example.com", { headers: { authorization: "Bearer wrong" } });
    expect(hasValidCronSecret(request)).toBe(false);
  });

  it("returns false when the bearer token is the wrong length (timingSafeEqual would throw)", () => {
    process.env.INTERNAL_CRON_SECRET = "abc";
    const request = new Request("https://example.com", { headers: { authorization: "Bearer abcd" } });
    expect(hasValidCronSecret(request)).toBe(false);
  });

  it("returns true on an exact case-insensitive Bearer match", () => {
    process.env.INTERNAL_CRON_SECRET = "abc";
    const request1 = new Request("https://example.com", { headers: { authorization: "Bearer abc" } });
    const request2 = new Request("https://example.com", { headers: { authorization: "bearer abc" } });
    const request3 = new Request("https://example.com", { headers: { authorization: "BEARER abc" } });
    expect(hasValidCronSecret(request1)).toBe(true);
    expect(hasValidCronSecret(request2)).toBe(true);
    expect(hasValidCronSecret(request3)).toBe(true);
  });
});
