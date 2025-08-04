/**
 * Evergreen Comply Billing Configuration
 * This file defines the billing plans and pricing for compliance training courses
 */
import { BillingProviderSchema, createBillingSchema } from '@kit/billing';

// The billing provider to use. This should be set in the environment variables
// and should match the provider in the database.
const provider = BillingProviderSchema.parse(
  process.env.NEXT_PUBLIC_BILLING_PROVIDER,
);

export default createBillingSchema({
  provider,
  // products configuration for compliance training
  products: [
    {
      id: 'dot-hazmat',
      name: 'DOT HAZMAT Training',
      description: 'Complete DOT HAZMAT compliance training with certification',
      currency: 'USD',
      badge: 'Most Popular',
      highlighted: true,
      plans: [
        {
          name: 'DOT HAZMAT License',
          id: 'dot-hazmat-individual',
          paymentType: 'one-time',
          lineItems: [
            {
              id: 'price_1RsDQh97cNCBYOcXZBML0Cwf', // DOT HAZMAT General
              name: 'Training License',
              cost: 1.00,
              type: 'flat' as const,
            },
          ],
        },
      ],
      features: [
        'Complete DOT HAZMAT certification',
        'Interactive video lessons',
        'Downloadable resources',
        'Certificate of completion',
        'Lifetime access',
        '24/7 support',
      ],
    },
    {
      id: 'advanced-hazmat',
      name: 'Advanced HAZMAT Training',
      description: 'Advanced HAZMAT training for specialized operations',
      currency: 'USD',
      plans: [
        {
          name: 'Advanced HAZMAT License',
          id: 'advanced-hazmat-individual',
          paymentType: 'one-time',
          lineItems: [
            {
              id: 'price_1RsDev97cNCBYOcX008NiFR8', // HAZMAT Advanced
              name: 'Training License',
              cost: 1.00,
              type: 'flat' as const,
            },
          ],
        },
      ],
      features: [
        'Advanced HAZMAT procedures',
        'Emergency response training',
        'Specialized equipment handling',
        'Advanced certification',
        'Quarterly updates',
        'Priority support',
      ],
    },
    {
      id: 'epa-rcra',
      name: 'EPA RCRA Training',
      description: 'EPA Resource Conservation and Recovery Act compliance training',
      currency: 'USD',
      plans: [
        {
          name: 'EPA RCRA License',
          id: 'epa-rcra-individual',
          paymentType: 'one-time',
          lineItems: [
            {
              id: 'price_1RsDf697cNCBYOcXkMlo2mPt', // EPA RCRA
              name: 'Training License',
              cost: 1.00,
              type: 'flat' as const,
            },
          ],
        },
      ],
      features: [
        'EPA RCRA compliance certification',
        'Waste management procedures',
        'Regulatory compliance updates',
        'Documentation templates',
        'Annual refresher access',
        'Expert consultation included',
      ],
    },
  ],
});