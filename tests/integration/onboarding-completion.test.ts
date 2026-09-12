import { afterEach, describe, expect, it } from "vitest";
import { createTestAdminClient, hasTestEnv } from "./env";

/**
 * Priority test #3: Onboarding completion flow.
 *
 * Exercises the data contract that POST /api/onboarding/complete relies
 * on (profile fields + legal_acceptances rows written together) directly
 * against the database, rather than through an HTTP request — a true
 * end-to-end HTTP test needs a running Next server (`next start` +
 * something like supertest) which isn't wired into this test run yet.
 * That's the natural next step once this foundation is in place (see
 * tests/README.md); this test still catches the most likely regression,
 * which is the DB-level contract getting out of sync with what the
 * route promises.
 */
describe.skipIf(!hasTestEnv)("onboarding completion data contract", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    const admin = createTestAdminClient();
    for (const id of createdUserIds.splice(0)) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  it("persists profile fields and one acceptance row per required document", async () => {
    const admin = createTestAdminClient();
    const { data: userData } = await admin.auth.admin.createUser({
      email: `test-${crypto.randomUUID()}@example.com`,
      email_confirm: true,
    });
    const userId = userData!.user!.id;
    createdUserIds.push(userId);

    const { data: requiredDocs } = await admin
      .from("legal_documents")
      .select("id")
      .in("slug", [
        "terms-of-service",
        "privacy-policy",
        "acceptable-use-policy",
        "ai-consent",
      ])
      .not("published_at", "is", null);

    const now = new Date().toISOString();
    await admin
      .from("profiles")
      .update({
        display_name: "Jamie",
        timezone: "America/New_York",
        career_level: "Executive Level",
        primary_goal: "Executive Presence",
        onboarding_completed_at: now,
        terms_accepted_at: now,
      })
      .eq("id", userId);

    await admin.from("legal_acceptances").upsert(
      requiredDocs!.map((doc) => ({ user_id: userId, document_id: doc.id })),
      { onConflict: "user_id,document_id", ignoreDuplicates: true },
    );

    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    expect(profile?.onboarding_completed_at).not.toBeNull();
    expect(profile?.career_level).toBe("Executive Level");

    const { data: acceptances } = await admin
      .from("legal_acceptances")
      .select("document_id")
      .eq("user_id", userId);

    expect(acceptances).toHaveLength(requiredDocs!.length);
  });
});
