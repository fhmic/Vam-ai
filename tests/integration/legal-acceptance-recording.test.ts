import { afterEach, describe, expect, it } from "vitest";
import { createTestAdminClient, hasTestEnv } from "./env";

/**
 * Priority test #4: Legal acceptance recording.
 * A repeat acceptance of the same document must never overwrite the
 * original accepted_at/ip_address — legal_acceptances is an append-only
 * audit ledger (migration 0007), not a mutable "latest state" row.
 */
describe.skipIf(!hasTestEnv)("legal acceptance recording", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    const admin = createTestAdminClient();
    for (const id of createdUserIds.splice(0)) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  it("does not overwrite an existing acceptance's accepted_at on re-insert", async () => {
    const admin = createTestAdminClient();
    const { data: userData } = await admin.auth.admin.createUser({
      email: `test-${crypto.randomUUID()}@example.com`,
      email_confirm: true,
    });
    const userId = userData!.user!.id;
    createdUserIds.push(userId);

    const { data: doc } = await admin
      .from("legal_documents")
      .select("id")
      .eq("slug", "terms-of-service")
      .not("published_at", "is", null)
      .limit(1)
      .single();

    const { data: firstInsert } = await admin
      .from("legal_acceptances")
      .insert({ user_id: userId, document_id: doc!.id, ip_address: "203.0.113.1" })
      .select("accepted_at")
      .single();

    await new Promise((resolve) => setTimeout(resolve, 10));

    await admin.from("legal_acceptances").upsert(
      [{ user_id: userId, document_id: doc!.id, ip_address: "198.51.100.1" }],
      { onConflict: "user_id,document_id", ignoreDuplicates: true },
    );

    const { data: rows } = await admin
      .from("legal_acceptances")
      .select("*")
      .eq("user_id", userId)
      .eq("document_id", doc!.id);

    expect(rows).toHaveLength(1);
    expect(rows?.[0]?.accepted_at).toBe(firstInsert?.accepted_at);
    expect(rows?.[0]?.ip_address).toBe("203.0.113.1");
  });
});
