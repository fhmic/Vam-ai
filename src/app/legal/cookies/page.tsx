import { LegalDocument } from "@/components/legal/legal-document";

const CONTENT = `
COOKIE POLICY

Effective Date: [Insert Date]

Last Updated: [Insert Date]

This Cookie Policy explains how VA (Vocal + Acuity) uses cookies and similar technologies when you visit our website, applications, and services (collectively, the "Service").

By continuing to use VA, you consent to the use of cookies and similar technologies as described in this Cookie Policy.

=================================================================
1. WHAT ARE COOKIES?
=================================================================

Cookies are small text files stored on your computer, phone, tablet, or other device when you visit a website.

Cookies help websites:

- Remember your preferences
- Maintain login sessions
- Improve performance
- Analyze usage patterns
- Provide personalized experiences

Cookies may be temporary (session cookies) or remain on your device for a longer period (persistent cookies).

=================================================================
2. WHY WE USE COOKIES
=================================================================

VA uses cookies and related technologies to:

- Authenticate users
- Maintain secure login sessions
- Remember preferences
- Improve platform performance
- Analyze service usage
`;

export default function Page() {
  return <LegalDocument title="Cookie Policy" content={CONTENT} />;
}
