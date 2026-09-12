import { afterEach, describe, expect, it } from "vitest";
import { createTestAdminClient, hasTestEnv } from "./env";

/**
 * Priority test #1: Profile creation trigger.
 * Verifies handle_new_user() (migrations 0004, extended by 0010) fires
 * on auth.users insert and creates exactly one profiles row and exactly
 * one user_preferences row with the documented defaults — this is the
 * 1:1 invariant Change #4 depends on.
 */
describe.skipIf(!hasTestEnv)("handle_new_user trigger", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    const admin = createTestAdminClient();
    for (const id of createdUserIds.splice(0)) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  it("creates a profile row for a new auth user", async () => {
    const admin = createTestAdminClient();
    const email = `test-${crypto.randomUUID()}@example.com`;

    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    expect(error).toBeNull();
    const userId = data!.user!.id;
    createdUserIds.push(userId);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    expect(profileError).toBeNull();
    expect(profile?.id).toBe(userId);
    expect(profile?.onboarding_completed_at).toBeNull();
  });

  it("creates exactly one user_preferences row with documented defaults", async () => {
    const admin = createTestAdminClient();
    const email = `test-${crypto.randomUUID()}@example.com`;

    const { data } = await admin.auth.admin.createUser({ email, email_confirm: true });
    const userId = data!.user!.id;
    createdUserIds.push(userId);

    const { data: prefs, error } = await admin
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId);

    expect(error).toBeNull();
    expect(prefs).toHaveLength(1);
    expect(prefs?.[0]).toMatchObject({
      theme: "system",
      voice_enabled: true,
      mentor_style: "balanced",
      coaching_intensity: "medium",
    });
  });
});
