import { LegalDocument } from "@/components/legal/legal-document";

const CONTENT = `
PRIVACY POLICY

Effective Date: [Insert Date]

Last Updated: [Insert Date]

VA ("VA", "we", "our", or "us") respects your privacy and is committed to protecting your personal information.

This Privacy Policy explains how VA (Vocal + Acuity) collects, uses, stores, processes, and protects your information when you access or use our website, applications, services, and related features (collectively, the "Service").

By using VA, you consent to the practices described in this Privacy Policy.

=================================================================
1. ABOUT VA
=================================================================

VA (Vocal + Acuity) is an AI-powered corporate communication development platform that helps users improve professional communication, executive presence, leadership communication, strategic thinking, presentations, interviews, and related communication skills.

VA uses artificial intelligence technologies to personalize user experiences and provide communication coaching, mentoring, assessments, and progress tracking.

=================================================================
2. INFORMATION WE COLLECT
=================================================================

We may collect the following categories of information:

A. ACCOUNT INFORMATION

- Full name
- Display name
- Email address
- Login credentials
- Profile photo (optional)
- Authentication information

B. PROFILE INFORMATION

- Profession
- Experience level
- Communication goals
- Learning preferences
- User settings
- Communication DNA profile

C. COMMUNICATION DATA

- Text conversations
- Mentor discussions
- Role-play interactions
- Assessment responses
- Coaching interactions
- Progress data

D. VOICE DATA

When voice features are enabled, we may collect:

- Voice recordings
- Speech transcripts
- Audio metadata
- Voice assessment results

E. DEVICE AND TECHNICAL INFORMATION

- Browser type
- Device type
- Operating system
- IP address
- Session data
- Usage logs

F. ANALYTICS INFORMATION

- Feature usage
- Pages visited
- User engagement metrics
- Performance metrics
- Error reports

=================================================================
3. HOW WE USE YOUR INFORMATION
=================================================================

We use your information to:

- Provide the Service.
- Create and manage user accounts.
- Authenticate users.
- Personalize mentor interactions.
- Generate communication assessments.
- Build Communication DNA profiles.
- Track progress and performance.
- Improve coaching recommendations.
- Enable multi-device access.
- Improve platform quality.
- Monitor security and system performance.
- Comply with legal obligations.

=================================================================
4. AI PROCESSING
=================================================================

VA uses artificial intelligence systems to process certain information you provide.

Your information may be processed to:

- Generate mentor responses.
- Create communication assessments.
- Produce coaching recommendations.
- Develop Communication DNA profiles.
- Generate progress insights.
- Personalize future interactions.

AI-generated content may not always be accurate, complete, or appropriate.

Users should exercise independent judgment when relying on AI-generated outputs.

=================================================================
5. VOICE DATA PROCESSING
=================================================================

When you use voice features, we may:

- Process audio recordings.
- Convert speech into text.
- Generate communication assessments.
- Analyze communication patterns.
- Store transcripts.
- Improve coaching experiences.

Voice recordings may be temporarily or permanently stored depending on your account settings and applicable retention requirements.

You may discontinue use of voice features at any time.

=================================================================
6. MENTOR MEMORY & COMMUNICATION DNA
=================================================================

To provide a personalized mentoring experience, VA may store:

- Past conversations
- Goals
- Preferences
- Coaching history
- Communication strengths
- Communication weaknesses
- Assessment results

This information may be used to create and update your Communication DNA profile.

Communication DNA is intended solely to personalize your learning experience and communication development journey.

Communication DNA profiles are not psychological evaluations, personality assessments, employment evaluations, or certifications.

=================================================================
7. LEGAL BASIS FOR PROCESSING
=================================================================

Where applicable, we process personal information based on:

- Your consent.
- Contractual necessity.
- Legitimate business interests.
- Compliance with legal obligations.
- Protection of platform security and integrity.

=================================================================
8. INFORMATION SHARING
=================================================================

We do not sell your personal information.

We may share information with trusted service providers that help operate the platform.

These providers may include:

- Cloud hosting providers
- Authentication providers
- Database providers
- Analytics providers
- Artificial intelligence service providers
- Customer support platforms
- Security and monitoring providers

Information is shared only as reasonably necessary to provide the Service.

=================================================================
9. THIRD-PARTY SERVICE PROVIDERS
=================================================================

VA may utilize third-party services, including but not limited to:

- Supabase
- Vercel
- Groq
- PostHog
- Sentry

These providers may process information on our behalf in accordance with their own privacy and security policies.

=================================================================
10. DATA RETENTION
=================================================================

We retain information only for as long as necessary to:

- Operate the Service.
- Fulfill contractual obligations.
- Comply with legal requirements.
- Resolve disputes.
- Maintain security.

When information is no longer required, it may be deleted, anonymized, or aggregated.

=================================================================
11. DATA SECURITY
=================================================================

VA implements reasonable technical and organizational measures designed to protect information from:

- Unauthorized access
- Unauthorized disclosure
- Loss
- Misuse
- Alteration
- Destruction

However, no system can guarantee absolute security.

Users are responsible for maintaining secure account credentials.

=================================================================
12. INTERNATIONAL USERS
=================================================================

Your information may be processed and stored in countries outside your country of residence.

By using the Service, you acknowledge that data may be transferred to and processed in jurisdictions with different privacy laws.

=================================================================
13. YOUR RIGHTS
=================================================================

Subject to applicable law, you may have the right to:

- Access your information.
- Correct inaccurate information.
- Delete your information.
- Export your information.
- Restrict processing.
- Object to processing.
- Withdraw consent.
- Lodge complaints with applicable regulators.

To exercise these rights, contact us using the information below.

=================================================================
14. ACCOUNT DELETION
=================================================================

You may request deletion of your account at any time.

Upon deletion:

- Access to the platform will cease.
- Personal information may be removed.
- Certain records may be retained where legally required.
- Backup and archival records may persist temporarily until routine deletion cycles complete.

=================================================================
15. CHILDREN'S PRIVACY
=================================================================

VA is not intended for children under the age of 18.

We do not knowingly collect personal information from minors.

If we become aware that information has been collected from a child in violation of applicable law, we will take reasonable steps to delete it.

=================================================================
16. COOKIES AND TRACKING TECHNOLOGIES
=================================================================

VA may use:

- Cookies
- Session identifiers
- Analytics technologies
- Similar tracking tools

These technologies help:

- Maintain login sessions.
- Improve performance.
- Analyze usage patterns.
- Enhance user experience.

Additional details may be provided in a separate Cookie Policy.

=================================================================
17. CHANGES TO THIS PRIVACY POLICY
=================================================================

We may update this Privacy Policy periodically.

Updated versions will be published on this page with a revised "Last Updated" date.

Continued use of the Service after changes become effective constitutes acceptance of the updated Privacy Policy.

=================================================================
18. CONTACT US
=================================================================

If you have questions regarding this Privacy Policy or your personal information, please contact:

VA (Vocal + Acuity)

Privacy Team

Email: privacy@yourdomain.com

Legal Contact: legal@yourdomain.com

Website: https://yourdomain.com

=================================================================
19. AI AND COMMUNICATION DISCLOSURE
=================================================================

VA provides communication coaching and mentoring through artificial intelligence technologies.

VA does not provide:

- Legal advice
- Financial advice
- Tax advice
- Medical advice
- Mental health treatment
- Therapy
- Employment advice
- Investment advice

Communication assessments, Communication DNA profiles, mentor feedback, and coaching recommendations are educational tools only.

Users remain solely responsible for decisions made based on information provided through the Service.

=================================================================
END OF PRIVACY POLICY
=================================================================
`;

export default function Page() {
  return <LegalDocument title="Privacy Policy" content={CONTENT} />;
}
