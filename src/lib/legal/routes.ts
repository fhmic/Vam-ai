/**
 * Maps legal_documents.slug -> the page route that renders that
 * document's text (src/app/legal/*). Kept separate from
 * src/lib/legal/acceptance.ts (which is server-only) because the
 * onboarding form is a Client Component and needs these paths to render
 * links next to the acceptance checkbox.
 */
export const LEGAL_SLUG_ROUTES: Record<string, string> = {
  "terms-of-service": "/legal/terms",
  "privacy-policy": "/legal/privacy",
  "acceptable-use-policy": "/legal/acceptable-use",
  "ai-consent": "/legal/ai-consent",
};
