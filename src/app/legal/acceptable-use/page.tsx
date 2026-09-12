import { LegalDocument } from "@/components/legal/legal-document";

const CONTENT = `
ACCEPTABLE USE POLICY

Effective Date: [Insert Date]

Last Updated: [Insert Date]

This Acceptable Use Policy ("AUP") explains the rules governing your use of VA (Vocal + Acuity), its services, applications, website, content, artificial intelligence systems, mentoring features, assessments, voice features, and related functionality (collectively, the "Service").

By accessing or using VA, you agree to comply with this Acceptable Use Policy.

Failure to comply may result in suspension, restriction, or termination of your access to the Service.

=================================================================
1. PURPOSE OF THIS POLICY
=================================================================

VA is an AI-powered Corporate Communication Development Platform designed to help users improve:

- Corporate Communication
- Professional Articulation
- Executive Presence
- Leadership Communication
- Strategic Thinking
- Interview Performance
- Presentation Skills
- Communication Confidence

This Policy exists to ensure that VA remains a safe, lawful, professional, and productive environment for all users.

=================================================================
2. GENERAL RESPONSIBILITIES
=================================================================

You agree to use VA:

- Responsibly
- Professionally
- Legally
- Ethically
- Respectfully

You must comply with:

- Applicable laws
- Applicable regulations
- These Terms of Service
- This Acceptable Use Policy

Users are responsible for all activities conducted through their accounts.

=================================================================
3. PROHIBITED ACTIVITIES
=================================================================

You may not use VA to:

- Violate any law or regulation.
- Commit fraud.
- Impersonate another individual.
- Misrepresent your identity.
- Engage in deceptive practices.
- Facilitate criminal activity.
- Promote harmful conduct.
- Circumvent platform safeguards.
- Interfere with platform operations.

=================================================================
4. HARASSMENT AND ABUSE
=================================================================

You may not use VA to:

- Harass others.
- Threaten others.
- Intimidate others.
- Stalk others.
- Encourage violence.
- Promote discrimination.
- Bully individuals or groups.

VA may suspend or terminate users engaging in abusive or harmful conduct.

=================================================================
5. UNLAWFUL CONTENT
=================================================================

You may not upload, generate, distribute, or request content that:

- Violates applicable laws.
- Promotes criminal conduct.
- Supports illegal activity.
- Infringes intellectual property rights.
- Violates privacy rights.
- Violates contractual obligations.
- Defames individuals or organizations.

=================================================================
6. FRAUD AND DECEPTION
=================================================================

You may not use VA to:

- Commit fraud.
- Assist fraudulent schemes.
- Create deceptive communications.
- Mislead individuals.
- Impersonate professionals.
- Forge credentials.
- Create false documentation.

=================================================================
7. INTELLECTUAL PROPERTY VIOLATIONS
=================================================================

Users must respect intellectual property rights.

You may not:

- Upload copyrighted material without authorization.
- Reproduce protected content unlawfully.
- Infringe trademarks.
- Remove ownership notices.
- Misappropriate proprietary information.

Users are solely responsible for content they submit.

=================================================================
8. SECURITY VIOLATIONS
=================================================================

You may not:

- Attempt unauthorized access.
- Probe or test platform vulnerabilities.
- Circumvent authentication systems.
- Interfere with security controls.
- Distribute malware.
- Introduce malicious code.
- Launch denial-of-service attacks.
- Access data belonging to other users.

Any security violation may result in immediate account termination.

=================================================================
9. AUTOMATED ACCESS
=================================================================

You may not:

- Use bots to scrape content.
- Mass harvest platform data.
- Extract user information.
- Reverse engineer platform behavior.
- Collect training data without authorization.
- Build competing products using platform content or output.

Reasonable automated usage explicitly authorized by VA may be permitted.

=================================================================
10. AI MISUSE
=================================================================

You may not use VA to:

- Generate unlawful content.
- Evade legal obligations.
- Develop harmful systems.
- Manipulate or deceive individuals.
- Circumvent platform safety controls.
- Abuse AI-generated output.

Attempts to intentionally manipulate AI systems in a harmful manner may result in account suspension.

=================================================================
11. PROMPT INJECTION AND MODEL MANIPULATION
=================================================================

Users may not attempt to:

- Override system instructions.
- Extract confidential prompts.
- Obtain restricted platform information.
- Manipulate mentor behavior maliciously.
- Circumvent safety mechanisms.

Academic or security research requires prior written permission.

=================================================================
12. PROFESSIONAL MISREPRESENTATION
=================================================================

You may not represent VA's output as:

- Legal advice.
- Financial advice.
- Medical advice.
- Mental health treatment.
- Regulatory approval.
- Professional certification.
- Official assessment results.

VA output should not be represented as authoritative professional advice.

=================================================================
13. VOICE FEATURE RESTRICTIONS
=================================================================

When using voice features, you agree not to:

- Upload unauthorized recordings.
- Record other individuals without required consent.
- Upload unlawful audio content.
- Upload malicious audio designed to disrupt processing systems.

You remain responsible for ensuring your use of voice features complies with applicable laws.

=================================================================
14. COMMUNICATION DNA MISUSE
=================================================================

Communication DNA profiles are intended solely for personal coaching purposes.

You may not:

- Present them as psychological evaluations.
- Present them as professional certifications.
- Use them to evaluate third parties.
- Use them for employment screening.
- Use them for discriminatory purposes.

=================================================================
15. ROLE-PLAY RESTRICTIONS
=================================================================

Role-play features are designed for educational and communication-development purposes.

Users may not use role-play features to:

- Harass individuals.
- Create fraudulent communications.
- Impersonate real persons maliciously.
- Circumvent legal requirements.
- Promote harmful behavior.

=================================================================
16. DATA MISUSE
=================================================================

You may not:

- Access another user's data.
- Attempt to retrieve private information.
- Export unauthorized information.
- Circumvent access controls.
- Collect platform data for unauthorized purposes.

=================================================================
17. PLATFORM INTEGRITY
=================================================================

Users may not engage in conduct that harms:

- Platform reliability
- Platform security
- Platform availability
- User experience

Examples include:

- Excessive automated requests
- Deliberate platform abuse
- Traffic manipulation
- Resource exhaustion attacks

=================================================================
18. ENFORCEMENT
=================================================================

VA reserves the right to:

- Investigate suspected violations.
- Restrict access.
- Suspend accounts.
- Remove content.
- Terminate accounts.
- Report unlawful conduct to authorities.

Enforcement actions may occur without prior notice where necessary to protect users, systems, or legal interests.

=================================================================
19. REPORTING VIOLATIONS
=================================================================

If you become aware of conduct that violates this Policy, please report it to:

Email: abuse@yourdomain.com

or

Email: legal@yourdomain.com

Please provide sufficient information to assist investigation of the reported issue.

=================================================================
20. CHANGES TO THIS POLICY
=================================================================

VA may update this Acceptable Use Policy periodically.

Updated versions will be published with a revised "Last Updated" date.

Continued use of the Service after changes become effective constitutes acceptance of the updated Policy.

=================================================================
21. CONTACT INFORMATION
=================================================================

VA (Vocal + Acuity)

Email: legal@yourdomain.com

Email: abuse@yourdomain.com

Website: https://yourdomain.com

=================================================================
END OF ACCEPTABLE USE POLICY
=================================================================
`;

export default function Page() {
  return <LegalDocument title="Acceptable Use Policy" content={CONTENT} />;
}
