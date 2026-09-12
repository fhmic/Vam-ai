import { LegalDocument } from "@/components/legal/legal-document";

const CONTENT = `
DATA PROCESSING NOTICE

Effective Date: [Insert Date]

Last Updated: [Insert Date]

This Data Processing Notice explains how VA (Vocal + Acuity) collects, processes, stores, transfers, and protects personal data when providing its services.

This Notice is intended to supplement our Privacy Policy and provide additional transparency regarding the processing of personal data, including rights available under applicable privacy and data protection laws.

=================================================================
1. PURPOSE OF THIS NOTICE
=================================================================

VA is committed to protecting personal information and processing personal data responsibly, lawfully, fairly, and transparently.

This Notice describes:

- What personal data we process
- Why we process it
- How long we retain it
- Where it may be stored
- Your privacy rights
- How to contact us regarding personal data

=================================================================
2. DATA CONTROLLER
=================================================================

For purposes of applicable data protection laws, VA generally acts as the Data Controller for personal information collected through the platform.

VA determines:

- What information is collected
- Why information is collected
- How information is processed
- How long information is retained

Contact:

VA (Vocal + Acuity)

Email: privacy@yourdomain.com

Website: https://yourdomain.com

=================================================================
3. CATEGORIES OF PERSONAL DATA PROCESSED
=================================================================

VA may process the following categories of information:

A. ACCOUNT DATA

- Name
- Email address
- Username
- Profile information
- Login credentials

B. PROFILE DATA

- Profession
- Experience level
- Communication goals
- Learning preferences
- Account settings

C. COMMUNICATION DATA

- Text conversations
- Mentor interactions
- Role-play interactions
- Coaching history
- Assessment responses

D. VOICE DATA

- Voice recordings
- Audio submissions
- Speech transcripts
- Voice assessment results

E. COMMUNICATION DNA DATA

- Communication preferences
- Communication strengths
- Development areas
- Personalized coaching profiles

F. TECHNICAL DATA

- Device information
- Browser information
- IP address
- Session identifiers
- Usage analytics

=================================================================
4. PURPOSES OF PROCESSING
=================================================================

VA processes personal information to:

- Provide the Service
- Authenticate users
- Maintain user accounts
- Deliver communication coaching
- Generate communication assessments
- Personalize mentor experiences
- Build and update Communication DNA profiles
- Track progress over time
- Improve platform performance
- Maintain security
- Detect fraud and abuse
- Comply with legal obligations

=================================================================
5. LEGAL BASIS FOR PROCESSING
=================================================================

Depending on the applicable jurisdiction, VA may rely on one or more of the following legal bases:

A. CONSENT

Processing based on the user's voluntary agreement.

Examples:

- Voice recording processing
- Optional profile information
- Marketing communications

B. CONTRACTUAL NECESSITY

Processing required to provide the platform and services requested by the user.

Examples:

- Account creation
- Mentor interactions
- Progress tracking

C. LEGITIMATE INTERESTS

Processing necessary for legitimate business purposes.

Examples:

- Security monitoring
- Platform improvements
- Analytics
- Service optimization

D. LEGAL OBLIGATION

Processing required to comply with applicable laws and regulations.

=================================================================
6. AI PROCESSING
=================================================================

VA utilizes artificial intelligence technologies to provide communication coaching and personalization.

Personal information may be processed for:

- AI-generated mentor responses
- Coaching recommendations
- Communication assessments
- Communication DNA generation
- Progress analysis
- Learning personalization

Automated processing may occur without direct human intervention.

AI-generated outputs should not be considered professional advice.

=================================================================
7. VOICE PROCESSING
=================================================================

When users enable voice features, VA may process:

- Audio recordings
- Voice submissions
- Speech transcripts
- Assessment-related recordings

Voice processing is used solely to:

- Provide coaching services
- Generate assessments
- Improve personalization
- Track communication progress

Users may discontinue use of voice features at any time.

=================================================================
8. DATA SHARING
=================================================================

VA does not sell personal information.

VA may share information with trusted service providers that assist in operating the platform.

Examples may include:

- Cloud hosting providers
- Authentication providers
- Database providers
- Analytics providers
- AI processing providers
- Monitoring providers

All service providers are required to process data only as necessary to provide their services.

=================================================================
9. INTERNATIONAL DATA TRANSFERS
=================================================================

Personal information may be processed, stored, or transferred across multiple jurisdictions.

Where required, VA will implement reasonable safeguards intended to protect personal information during international transfers.

By using the Service, you acknowledge that data may be processed outside your country of residence.

=================================================================
10. DATA RETENTION
=================================================================

VA retains personal data only as long as reasonably necessary for:

- Service delivery
- Legal compliance
- Security
- Dispute resolution
- Legitimate business purposes

Retention periods vary depending on the type of information and applicable legal requirements.

When information is no longer needed, it may be:

- Deleted
- Anonymized
- Aggregated

=================================================================
11. SECURITY MEASURES
=================================================================

VA implements appropriate technical and organizational measures designed to protect personal information.

Examples may include:

- Encryption
- Access controls
- Authentication mechanisms
- Security monitoring
- Secure cloud infrastructure

However, no system can guarantee absolute security.

=================================================================
12. USER RIGHTS
=================================================================

Subject to applicable law, users may have the right to:

- Access personal data
- Correct personal data
- Delete personal data
- Export personal data
- Restrict processing
- Object to processing
- Withdraw consent
- Request information about data processing activities

Requests may be submitted through the contact information provided below.

=================================================================
13. RIGHT TO DELETE
=================================================================

Users may request deletion of their account and personal data.

Upon approved deletion:

- Access to the Service will be terminated.
- Personal information may be deleted.
- Certain records may be retained where legally required.
- Backup systems may retain information temporarily until scheduled deletion cycles are completed.

=================================================================
14. RIGHT TO DATA PORTABILITY
=================================================================

Where required by applicable law, users may request a copy of their personal information in a structured and commonly used format.

VA may provide data exports through secure mechanisms.

=================================================================
15. AUTOMATED DECISION-MAKING
=================================================================

VA utilizes automated systems for:

- Assessments
- Communication scoring
- Communication DNA generation
- Coaching recommendations

These systems are intended to support learning and development.

They should not be interpreted as legal, employment, financial, medical, therapeutic, or professional decisions.

Users should exercise independent judgment regarding AI-generated outputs.

=================================================================
16. CHILDREN'S DATA
=================================================================

VA is not intended for users under 18 years of age.

We do not knowingly collect personal information from minors.

If we become aware of information collected from a minor in violation of applicable law, we will take reasonable steps to remove that information.

=================================================================
17. COMPLAINTS AND REGULATORY RIGHTS
=================================================================

Depending on your jurisdiction, you may have the right to submit complaints to applicable privacy or data protection authorities.

We encourage users to contact VA first so we may attempt to resolve concerns promptly.

=================================================================
18. CHANGES TO THIS NOTICE
=================================================================

VA may update this Data Processing Notice from time to time.

Updated versions will be published with a revised "Last Updated" date.

Continued use of the Service following the effective date of any updates constitutes acknowledgment of the revised Notice.

=================================================================
19. CONTACT INFORMATION
=================================================================

For questions regarding this Notice or personal data processing activities, contact:

VA (Vocal + Acuity)

Privacy Team

Email: privacy@yourdomain.com

Legal Contact: legal@yourdomain.com

Website: https://yourdomain.com

=================================================================
END OF DATA PROCESSING NOTICE
=================================================================
`;

export default function Page() {
  return <LegalDocument title="Data Processing Notice" content={CONTENT} />;
}
