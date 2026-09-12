import { describe, expect, it } from "vitest";
import { REQUIRED_LEGAL_SLUGS } from "@/lib/legal/required-slugs";
import { LEGAL_SLUG_ROUTES } from "@/lib/legal/routes";

/**
 * Priority test #4 (Legal acceptance recording) — the part of it that
 * doesn't need a live database: guards against the two lists that MUST
 * stay in sync silently drifting apart. If someone adds a slug to
 * REQUIRED_LEGAL_SLUGS but forgets to add a route for it, the onboarding
 * form's Link href would silently fall back to "#" for a legally
 * required document — this test fails loudly instead.
 */
describe("legal document slug/route consistency", () => {
  it("has a route mapped for every required slug", () => {
    for (const slug of REQUIRED_LEGAL_SLUGS) {
      expect(LEGAL_SLUG_ROUTES[slug], `missing route mapping for "${slug}"`).toBeDefined();
    }
  });

  it("has no duplicate required slugs", () => {
    expect(new Set(REQUIRED_LEGAL_SLUGS).size).toBe(REQUIRED_LEGAL_SLUGS.length);
  });
});
