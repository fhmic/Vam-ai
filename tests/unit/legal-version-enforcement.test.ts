import { describe, expect, it } from "vitest";
import { getMissingLegalAcceptances, getRequiredLegalDocuments } from "@/lib/legal/acceptance";
import type { LegalDocument } from "@/types/database";

/**
 * Priority test #2 (Phase 1A Final Production Readiness Audit, Phase 6):
 * legal document version update forcing re-acceptance.
 *
 * This is the core compliance guarantee behind Change #1 / ADR-004:
 * publishing a new row for an existing slug must make every user who
 * only accepted the prior version show up as "missing" again, without
 * touching any user row directly. Uses a hand-rolled fake query builder
 * matching the exact chains getRequiredLegalDocuments/
 * getMissingLegalAcceptances call — no live Supabase project needed
 * since this logic is pure diffing, not a trigger or RLS policy.
 */
function makeSupabaseStub(documents: LegalDocument[], acceptedDocumentIds: string[]) {
  return {
    from(table: string) {
      if (table === "legal_documents") {
        return {
          select: () => ({
            in: () => ({
              order: async () => ({ data: documents, error: null }),
            }),
          }),
        };
      }
      if (table === "legal_acceptances") {
        return {
          select: () => ({
            eq: () => ({
              in: async () => ({
                data: acceptedDocumentIds.map((document_id) => ({ document_id })),
                error: null,
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table in test stub: ${table}`);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function doc(overrides: Partial<LegalDocument>): LegalDocument {
  return {
    id: "doc-id",
    name: "Terms of Service",
    slug: "terms-of-service",
    version: "v1",
    published_at: "2025-01-01T00:00:00.000Z",
    created_at: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("legal document version enforcement", () => {
  it("getRequiredLegalDocuments returns only the latest published version per slug", async () => {
    const oldVersion = doc({ id: "doc-v1", version: "2025-01-01", published_at: "2025-01-01T00:00:00Z" });
    const newVersion = doc({ id: "doc-v2", version: "2026-01-01", published_at: "2026-01-01T00:00:00Z" });

    // Real query orders by published_at desc, so the newest arrives first.
    const supabase = makeSupabaseStub([newVersion, oldVersion], []);

    const required = await getRequiredLegalDocuments(supabase);

    expect(required).toHaveLength(1);
    expect(required[0]?.id).toBe("doc-v2");
  });

  it("flags a document as missing when the user only accepted a superseded version", async () => {
    const oldVersion = doc({ id: "doc-v1", version: "2025-01-01", published_at: "2025-01-01T00:00:00Z" });
    const newVersion = doc({ id: "doc-v2", version: "2026-01-01", published_at: "2026-01-01T00:00:00Z" });

    const supabase = makeSupabaseStub([newVersion, oldVersion], ["doc-v1"]);

    const missing = await getMissingLegalAcceptances(supabase, "user-1");

    expect(missing.map((d) => d.id)).toEqual(["doc-v2"]);
  });

  it("reports nothing missing once the user has accepted the current version", async () => {
    const newVersion = doc({ id: "doc-v2", version: "2026-01-01", published_at: "2026-01-01T00:00:00Z" });

    const supabase = makeSupabaseStub([newVersion], ["doc-v2"]);

    const missing = await getMissingLegalAcceptances(supabase, "user-1");

    expect(missing).toEqual([]);
  });
});
