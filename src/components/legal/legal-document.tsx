/**
 * Renders a legal document's plain-text body inside the app's page
 * chrome. Introduced as part of the CTO Review Foundation Hardening
 * pass: every page under src/app/legal/* previously consisted of raw
 * text with no component export at all, which meant `next build` could
 * not have been passing (Change #5 wires up a real CI build gate, and
 * Change #1 needs these routes to actually render so onboarding/legal
 * re-acceptance can link users to real, readable documents).
 */
export function LegalDocument({ title, content }: { title: string; content: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <pre className="mt-6 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-700">
        {content.trim()}
      </pre>
    </div>
  );
}
