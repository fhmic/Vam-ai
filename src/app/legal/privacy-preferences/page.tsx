import { LegalDocument } from "@/components/legal/legal-document";

const CONTENT = `
PRIVACY PREFERENCES AND DATA DELETION POLICY

Effective Date: [Insert Date]

Last Updated: [Insert Date]

This Privacy Preferences and Data Deletion Policy explains how users of VA (Vocal + Acuity) can manage privacy settings, control personal information, adjust consent preferences, request exports, and request deletion of personal data.

This Policy supplements the Privacy Policy, Data Processing Notice, and related legal documents.

=================================================================
1. PURPOSE OF THIS POLICY
=================================================================

VA is committed to providing users with meaningful control over their personal information.

This Policy explains:

- Privacy preferences available to users
- How users may manage their information
- How users may withdraw consent
- How users may request exports
- How users may request deletion of personal data
- Data retention practices following deletion requests

=================================================================
2. PRIVACY CONTROL PRINCIPLES
=================================================================

VA is built around the following principles:

- Transparency
- User control
- Data minimization
- Privacy by design
- Security by default
- Responsible AI usage

Users should have reasonable control over how their information is used within the platform.

=================================================================
3. PRIVACY PREFERENCES AVAILABLE TO USERS
=================================================================

Users may control:

A. ACCOUNT INFORMATION

- Profile information
- Display name
- Profile photo
- Public-facing account details

B. COMMUNICATION PREFERENCES

- Product updates
- Marketing emails
- Feature announcements
- Training reminders
- Assessment reminders

C. VOICE FEATURES

- Voice recording usage
- Voice processing features
- Speech analysis functions
- Voice-based coaching features

D. ANALYTICS PREFERENCES

Where available, users may choose whether certain analytics information may be collected to help improve platform performance.

=================================================================
4. VOICE PROCESSING PREFERENCES
=================================================================

Users may:

- Enable voice features
- Disable voice features
- Stop future voice recording submissions
- Request deletion of stored voice recordings where supported

Disabling voice features will not affect access to text-based coaching and mentoring features.

Some historical transcripts may remain part of past conversation records unless specifically removed through a deletion process.

=================================================================
5. COMMUNICATION DNA PREFERENCES
=================================================================

Users may:

- View Communication DNA profiles
- Update coaching preferences
- Request recalculation of Communication DNA
- Request deletion of Communication DNA information as part of account deletion

Communication DNA exists solely to personalize coaching experiences.

=================================================================
6. MENTOR MEMORY PREFERENCES
=================================================================

VA may retain mentor memory to improve personalization.

Users may:

- View mentor memory summaries where supported
- Reset mentor memory
- Request deletion of mentor memory
- Start a fresh mentoring experience

Resetting mentor memory may reduce personalization quality until sufficient new interactions occur.

=================================================================
7. MARKETING COMMUNICATIONS
=================================================================

Users may opt out of:

- Marketing emails
- Promotional announcements
- Non-essential communications

Users cannot opt out of essential service communications, including:

- Security notices
- Password reset communications
- Account notifications
- Legal notices
- Service-related alerts

=================================================================
8. DATA ACCESS REQUESTS
=================================================================

Users may request access to information associated with their account.

Examples include:

- Profile information
- Assessment history
- Communication records
- Communication DNA profiles
- Progress history
- Mentor interactions

VA may require reasonable verification before fulfilling requests.

=================================================================
9. DATA EXPORT REQUESTS
=================================================================

Users may request an export of their information.

Available exports may include:

- Profile data
- Assessment history
- Mentor conversations
- Progress records
- Communication DNA profiles
- Account information

Exports may be provided in a structured digital format.

VA reserves the right to verify identity before providing data exports.

=================================================================
10. ACCOUNT DELETION REQUESTS
=================================================================

Users may request deletion of their account at any time.

Deletion requests may be initiated through:

- Account settings
- Privacy requests
- Contacting support

Account deletion generally results in:

- Loss of platform access
- Deletion of associated profile information
- Removal of coaching data
- Removal of Communication DNA data
- Removal of mentor memory data

Subject to applicable legal and operational requirements.

=================================================================
11. DELETION PROCESS
=================================================================

Upon receiving a deletion request:

STEP 1

Request verification.

STEP 2

Account access may be restricted.

STEP 3

Deletion process begins.

STEP 4

Platform records are scheduled for deletion.

STEP 5

Deletion confirmation may be provided.

Processing timelines may vary depending on system requirements and legal obligations.

=================================================================
12. INFORMATION THAT MAY BE RETAINED
=================================================================

Certain information may be retained despite deletion requests where permitted or required by law.

Examples may include:

- Security logs
- Fraud prevention records
- Legal compliance records
- Backup data awaiting deletion cycles
- Regulatory recordkeeping obligations

Retained information will not be used for coaching or personalization purposes.

=================================================================
13. BACKUPS AND ARCHIVES
=================================================================

Deleted information may temporarily remain in backup systems.

Such information:

- Is not actively used.
- Is protected by security controls.
- Is removed during normal backup rotation schedules.

Retention periods may vary depending on operational requirements.

=================================================================
14. WITHDRAWAL OF CONSENT
=================================================================

Users may withdraw consent for certain types of processing.

Examples include:

- Voice processing
- Marketing communications
- Optional personalization features

Withdrawal of consent may limit functionality of certain platform features.

Withdrawal does not affect processing conducted before consent was withdrawn.

=================================================================
15. RESTRICTION OF PROCESSING
=================================================================

Where permitted by applicable law, users may request limitations on certain processing activities.

VA will evaluate such requests on a case-by-case basis in accordance with:

- Legal obligations
- Security requirements
- Platform functionality

=================================================================
16. CORRECTION OF INFORMATION
=================================================================

Users may request correction of inaccurate or incomplete personal information.

Users are encouraged to maintain current and accurate profile information.

=================================================================
17. DATA SECURITY DURING REQUESTS
=================================================================

To protect personal information, VA may require identity verification before:

- Data exports
- Data correction requests
- Data deletion requests
- Privacy preference changes

Requests that cannot be adequately verified may be denied for security reasons.

=================================================================
18. RESPONSE TIMES
=================================================================

VA will make reasonable efforts to respond to privacy-related requests within applicable legal timeframes.

Response times may vary depending on:

- Request complexity
- Volume of requests
- Verification requirements
- Legal obligations

=================================================================
19. CHANGES TO THIS POLICY
=================================================================

VA may update this Privacy Preferences and Data Deletion Policy periodically.

Updated versions will be published with a revised "Last Updated" date.

Continued use of the Service following any effective update constitutes acknowledgment of the revised Policy.

=================================================================
20. CONTACT INFORMATION
=================================================================

For privacy requests or questions regarding this Policy, contact:

VA (Vocal + Acuity)

Privacy Team

Email: privacy@yourdomain.com

Legal Contact: legal@yourdomain.com

Website: https://yourdomain.com

=================================================================
END OF PRIVACY PREFERENCES AND DATA DELETION POLICY
=================================================================
`;

export default function Page() {
  return <LegalDocument title="Privacy Preferences and Data Deletion Policy" content={CONTENT} />;
}
