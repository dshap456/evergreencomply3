# Resend Domain Setup for Production

## Current Issue
The contact form is currently limited to sending emails only to david.alan.shapiro@gmail.com due to Resend's security restrictions for unverified domains.

## To Enable support@evergreencomply.com

### Step 1: Add Domain to Resend
1. Log in to your Resend account at https://resend.com
2. Navigate to https://resend.com/domains
3. Click "Add Domain"
4. Enter `evergreencomply.com`

### Step 2: Add DNS Records
Resend will provide you with DNS records to add to your domain. These typically include:

1. **SPF Record** (TXT)
   - Name: `@` or blank
   - Value: `v=spf1 include:_spf.resend.com ~all`

2. **DKIM Records** (CNAME)
   - Multiple CNAME records for email authentication
   - Follow Resend's exact instructions

3. **DMARC Record** (TXT) - Optional but recommended
   - Name: `_dmarc`
   - Value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@evergreencomply.com`

### Step 3: Verify Domain
1. After adding DNS records, click "Verify Domain" in Resend
2. Wait for DNS propagation (usually 5-30 minutes)
3. Once verified, the domain status will show as "Verified"

### Step 4: Update Email Configuration
Once domain is verified:

1. Update `.env.local`:
   ```
   EMAIL_SENDER=support@evergreencomply.com
   CONTACT_EMAIL=support@evergreencomply.com
   ```

2. Update production environment variables in Vercel:
   - `EMAIL_SENDER`: support@evergreencomply.com
   - `CONTACT_EMAIL`: support@evergreencomply.com

## Temporary Solution (Currently Active)
- Contact form sends to: david.alan.shapiro@gmail.com
- You can set up email forwarding in Gmail to forward these to support@evergreencomply.com

## Testing After Domain Verification
```bash
# Test the contact form
curl -X POST http://localhost:3000/api/contact-form-submit \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "Test message after domain verification"
  }'
```

## Important Notes
- Without domain verification, Resend only allows sending to the account owner's email
- Domain verification is required for production use
- The process usually takes 15-30 minutes
- You can send from any email address @evergreencomply.com once verified