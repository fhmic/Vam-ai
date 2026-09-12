import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CAREER_LEVELS, COUNTRIES } from "@/lib/onboarding/constants";

/**
 * Priority test #3 (Onboarding completion flow) — validates the request
 * schema in isolation. Mirrors bodySchema in
 * src/app/api/onboarding/complete/route.ts; kept as an inline copy
 * rather than importing the route module directly because that module
 * pulls in next/server + the Supabase server client, which needs a
 * request-scoped cookie store this unit test intentionally doesn't set
 * up (that's what tests/integration/onboarding-completion.test.ts is
 * for). If the two schemas drift, this is exactly the kind of gap the
 * integration test (once wired to a real test project) will catch by
 * exercising the real route.
 *
 * Product Redefinition — Onboarding Overhaul: profession/experience_level
 * are gone; industryId/functionalAreaId/currentRoleId/careerLevel/
 * organizationName/country replace them.
 */
const PRIMARY_GOALS = [
  "Improve Confidence",
  "Executive Presence",
  "Ace Interviews",
  "Improve Presentations",
  "Improve Meetings",
  "Become More Persuasive",
  "Leadership Communication",
] as const;

const bodySchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  timezone: z.string().trim().min(1).max(64),
  country: z.enum(COUNTRIES).optional(),
  organizationName: z.string().trim().max(160).optional(),
  industryId: z.string().uuid().optional(),
  functionalAreaId: z.string().uuid().optional(),
  currentRoleId: z.string().uuid().optional(),
  careerLevel: z.enum(CAREER_LEVELS).optional(),
  primaryGoal: z.enum(PRIMARY_GOALS).optional(),
  acceptedDocumentIds: z.array(z.string().uuid()).default([]),
});

describe("onboarding completion request schema", () => {
  it("accepts a minimal valid payload", () => {
    const result = bodySchema.safeParse({
      displayName: "Jamie",
      timezone: "America/New_York",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty display name", () => {
    const result = bodySchema.safeParse({ displayName: "", timezone: "UTC" });
    expect(result.success).toBe(false);
  });

  it("accepts a full professional-identity payload", () => {
    const result = bodySchema.safeParse({
      displayName: "Jamie",
      timezone: "UTC",
      country: "Nigeria",
      organizationName: "Acme Bank",
      industryId: "550e8400-e29b-41d4-a716-446655440000",
      functionalAreaId: "550e8400-e29b-41d4-a716-446655440001",
      currentRoleId: "550e8400-e29b-41d4-a716-446655440002",
      careerLevel: "Executive Level",
      primaryGoal: "Executive Presence",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a career level outside the fixed six-value progression", () => {
    const result = bodySchema.safeParse({
      displayName: "Jamie",
      timezone: "UTC",
      careerLevel: "Wizard Level",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a country outside the known list", () => {
    const result = bodySchema.safeParse({
      displayName: "Jamie",
      timezone: "UTC",
      country: "Narnia",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid industryId", () => {
    const result = bodySchema.safeParse({
      displayName: "Jamie",
      timezone: "UTC",
      industryId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid acceptedDocumentIds entry", () => {
    const result = bodySchema.safeParse({
      displayName: "Jamie",
      timezone: "UTC",
      acceptedDocumentIds: ["not-a-uuid"],
    });
    expect(result.success).toBe(false);
  });
});
