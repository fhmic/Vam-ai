import { LegalDocument } from "@/components/legal/legal-document";

const CONTENT = `
ENTERPRISE DATA PROCESSING AGREEMENT (DPA)

Effective Date: [Insert Date]

Last Updated: [Insert Date]

This Data Processing Agreement ("DPA") forms part of and supplements any agreement, subscription, order form, master service agreement, or other arrangement governing the use of VA (Vocal + Acuity) by an organization ("Customer").

This DPA governs the processing of Personal Data by VA when providing services to Customer.

=================================================================
1. PARTIES
=================================================================

This DPA is entered into between:

Customer:
The organization, company, institution, or entity subscribing to or using VA services.

Processor:
VA (Vocal + Acuity)

Together referred to as the "Parties."

=================================================================
2. DEFINITIONS
=================================================================

For purposes of this DPA:

"Personal Data" means any information relating to an identified or identifiable individual.

"Data Subject" means the individual to whom Personal Data relates.

"Processing" means any operation performed on Personal Data, including collection, storage, analysis, transmission, use, disclosure, deletion, or destruction.

"Controller" means the entity determining the purposes and means of processing Personal Data.

"Processor" means the entity processing Personal Data on behalf of the Controller.

"Applicable Data Protection Laws" means all applicable privacy, security, and data protection laws governing the processing of Personal Data.

=================================================================
3. RELATIONSHIP OF THE PARTIES
=================================================================

Customer acts as the Data Controller.

VA acts as the Data Processor.

Customer determines:

- Why Personal Data is processed.
- Which individuals use the platform.
- How the platform is deployed within the organization.

VA processes Personal Data only for providing and supporting the Services.

=================================================================
4. PURPOSE OF PROCESSING
=================================================================

VA may process Personal Data solely to:

- Provide communication coaching services.
- Deliver mentor functionality.
- Generate assessments.
- Provide communication analytics.
- Support role-play functions.
- Maintain user accounts.
- Provide customer support.
- Maintain platform functionality.
- Ensure platform security.
- Comply with legal obligations.

VA shall not process Personal Data for purposes unrelated to providing the Services unless otherwise authorized by Customer or required by law.

=================================================================
5. CATEGORIES OF DATA SUBJECTS
=================================================================

Data Subjects may include:

- Employees
- Managers
- Executives
- Consultants
- Contractors
- Students
- Learners
- Authorized Customer users
- Other individuals designated by Customer

=================================================================
6. TYPES OF PERSONAL DATA
=================================================================

Depending on Customer implementation, VA may process:

A. ACCOUNT DATA

- Name
- Email address
- Username
- Profile information

B. PROFESSIONAL DATA

- Job title
- Department
- Communication goals
- Learning preferences

C. COMMUNICATION DATA

- Text conversations
- Mentor interactions
- Assessment responses
- Role-play interactions

D. VOICE DATA

- Voice recordings
- Speech transcripts
- Voice assessment information

E. SYSTEM DATA

- Login information
- Device information
- Usage activity
- IP addresses
- Platform logs

=================================================================
7. CUSTOMER INSTRUCTIONS
=================================================================

VA shall process Personal Data only:

- In accordance with Customer instructions.
- In accordance with the agreement between the Parties.
- As required by applicable law.

Customer is responsible for ensuring its instructions comply with applicable laws.

=================================================================
8. CONFIDENTIALITY
=================================================================

VA shall maintain appropriate confidentiality obligations regarding Personal Data.

Personnel authorized to process Personal Data shall:

- Be subject to confidentiality obligations.
- Receive appropriate privacy and security training.
- Access Personal Data only where necessary for service delivery.

=================================================================
9. SECURITY MEASURES
=================================================================

VA shall implement reasonable technical and organizational safeguards, including where appropriate:

- Encryption in transit
- Encryption at rest
- Access controls
- Authentication mechanisms
- Logging and monitoring
- Role-based permissions
- Security reviews
- Secure cloud infrastructure

Security measures shall be designed to protect Personal Data against unauthorized access, disclosure, alteration, or destruction.

=================================================================
10. SUBPROCESSORS
=================================================================

Customer acknowledges that VA may engage subprocessors to support service delivery.

Examples may include:

- Cloud infrastructure providers
- Authentication providers
- Storage providers
- Analytics providers
- AI processing providers
- Monitoring and security providers

VA shall:

- Exercise reasonable care when selecting subprocessors.
- Maintain appropriate agreements with subprocessors.
- Require subprocessors to protect Personal Data appropriately.

=================================================================
11. INTERNATIONAL DATA TRANSFERS
=================================================================

Personal Data may be processed in jurisdictions outside Customer's country.

Where applicable, VA will implement reasonable safeguards designed to protect Personal Data during international transfers.

Customer acknowledges that global cloud infrastructure may result in international processing of Personal Data.

=================================================================
12. ASSISTANCE TO CUSTOMER
=================================================================

VA shall provide reasonable assistance to Customer regarding:

- Data subject requests
- Privacy inquiries
- Security incidents
- Regulatory requests
- Compliance obligations

Such assistance may be subject to reasonable operational and cost limitations.

=================================================================
13. DATA SUBJECT RIGHTS
=================================================================

Where applicable, VA shall assist Customer in responding to requests involving:

- Data access
- Data correction
- Data portability
- Data deletion
- Restriction of processing
- Objections to processing

Customer remains responsible for responding to Data Subjects as Controller.

=================================================================
14. SECURITY INCIDENTS
=================================================================

VA shall maintain procedures for detecting and responding to security incidents.

Where required by applicable law or contractual obligation, VA shall notify Customer of confirmed security incidents involving Personal Data within a commercially reasonable time after becoming aware of the incident.

Notification shall include information reasonably available at the time.

=================================================================
15. AUDITS AND ASSESSMENTS
=================================================================

Upon reasonable written request, VA may provide information regarding its privacy and security practices.

Customer agrees that:

- Requests shall be reasonable in scope.
- Requests shall not compromise the security of other customers.
- Requests shall not require disclosure of proprietary information.

Independent audit reports or security documentation may satisfy audit requirements where available.

=================================================================
16. DATA RETENTION
=================================================================

VA shall retain Personal Data only for as long as reasonably necessary to provide the Services or comply with applicable legal obligations.

Retention periods may vary depending on:

- Contractual requirements
- Legal requirements
- Security requirements
- Operational requirements

=================================================================
17. DELETION AND RETURN OF DATA
=================================================================

Upon termination of Services or Customer request, and subject to applicable legal requirements, VA shall:

- Delete Personal Data; or
- Return Personal Data to Customer where technically feasible.

Backup systems may retain data temporarily until normal deletion cycles are completed.

=================================================================
18. AI PROCESSING
=================================================================

Customer acknowledges that VA uses artificial intelligence to provide functionality including:

- Communication coaching
- Assessments
- Communication analysis
- Communication DNA generation
- Mentor responses

AI-generated outputs may be derived from Personal Data submitted by authorized users.

VA shall process such data solely to provide and improve the contracted Services.

=================================================================
19. LIMITATION OF LIABILITY
=================================================================

The liability of each Party under this DPA shall be governed by the liability provisions contained in the primary agreement between the Parties.

Nothing in this DPA shall create separate liability obligations beyond those established in the governing agreement unless required by applicable law.

=================================================================
20. TERM AND TERMINATION
=================================================================

This DPA remains in effect for as long as VA processes Personal Data on behalf of Customer.

Obligations that by their nature should survive termination shall continue after termination of the underlying agreement.

=================================================================
21. GOVERNING LAW
=================================================================

This DPA shall be governed by the governing law provisions specified in the applicable agreement between the Parties.

Where no such provision exists, the governing law shall be:

The laws of the Federal Republic of Nigeria.

=================================================================
22. CONTACT INFORMATION
=================================================================

For questions regarding this DPA, privacy, security, or enterprise compliance matters, contact:

VA (Vocal + Acuity)

Privacy Team

Email: privacy@yourdomain.com

Security Contact: security@yourdomain.com

Legal Contact: legal@yourdomain.com

Website: https://yourdomain.com

=================================================================
END OF ENTERPRISE DATA PROCESSING AGREEMENT
=================================================================
`;

export default function Page() {
  return <LegalDocument title="Enterprise Data Processing Agreement (DPA)" content={CONTENT} />;
}
