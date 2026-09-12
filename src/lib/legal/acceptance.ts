import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, LegalDocument } from "@/types/database";
import { REQUIRED_LEGAL_SLUGS } from "@/lib/legal/required-slugs";

export { REQUIRED_LEGAL_SLUGS };
export type { RequiredLegalSlug } from "@/lib/legal/required-slugs";

type Db = SupabaseClient<Database>;

/**
 * Returns the latest published version of each required legal document,
 * keyed by slug. "Latest" = most recently published row for that slug.
 * Uses the RLS-scoped client — the `legal_documents_select_published`
 * policy (migration 0007) already restricts this to published rows, so
 * no admin client is needed just to read the catalog.
 */
export async function getRequiredLegalDocuments(
  supabase: Db,
): Promise<LegalDocument[]> {
  const { data, error } = await supabase
    .from("legal_documents")
    .select("*")
    .in("slug", REQUIRED_LEGAL_SLUGS as unknown as string[])
    .order("published_at", { ascending: false });

  if (error) throw error;

  const latestBySlug = new Map<string, LegalDocument>();
  for (const doc of data ?? []) {
    if (!latestBySlug.has(doc.slug)) latestBySlug.set(doc.slug, doc);
  }

  // Preserve REQUIRED_LEGAL_SLUGS order for stable UI rendering.
  return REQUIRED_LEGAL_SLUGS.map((slug) => latestBySlug.get(slug)).filter(
    (doc): doc is LegalDocument => Boolean(doc),
  );
}

/**
 * Diffs a user's acceptance ledger against the latest published version
 * of every required document, returning the ones they still need to
 * (re-)accept. Empty array = fully compliant.
 *
 * This is what makes "future legal updates must require re-acceptance"
 * (Change #1 requirement) real: publishing a new row for an existing
 * slug (a new version) makes every user who only accepted the prior
 * version show up here again, without touching any user row directly.
 */
export async function getMissingLegalAcceptances(
  supabase: Db,
  userId: string,
): Promise<LegalDocument[]> {
  const requiredDocs = await getRequiredLegalDocuments(supabase);
  if (requiredDocs.length === 0) return [];

  const { data: acceptances, error } = await supabase
    .from("legal_acceptances")
    .select("document_id")
    .eq("user_id", userId)
    .in(
      "document_id",
      requiredDocs.map((d) => d.id),
    );

  if (error) throw error;

  const acceptedDocumentIds = new Set((acceptances ?? []).map((a) => a.document_id));

  return requiredDocs.filter((doc) => !acceptedDocumentIds.has(doc.id));
}

/**
 * Derives the caller's IP from standard proxy headers (Vercel/most
 * reverse proxies set x-forwarded-for; x-real-ip as a fallback). Never
 * trust an IP the client could set as a JSON body field — this is why
 * legal_acceptances has no client-writable insert policy (migration
 * 0007) and why acceptance recording only ever happens through this
 * server-only helper.
 */
function resolveClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

/**
 * Writes one immutable legal_acceptances row per accepted document for
 * the given user, via the service-role client (the only client with an
 * insert path — see migration 0007's RLS policies). Uses `on conflict do
 * nothing` semantics implicitly via the table's
 * `unique (user_id, document_id)` constraint: re-accepting the same
 * document version is a harmless no-op, it never overwrites the
 * original accepted_at/ip_address/user_agent of a prior acceptance.
 *
 * Callers MUST have already run `verifyAuthenticatedUser()` and pass
 * that verified user's id — this function does not itself check auth
 * (see src/lib/supabase/auth-guard.ts for why that split exists).
 */
export async function recordLegalAcceptances(
  request: Request,
  userId: string,
  documents: Pick<LegalDocument, "id">[],
): Promise<void> {
  if (documents.length === 0) return;

  const admin = createAdminClient();
  const ipAddress = resolveClientIp(request);
  const userAgent = request.headers.get("user-agent");

  const { error } = await admin.from("legal_acceptances").upsert(
    documents.map((doc) => ({
      user_id: userId,
      document_id: doc.id,
      ip_address: ipAddress,
      user_agent: userAgent,
    })),
    { onConflict: "user_id,document_id", ignoreDuplicates: true },
  );

  if (error) throw error;
}
