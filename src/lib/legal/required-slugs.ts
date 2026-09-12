/**
 * Slugs a user must have an up-to-date acceptance of before they can use
 * the product. Kept as a single constant (not derived from the DB) so
 * "what's required" is a reviewable code change, not a silent effect of
 * whatever happens to be published — publishing a new document slug
 * that isn't listed here does NOT gate onboarding/usage until someone
 * deliberately adds it here.
 *
 * Deliberately has no `server-only` import (unlike
 * src/lib/legal/acceptance.ts, which re-exports this): it's a plain
 * constant, safe to import from tests and from client components (e.g.
 * the onboarding form building its checkbox copy) without dragging in
 * the admin Supabase client.
 */
export const REQUIRED_LEGAL_SLUGS = [
  "terms-of-service",
  "privacy-policy",
  "acceptable-use-policy",
  "ai-consent",
] as const;

export type RequiredLegalSlug = (typeof REQUIRED_LEGAL_SLUGS)[number];
