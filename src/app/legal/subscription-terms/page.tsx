import { LegalDocument } from "@/components/legal/legal-document";

const CONTENT = `
SUBSCRIPTION AND BILLING TERMS

Effective Date: [Insert Date]

Last Updated: [Insert Date]

These Subscription and Billing Terms ("Billing Terms") govern the purchase, renewal, cancellation, and use of paid subscriptions offered by VA (Vocal + Acuity).

These Billing Terms supplement the VA Terms of Service and apply whenever a user purchases or subscribes to a paid service, plan, feature, or offering provided by VA.

By purchasing a subscription, you agree to these Billing Terms.

=================================================================
1. OVERVIEW
=================================================================

VA may offer:

- Free Plans
- Premium Plans
- Enterprise Plans
- Promotional Plans
- Trial Plans

Features, limits, pricing, and benefits may vary between plans.

Current plan details will be displayed at the time of purchase.

=================================================================
2. SUBSCRIPTION SERVICES
=================================================================

Paid subscriptions may provide access to:

- Advanced AI mentoring
- Extended voice coaching
- Enhanced assessments
- Premium Communication DNA insights
- Advanced role-play experiences
- Expanded storage and history
- Priority access to new features
- Premium support

Feature availability may vary by subscription level.

=================================================================
3. BILLING CYCLE
=================================================================

Subscriptions may be offered as:

- Monthly subscriptions
- Quarterly subscriptions
- Annual subscriptions
- Enterprise agreements
- Promotional subscriptions

Billing frequency will be disclosed before purchase.

=================================================================
4. AUTOMATIC RENEWAL
=================================================================

Unless otherwise stated, paid subscriptions automatically renew at the end of each billing period.

By purchasing a subscription, you authorize VA to automatically charge the applicable subscription fee using your selected payment method until the subscription is cancelled.

Subscription renewal occurs automatically unless cancelled before the next renewal date.

=================================================================
5. PAYMENT METHODS
=================================================================

VA may accept various payment methods including:

- Credit cards
- Debit cards
- Digital wallets
- Bank transfers
- Other approved payment methods

Users are responsible for maintaining valid and current payment information.

=================================================================
6. PRICING
=================================================================

Subscription pricing will be displayed at the time of purchase.

Prices may vary based on:

- Plan type
- Geography
- Promotional offers
- Enterprise agreements
- Applicable taxes

VA reserves the right to modify pricing in accordance with Section 17 of these Terms.

=================================================================
7. FREE TRIALS
=================================================================

VA may offer free trials from time to time.

Unless otherwise stated:

- Free trial eligibility is determined by VA.
- Free trials are provided for evaluation purposes only.
- Users may be required to provide payment information before trial activation.
- Paid billing may begin automatically when the trial period ends unless cancelled beforehand.

Specific trial terms will be disclosed at the time of enrollment.

=================================================================
8. PROMOTIONAL OFFERS
=================================================================

VA may occasionally offer:

- Discounted pricing
- Introductory offers
- Coupons
- Referral incentives
- Promotional credits

Promotional offers:

- May be subject to eligibility requirements.
- May be limited in duration.
- May not be combined unless expressly permitted.

=================================================================
9. TAXES
=================================================================

Users are responsible for any taxes applicable to their subscription.

Where required by law, VA may collect:

- VAT
- GST
- Sales taxes
- Digital services taxes
- Similar taxes or regulatory fees

Displayed pricing may or may not include taxes depending on local requirements.

=================================================================
10. CANCELLATION
=================================================================

Users may cancel their subscription at any time.

Cancellation generally prevents future renewal charges.

Unless otherwise required by law:

- Cancellation does not immediately terminate access.
- Paid features remain available until the end of the current billing period.
- No additional renewals will occur after cancellation.

=================================================================
11. REFUNDS
=================================================================

Except where required by applicable law, subscription payments are generally non-refundable.

Refunds may be considered under limited circumstances, including:

- Duplicate charges
- Technical billing errors
- Unauthorized transactions
- Legal obligations requiring refunds

Refund requests may be evaluated on a case-by-case basis.

=================================================================
12. FAILED PAYMENTS
=================================================================

If payment cannot be successfully processed:

VA may:

- Retry the payment.
- Notify the user.
- Restrict premium features.
- Downgrade the account.
- Suspend premium access until payment is successfully processed.

Users remain responsible for charges owed under active subscriptions.

=================================================================
13. ACCOUNT DOWNGRADES
=================================================================

When a subscription expires, is cancelled, or is terminated:

The account may be downgraded to a lower plan.

Downgraded accounts may experience:

- Reduced features
- Usage limitations
- Storage limitations
- AI usage limitations
- Restricted coaching functionality

User-generated data will generally remain accessible unless otherwise specified.

=================================================================
14. ENTERPRISE CUSTOMERS
=================================================================

Enterprise subscriptions may be governed by:

- Separate agreements
- Master service agreements
- Order forms
- Custom pricing schedules

Where a separate agreement exists, that agreement shall govern any conflicts relating to enterprise services.

=================================================================
15. SUBSCRIPTION CHANGES
=================================================================

VA may add, modify, remove, or update subscription features from time to time.

Changes may occur due to:

- Product development
- Feature improvements
- Security requirements
- Technical changes
- Business requirements

VA will make reasonable efforts to communicate material changes.

=================================================================
16. ABUSE OF SUBSCRIPTION SERVICES
=================================================================

Users may not:

- Share paid accounts improperly.
- Circumvent usage limits.
- Exploit pricing errors.
- Abuse promotional offers.
- Resell subscription access without authorization.

VA reserves the right to suspend or terminate accounts engaged in such activities.

=================================================================
17. PRICE CHANGES
=================================================================

VA may update subscription pricing periodically.

If pricing changes affect an active subscription:

- Reasonable notice will be provided where required.
- Future renewals may occur at the updated rate.
- Users may cancel before renewal if they do not accept the updated pricing.

Price changes do not generally affect charges already paid.

=================================================================
18. TERMINATION OF SUBSCRIPTIONS
=================================================================

VA may suspend or terminate subscriptions when:

- Payments remain overdue.
- Fraud is suspected.
- Terms are violated.
- Required by law.
- Platform security is threatened.

Termination may result in the loss of access to premium features.

=================================================================
19. LIMITATION OF LIABILITY
=================================================================

To the fullest extent permitted by law, VA shall not be liable for:

- Subscription interruptions
- Loss of subscription benefits
- Payment processing delays
- Third-party billing issues
- Service outages
- Loss of expected business benefits

User remedies are limited to those expressly provided by applicable law.

=================================================================
20. CHANGES TO THESE BILLING TERMS
=================================================================

VA may update these Billing Terms from time to time.

Updated versions will be published with a revised "Last Updated" date.

Continued use of paid services after changes become effective constitutes acceptance of the revised Billing Terms.

=================================================================
21. CONTACT INFORMATION
=================================================================

For billing questions or subscription support, contact:

VA (Vocal + Acuity)

Billing Support

Email: billing@yourdomain.com

Legal Contact: legal@yourdomain.com

Website: https://yourdomain.com

=================================================================
END OF SUBSCRIPTION AND BILLING TERMS
=================================================================
`;

export default function Page() {
  return <LegalDocument title="Subscription and Billing Terms" content={CONTENT} />;
}
