# Resend Domain Verification Instructions

## Current Issue
The contact form is failing because Resend is reporting that the `evergreencomply.com` domain is not verified. The exact error is:

```
The evergreencomply.com domain is not verified. Please, add and verify your domain on https://resend.com/domains
```

## Steps to Fix

1. **Log into Resend Dashboard**
   - Go to https://resend.com/domains
   - Sign in with your account

2. **Check Domain Status**
   - Look for `evergreencomply.com` in your domains list
   - Check if it shows as "Verified" or "Pending"

3. **If Domain is Not Listed or Pending:**
   - Click "Add Domain"
   - Enter `evergreencomply.com`
   - Follow the DNS verification steps provided by Resend
   - This typically involves adding TXT records to your domain's DNS

4. **If Domain Shows as Verified:**
   - There might be an issue with the API key permissions
   - Try generating a new API key with full permissions
   - Update the `RESEND_API_KEY` in your `.env.local` file

## Temporary Workaround

While you verify the domain, you can temporarily switch back to using your Gmail address:

1. Update `.env.local`:
   ```
   EMAIL_SENDER=delivered@resend.dev
   CONTACT_EMAIL=david.alan.shapiro@gmail.com
   ```

2. This will allow the contact form to work while you resolve the domain verification.

## After Domain Verification

Once the domain is verified in Resend:

1. Update `.env.local`:
   ```
   EMAIL_SENDER=support@evergreencomply.com
   CONTACT_EMAIL=support@evergreencomply.com
   ```

2. Deploy to production with updated environment variables

## Note
The error is coming directly from Resend's API, so the domain must be properly verified in their system before emails can be sent from/to addresses using that domain.