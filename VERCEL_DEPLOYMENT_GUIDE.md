# Vercel Deployment Guide for Next-Supabase-SaaS-Kit-Turbo

## Pre-deployment Checklist

1. **vercel.json** has been created in the root directory
2. Make sure you have a Supabase project set up
3. Have your Stripe account ready (if using billing features)

## Required Environment Variables

Add these environment variables in your Vercel project settings:

### Essential Variables (Required)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://your-deployed-site.vercel.app
```

### Billing Configuration (Required if using billing)

```bash
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

### Email Configuration (Required for email functionality)

```bash
# Choose one email provider:
MAILER_PROVIDER=nodemailer  # or 'resend'

# If using Nodemailer:
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_SENDER=your-email@gmail.com

# If using Resend:
RESEND_API_KEY=your_resend_api_key
```

### Optional Configuration

```bash
# Monitoring (optional)
NEXT_PUBLIC_MONITORING_PROVIDER=sentry  # or 'baselime'
SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_auth_token

# CAPTCHA (optional)
NEXT_PUBLIC_CAPTCHA_SITE_KEY=your_captcha_site_key
CAPTCHA_SECRET_KEY=your_captcha_secret_key

# Feature Flags (optional - defaults are set)
NEXT_PUBLIC_ENABLE_THEME_TOGGLE=true
NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_DELETION=true
NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_BILLING=true
NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_DELETION=true
NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_BILLING=true
NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS=true
NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_CREATION=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
NEXT_PUBLIC_REALTIME_NOTIFICATIONS=false

# Additional Settings
ENABLE_REACT_COMPILER=false  # Keep this false for stability
```

## Deployment Steps

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Add Vercel configuration"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel should automatically detect the `vercel.json` configuration

3. **Configure Environment Variables**
   - In Vercel project settings, go to "Environment Variables"
   - Add all required variables listed above
   - Make sure to add them for Production, Preview, and Development environments as needed

4. **Deploy**
   - Click "Deploy"
   - The build command will automatically be: `pnpm turbo build --filter=web`
   - The output directory is set to: `apps/web/.next`

## Post-Deployment Setup

1. **Update Supabase**
   - Add your Vercel deployment URL to Supabase's allowed redirect URLs
   - Update the Site URL in Supabase Authentication settings

2. **Configure Stripe Webhooks (if using billing)**
   - Create a webhook endpoint in Stripe pointing to: `https://your-site.vercel.app/api/billing/webhook`
   - Update `STRIPE_WEBHOOK_SECRET` with the webhook signing secret

3. **Test Critical Paths**
   - User registration/login
   - Team creation (if enabled)
   - Billing flows (if enabled)

## Troubleshooting

### Common Issues

1. **404 Errors**
   - Make sure the `outputDirectory` in `vercel.json` is set to `apps/web/.next`
   - Verify all environment variables are set correctly

2. **Build Failures**
   - Check that all required environment variables are present
   - Ensure Node.js version compatibility (requires >=18.18.0)
   - Try setting `ENABLE_REACT_COMPILER=false`

3. **Authentication Issues**
   - Verify `NEXT_PUBLIC_SITE_URL` matches your Vercel deployment URL
   - Check Supabase redirect URLs configuration

4. **Database Connection Issues**
   - Ensure Supabase service role key is correct
   - Check if your Supabase project is active

### Build Command Details

The build process uses Turborepo to build only the web app:
```bash
pnpm turbo build --filter=web
```

This ensures only the necessary parts of the monorepo are built for deployment.

## Notes

- This project uses pnpm as the package manager
- It's a Turborepo monorepo with the main web app in `apps/web`
- The dev-tool app (port 3010) is not deployed to production
- Make sure to keep your environment variables secure and never commit them to git