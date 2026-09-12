import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createTestAdminClient, hasTestEnv } from "./env";

/**
 * Priority test #2: RLS behavior.
 * A user must never be able to read another user's profile, and must
 * never be able to write legal_acceptances directly (that table has no
 * client insert policy — see migration 0007; writes only ever happen
 * through the service-role client via src/lib/legal/acceptance.ts).
 */
describe.skipIf(!hasTestEnv)("row level security", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    const admin = createTestAdminClient();
    for (const id of createdUserIds.splice(0)) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  async function createConfirmedUserClient(): Promise<{
    client: ReturnType<typeof createClient<Database>>;
    userId: string;
  }> {
    const admin = createTestAdminClient();
    const email = `test-${crypto.randomUUID()}@example.com`;
    const password = `Test-${crypto.randomUUID()}`;

    const { data } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    createdUserIds.push(data!.user!.id);

    const client = createClient<Database>(
      process.env.TEST_SUPABASE_URL!,
      process.env.TEST_SUPABASE_ANON_KEY ?? process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!,
    );
    await client.auth.signInWithPassword({ email, password });

    return { client, userId: data!.user!.id };
  }

  it("cannot select another user's profile", async () => {
    const { userId: victimId } = await createConfirmedUserClient();
    const { client: attackerClient } = await createConfirmedUserClient();

    const { data, error } = await attackerClient
      .from("profiles")
      .select("*")
      .eq("id", victimId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("cannot insert a legal_acceptances row directly (no client insert policy)", async () => {
    const admin = createTestAdminClient();
    const { client, userId } = await createConfirmedUserClient();

    const { data: doc } = await admin
      .from("legal_documents")
      .select("id")
      .eq("slug", "terms-of-service")
      .not("published_at", "is", null)
      .limit(1)
      .single();

    const { error } = await client.from("legal_acceptances").insert({
      user_id: userId,
      document_id: doc!.id,
    });

    expect(error).not.toBeNull();
  });
});
