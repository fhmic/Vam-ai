import { describe, expect, it, vi } from "vitest";
import { handleAuthCallback } from "@/lib/supabase/auth-callback";

describe("handleAuthCallback", () => {
  it("exchanges a standard auth code for a session", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const setSession = vi.fn();

    const result = await handleAuthCallback({
      searchParams: new URLSearchParams("code=abc123"),
      exchangeCodeForSession,
      setSession,
    });

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(setSession).not.toHaveBeenCalled();
    expect(result).toBe("/dashboard");
  });

  it("verifies recovery token hashes when no code is present", async () => {
    const exchangeCodeForSession = vi.fn();
    const setSession = vi.fn().mockResolvedValue({ error: null });

    const result = await handleAuthCallback({
      searchParams: new URLSearchParams("token_hash=token-123&type=recovery&access_token=token-123&refresh_token=refresh-123"),
      exchangeCodeForSession,
      setSession,
    });

    expect(setSession).toHaveBeenCalledWith({ access_token: "token-123", refresh_token: "refresh-123" });
    expect(result).toBe("/update-password");
  });

  it("reads recovery tokens from the URL hash when Supabase provides them that way", async () => {
    const exchangeCodeForSession = vi.fn();
    const setSession = vi.fn().mockResolvedValue({ error: null });

    const result = await handleAuthCallback({
      searchParams: new URLSearchParams("access_token=token-456&refresh_token=refresh-456&type=recovery"),
      exchangeCodeForSession,
      setSession,
    });

    expect(setSession).toHaveBeenCalledWith({ access_token: "token-456", refresh_token: "refresh-456" });
    expect(result).toBe("/update-password");
  });
});
