# Debugging Webhook Issues

## Steps to Check:

### 1. In Stripe Dashboard
1. Go to https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint (should show the URL you configured)
3. Look at "Webhook attempts" section
4. Check for:
   - Response code (should be 200 for success)
   - If 404: The endpoint isn't deployed yet
   - If 400/500: There's an error in the webhook handler

### 2. Check Vercel Deployment
1. Go to https://vercel.com/dashboard
2. Select your project
3. Check if the latest deployment is complete
4. Click on the deployment to see if `/api/billing/webhook` is listed

### 3. Quick Fix for Your Purchase
While waiting for webhook to work, you can manually create the enrollment:

```bash
# Replace with your actual email
curl -X POST https://www.evergreencomply.com/api/quick-fix-enrollment \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "your-email@example.com",
    "courseSlug": "advanced-hazmat"
  }'
```

### 4. Common Webhook Issues

**Issue: 404 Not Found**
- The webhook code hasn't deployed yet
- Wrong URL in Stripe (check for typos)
- Missing `/api` in the path

**Issue: 401 Unauthorized**
- Missing `STRIPE_WEBHOOK_SECRET` in environment variables
- Wrong webhook secret (test vs production)

**Issue: 400 Bad Request**
- Webhook signature verification failing
- Make sure you're using the correct webhook secret

**Issue: 500 Internal Server Error**
- Check Vercel function logs
- Database function might be missing
- Permission issues with database

### 5. Test the Webhook Manually

Once deployed, you can test if the endpoint exists:
```bash
# Should return 400 (because no signature) but proves endpoint exists
curl -X POST https://www.evergreencomply.com/api/billing/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 6. Check What's in Your Database

To see if any enrollments exist:
```bash
curl https://www.evergreencomply.com/api/test-course-purchase
```

This will show:
- Your user ID
- Available courses
- Your current enrollments

## Next Steps

1. **Check Stripe webhook logs** - This will tell you exactly what's happening
2. **Wait for deployment** - If you just pushed code, it takes 1-2 minutes
3. **Use quick fix** - Create the enrollment manually for now
4. **Test another purchase** - Once webhook is working, test with another $1 purchase