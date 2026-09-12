import { LegalDocument } from "@/components/legal/legal-document";

const CONTENT = `
TERMS OF SERVICE

Effective Date: [Insert Date]

Last Updated: [Insert Date]

Welcome to VA (Vocal + Acuity).

VA is an AI-powered corporate communication development platform designed to help professionals improve communication skills, leadership presence, executive communication, articulation, strategic thinking, and communication effectiveness.

By accessing or using VA, you agree to these Terms of Service ("Terms"). If you do not agree with these Terms, you must not use the Service.

=================================================================
1. ABOUT VA
=================================================================

VA provides AI-powered communication coaching, mentoring, assessments, role-play simulations, progress tracking, and communication development tools.

VA is intended for educational, personal development, and professional communication improvement purposes.

VA is not intended to provide legal, medical, psychological, psychiatric, therapeutic, financial, employment, tax, or investment advice.

=================================================================
2. ELIGIBILITY
=================================================================

You must:

- Be at least 18 years old or the age of majority in your jurisdiction.
- Have the legal authority to enter into these Terms.
- Provide accurate and complete account information.
- Comply with all applicable laws and regulations.

We reserve the right to suspend or terminate accounts that fail to meet these requirements.

=================================================================
3. ACCOUNT REGISTRATION
=================================================================

Certain features require user registration.

You agree to:

- Maintain accurate account information.
- Keep your login credentials secure.
- Notify us promptly of unauthorized access.
- Accept responsibility for activity occurring under your account.

Accounts are personal and may not be shared.

=================================================================
4. ACCEPTABLE USE
=================================================================

You agree not to:

- Violate any law or regulation.
- Upload malicious software or harmful content.
- Attempt unauthorized access to any systems.
- Interfere with platform operations.
- Circumvent security controls.
- Use the platform for fraud, harassment, abuse, or illegal activities.
- Scrape or copy platform content without authorization.

VA may suspend or terminate access for violations.

=================================================================
5. ARTIFICIAL INTELLIGENCE SERVICES
=================================================================

VA uses artificial intelligence to generate:

- Communication coaching
- Conversation responses
- Assessments
- Communication insights
- Communication DNA profiles
- Personalized recommendations

You acknowledge that:

- AI-generated responses may contain errors.
- Responses may be incomplete or inaccurate.
- Output should be independently evaluated.
- AI systems may occasionally generate unexpected results.
`;

export default function Page() {
  return <LegalDocument title="Terms of Service" content={CONTENT} />;
}
