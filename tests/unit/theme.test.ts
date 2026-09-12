import { describe, expect, it } from "vitest";
import { resolveTheme } from "@/lib/theme/resolve";

describe("resolveTheme", () => {
  it("returns 'light' directly when preference is 'light', regardless of system", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("light", false)).toBe("light");
  });

  it("returns 'dark' directly when preference is 'dark', regardless of system", () => {
    expect(resolveTheme("dark", true)).toBe("dark");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows the system preference when preference is 'system'", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});
