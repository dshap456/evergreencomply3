# Stripe Webhook Setup for Course Purchases

## Overview

This guide explains how to set up the Stripe webhook to automatically create course enrollments after successful purchases.

## The Problem

Currently, when a user purchases a course:
1. Payment is processed successfully via Stripe
2. But no enrollment is created in the database
3. User sees "Enroll Now" button instead of accessing the course
4. Clicking "Enroll Now" gives error: "This course requires purchase"

## The Solution

A webhook endpoint has been created at `/api/billing/webhook` that will:
1. Receive payment confirmation from Stripe
2. Call the `process_course_purchase` database function
3. Automatically create enrollments for purchased courses

## Setup Instructions

### 1. Local Development (using Stripe CLI)

```bash
# Install Stripe CLI if not already installed
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/billing/webhook

# Copy the webhook signing secret that appears, it will look like:
# whsec_1234567890abcdef...
```

Add the webhook secret to your `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 2. Production Setup (Stripe Dashboard)

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set the endpoint URL: `https://www.evergreencomply.com/api/billing/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `invoice.paid`
5. Click "Add endpoint"
6. Copy the "Signing secret" and add to your production environment variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_production_secret_here
   ```

### 3. Vercel Environment Variables

Add the webhook secret to Vercel:
```bash
vercel env add STRIPE_WEBHOOK_SECRET
# Choose "Production" environment
# Paste the webhook secret
```

## Testing

### Test the webhook locally:

```bash
# Create a test checkout session
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.type=training-purchase \
  --add checkout_session:client_reference_id=your-user-id
```

### Manual test in production:

1. Purchase a course
2. Check the database to verify enrollment was created:
   ```sql
   SELECT * FROM course_enrollments 
   WHERE user_id = 'your-user-id' 
   ORDER BY enrolled_at DESC;
   ```

## Troubleshooting

### Check webhook logs in Stripe Dashboard
1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your endpoint
3. View "Webhook attempts" to see successes/failures

### Common issues:

1. **403 Error**: Webhook secret is missing or incorrect
2. **404 Error**: Endpoint URL is wrong
3. **500 Error**: Check Vercel function logs for database errors

### Debug endpoint

A test endpoint is available at `/api/test-course-purchase`:
- GET: Shows current courses and enrollments
- POST: Manually creates a test enrollment

## How It Works

1. User purchases course via Stripe Checkout
2. Stripe sends `checkout.session.completed` event to webhook
3. Webhook verifies the signature and checks metadata
4. For training purchases, it extracts:
   - Product ID from price mapping
   - Account ID from `client_reference_id`
   - Quantity from line items
5. Calls `process_course_purchase` database function
6. Function creates enrollment for individual users or seats for teams

## Price to Product Mapping

The webhook uses this mapping to identify courses:
```typescript
const COURSE_PRODUCT_MAPPING = {
  'price_1RsDQh97cNCBYOcXZBML0Cwf': 'dot-hazmat',
  'price_1RsDev97cNCBYOcX008NiFR8': 'advanced-hazmat',
  'price_1RsDf697cNCBYOcXkMlo2mPt': 'epa-rcra',
  'price_1S5Cnq97cNCBYOcXYjFFdmEm': 'dot-hazmat',
  'price_1S5CnD97cNCBYOcX4ehVBpo6': 'advanced-hazmat',
  'price_1S5CmP97cNCBYOcXEKzqDOJs': 'epa-rcra',
};
```

Ensure database courses have matching `billing_product_id` values.
