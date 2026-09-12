import { describe, it, expect, beforeEach } from "vitest";
import { getOrCreateRequestId, requestIdHeaders, REQUEST_ID_HEADER } from "@/lib/api/request-id";

/**
 * Stage 5 — request correlation helper. Pure function tested without
 * any HTTP / Next coupling.
 */
describe("getOrCreateRequestId", () => {
  it("mints a new v4 uuid when no incoming header is set", () => {
    const request = new Request("https://example.com/x", { headers: {} });
    const id = getOrCreateRequestId(request);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("preserves an incoming valid X-Request-Id unchanged", () => {
    const incoming = "abc-123-correlation-id";
    const request = new Request("https://example.com/x", { headers: { "X-Request-Id": incoming } });
    expect(getOrCreateRequestId(request)).toBe(incoming);
  });

  it("ignores pathologically-long incoming values and mints a new one", () => {
    const tooLong = "x".repeat(1000);
    const request = new Request("https://example.com/x", { headers: { "X-Request-Id": tooLong } });
    const id = getOrCreateRequestId(request);
    expect(id).not.toBe(tooLong);
    expect(id.length).toBeLessThanOrEqual(200);
  });

  it("ignores empty incoming values", () => {
    const request = new Request("https://example.com/x", { headers: { "X-Request-Id": "" } });
    const id = getOrCreateRequestId(request);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("requestIdHeaders", () => {
  it("uses the canonical header name", () => {
    expect(requestIdHeaders("foo")).toEqual({ "x-request-id": "foo" });
  });

  it("matches the constant used by the rest of the codebase", () => {
    const h = requestIdHeaders("x");
    expect(Object.keys(h)[0]).toBe(REQUEST_ID_HEADER);
  });
});
