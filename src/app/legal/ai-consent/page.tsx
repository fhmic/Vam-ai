import { LegalDocument } from "@/components/legal/legal-document";

const CONTENT = `
AI AND VOICE PROCESSING CONSENT

Effective Date: [Insert Date]

Last Updated: [Insert Date]

This AI and Voice Processing Consent explains how VA (Vocal + Acuity) uses artificial intelligence, voice technologies, communication analysis systems, mentoring systems, and related technologies when you use the Service.

By using VA and enabling voice features, you acknowledge, understand, and consent to the practices described in this notice.

=================================================================
1. PURPOSE OF THIS NOTICE
=================================================================

VA is an AI-powered Corporate Communication Development Platform designed to help users improve:

- Professional communication
- Executive presence
- Leadership communication
- Strategic thinking
- Presentation effectiveness
- Interview performance
- Communication confidence
- Communication intelligence

To provide these services, VA utilizes artificial intelligence technologies and voice-processing technologies.

=================================================================
2. ARTIFICIAL INTELLIGENCE USE
=================================================================

VA uses artificial intelligence systems to:

- Generate mentor responses
- Conduct communication coaching
- Create communication assessments
- Generate personalized recommendations
- Produce Communication DNA profiles
- Analyze communication patterns
- Generate progress insights
- Personalize learning experiences

Artificial intelligence is a core component of the platform.

By using VA, you consent to the processing of your submitted information through artificial intelligence systems.

=================================================================
3. IMPORTANT AI DISCLOSURE
`;

export default function Page() {
  return <LegalDocument title="AI and Voice Processing Consent" content={CONTENT} />;
}
