# Detailed Stripe Webhook Setup Guide

## Prerequisites
- Access to your Stripe Dashboard
- Your production URL (e.g., https://www.evergreencomply.com)
- Access to your hosting platform (Vercel) to add environment variables

## Step-by-Step Webhook Creation

### 1. Access Stripe Dashboard
1. Go to https://dashboard.stripe.com
2. Log in with your Stripe account credentials
3. Make sure you're in the correct mode (Test or Live) - toggle is in the top right

### 2. Navigate to Webhooks
1. In the left sidebar, look for **Developers** section
2. Click on **Webhooks**
3. You'll see a page titled "Webhooks" with any existing endpoints listed

### 3. Create New Endpoint
1. Click the **"Add endpoint"** button (usually in the top right)
2. You'll see a form with several fields

### 4. Configure Endpoint URL
In the **"Endpoint URL"** field, enter:
```
https://www.evergreencomply.com/api/billing/webhook
```

**Important**: 
- Make sure there are no trailing slashes
- Use HTTPS (not HTTP)
- Replace `www.evergreencomply.com` with your actual domain if different

### 5. Select Events to Listen To
1. Click **"Select events"** button
2. You'll see a list of all available Stripe events
3. Search for and select these specific events:

**Essential Events:**
- ✅ `checkout.session.completed` - Primary event for course purchases
- ✅ `checkout.session.expired` - Handle expired sessions
- ✅ `checkout.session.async_payment_succeeded` - For delayed payments

**Optional but Recommended:**
- ✅ `payment_intent.succeeded` - Backup for successful payments
- ✅ `payment_intent.payment_failed` - Track failed payments
- ✅ `invoice.paid` - For subscription-based courses
- ✅ `invoice.payment_failed` - Track failed subscription payments
- ✅ `customer.subscription.created` - If using subscriptions
- ✅ `customer.subscription.updated` - Track subscription changes
- ✅ `customer.subscription.deleted` - Handle cancellations

4. Click **"Add events"** when done selecting

### 6. Additional Settings (Optional)
- **Description**: Add something like "Course purchase webhook for Evergreen Comply"
- **Metadata**: Leave empty unless you need specific tracking
- **API Version**: Leave as default (Stripe handles versioning)

### 7. Create the Endpoint
1. Review your settings
2. Click **"Add endpoint"** button at the bottom
3. You'll be redirected to the endpoint details page

### 8. Get the Signing Secret
**This is critical - don't skip this step!**

1. On the endpoint details page, look for **"Signing secret"**
2. Click **"Reveal"** or the eye icon
3. You'll see a secret that starts with `whsec_`
4. **Copy this entire string** - you'll need it for the next step

Example signing secret:
```
whsec_8a7sd6f87a6sdf876asdf876asdf8a7s6df8a7s6df
```

### 9. Add Signing Secret to Vercel

#### Option A: Via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Add:
   - **Key**: `STRIPE_WEBHOOK_SECRET`
   - **Value**: [Paste the whsec_ secret you copied]
   - **Environment**: Select "Production" (and optionally "Preview")
6. Click **"Save"**

#### Option B: Via Vercel CLI
```bash
vercel env add STRIPE_WEBHOOK_SECRET production
# Paste the secret when prompted
```

### 10. Redeploy Your Application
After adding the environment variable:
1. Go to your Vercel project dashboard
2. Go to **Deployments**
3. Click the three dots on the latest deployment
4. Select **"Redeploy"**
5. Click **"Redeploy"** in the modal

## Testing Your Webhook

### 1. Test Mode Testing (Recommended First)
If you created the webhook in Test mode:
1. Use Stripe test cards: https://stripe.com/docs/testing
2. Make a test purchase
3. Check webhook attempts in Stripe Dashboard

### 2. Check Webhook Logs
1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click on your endpoint
3. Scroll down to **"Webhook attempts"**
4. You should see attempts listed with:
   - ✅ Success (200 response)
   - ❌ Failed (any other response)

### 3. Debug Failed Attempts
If you see failed attempts:
1. Click on the failed attempt
2. Check the **Response** tab to see error details
3. Common issues:
   - 401: Missing or incorrect signing secret
   - 404: Wrong endpoint URL
   - 500: Server error (check Vercel logs)

### 4. View Vercel Function Logs
1. Go to your Vercel project
2. Click on **Functions** tab
3. Find `api/billing/webhook`
4. Click to see real-time logs
5. You can also use Vercel CLI: `vercel logs --follow`

## Local Development Testing

### 1. Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (using scoop)
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Linux
# Download from https://github.com/stripe/stripe-cli/releases
```

### 2. Login to Stripe
```bash
stripe login
# Follow the browser prompt
```

### 3. Forward Webhooks Locally
```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

You'll see output like:
```
Ready! Your webhook signing secret is whsec_test_1234... (^C to quit)
```

### 4. Add to Local Environment
Add to `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_test_1234...
```

### 5. Trigger Test Events
In another terminal:
```bash
# Test a successful checkout
stripe trigger checkout.session.completed

# Test with custom data
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.type=training-purchase \
  --add checkout_session:client_reference_id=test-user-123
```

## Troubleshooting

### Webhook Not Receiving Events
1. **Check URL**: Ensure no typos and using HTTPS
2. **Check deployment**: Make sure latest code is deployed
3. **Check logs**: Look at Vercel function logs

### Signature Verification Failing
1. **Check secret**: Ensure `STRIPE_WEBHOOK_SECRET` is set correctly
2. **Check environment**: Make sure using production secret for production
3. **No modifications**: Don't modify the request body before verification

### Events Not Processing
1. **Check metadata**: Ensure checkout sessions have `type: 'training-purchase'`
2. **Check mapping**: Verify price IDs match your code mapping
3. **Check database**: Ensure `process_course_purchase` function exists

### Testing Checklist
- [ ] Webhook created in Stripe Dashboard
- [ ] Signing secret copied
- [ ] Environment variable added to Vercel
- [ ] Application redeployed
- [ ] Test purchase completed
- [ ] Webhook logs show success (200)
- [ ] Database shows new enrollment

## Quick Test Script

Once webhook is set up, test with this curl command:
```bash
# Get your endpoint's signing secret first
WEBHOOK_SECRET="whsec_your_secret_here"
TIMESTAMP=$(date +%s)
PAYLOAD='{"type":"checkout.session.completed","data":{"object":{"id":"test_123","metadata":{"type":"training-purchase"},"client_reference_id":"your-user-id"}}}'

# This is just for manual testing - Stripe CLI is better
curl -X POST https://www.evergreencomply.com/api/billing/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=$TIMESTAMP,v1=test" \
  -d "$PAYLOAD"
```

## Security Notes

1. **Never commit secrets**: The `whsec_` secret should never be in your code
2. **Use environment variables**: Always load from `process.env`
3. **Verify signatures**: Never skip signature verification
4. **Use HTTPS**: Webhooks should only use HTTPS endpoints
5. **Validate data**: Always validate the webhook payload data

## Next Steps

After successful setup:
1. Monitor webhook health in Stripe Dashboard
2. Set up alerts for failed webhooks
3. Consider implementing retry logic for failed enrollments
4. Add logging for successful course purchases