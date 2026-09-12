import Link from "next/link";

const LEGAL_LINKS: { href: string; label: string }[] = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/acceptable-use", label: "Acceptable Use Policy" },
  { href: "/legal/ai-consent", label: "AI Consent" },
  { href: "/legal/cookies", label: "Cookie Policy" },
  { href: "/legal/disclaimer", label: "Disclaimer" },
  { href: "/legal/dpa", label: "Data Processing Agreement" },
  { href: "/legal/data-processing-notice", label: "Data Processing Notice" },
  { href: "/legal/privacy-preferences", label: "Privacy Preferences" },
  { href: "/legal/consent-release", label: "Consent & Release" },
  { href: "/legal/subscription-terms", label: "Subscription Terms" },
];

export function LegalFooter() {
  return (
    <footer className="border-t border-ink/10 bg-white py-8 dark:border-white/10 dark:bg-ink-soft">
      <div className="mx-auto max-w-5xl px-4">
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs text-ink/50 hover:text-ink hover:underline dark:text-white/50 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="mt-4 text-xs text-ink/40 dark:text-white/40">
          © {new Date().getFullYear()} VAM. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
