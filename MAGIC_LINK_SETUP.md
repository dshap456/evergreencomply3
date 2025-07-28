# Magic Link Authentication Setup

## 1. Environment Variables

Add these to your `.env` file locally and in Vercel's environment variables:

```env
# Disable password auth, enable magic link
NEXT_PUBLIC_AUTH_PASSWORD=false
NEXT_PUBLIC_AUTH_MAGIC_LINK=true
NEXT_PUBLIC_AUTH_OTP=false
```

## 2. Supabase Configuration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication → Providers**
4. Under **Email**:
   - Ensure "Enable Email provider" is ON
   - Ensure "Confirm email" is ON

## 3. Email Template (Optional)

1. In Supabase: **Authentication → Email Templates → Magic Link**
2. Customize the template:

```html
<h2>Sign in to Evergreen Comply</h2>
<p>Click the link below to sign in to your Evergreen Comply account:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request this, please ignore this email.</p>
```

## 4. Update Auth Text (Optional)

In `/apps/web/public/locales/en/auth.json`, update:

```json
{
  "signInHeading": "Sign in to your account",
  "signInSubheading": "Enter your email to receive a sign-in link",
  "emailPlaceholder": "Enter your email",
  "sendMagicLink": "Send sign-in link",
  "magicLinkSent": "Check your email for the sign-in link!",
  "checkYourEmail": "We've sent you a sign-in link. Please check your email."
}
```

## 5. Testing

1. Start your local dev server
2. Go to `/auth/sign-in`
3. Enter your email
4. Check your email for the magic link
5. Click the link to sign in

## Benefits

- No passwords to remember
- More secure (no password leaks)
- Better user experience
- Works great on mobile

## Notes

- Magic links expire after 1 hour by default
- Users need access to their email to sign in
- Consider keeping OAuth (Google) as an alternative option