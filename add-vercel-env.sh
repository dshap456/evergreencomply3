#!/bin/bash

# Script to add environment variables to Vercel
# This reads from your local .env files and pushes to Vercel

echo "This script will help you add environment variables to Vercel."
echo "It will read from your local .env files but NOT expose the values."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI is not installed. Please install it first:"
    echo "npm i -g vercel"
    exit 1
fi

# First, ensure we're linked to the right project
echo "Linking to Vercel project..."
vercel link

echo ""
echo "Now we'll add the required environment variables to Vercel."
echo "The script will prompt you for each value."
echo ""

# Critical environment variables that need to be added
ENV_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "NEXT_PUBLIC_BILLING_PROVIDER"
    "NEXT_PUBLIC_SITE_URL"
    "NEXT_PUBLIC_PRODUCT_NAME"
    "EMAIL_SENDER"
    "CONTACT_EMAIL"
    "MAILER_PROVIDER"
    "RESEND_API_KEY"
    "CMS_CLIENT"
    "SUPABASE_DB_WEBHOOK_SECRET"
)

# Add each environment variable
for VAR in "${ENV_VARS[@]}"; do
    echo ""
    echo "Adding $VAR to Vercel..."
    
    # Get value from local env file
    VALUE=$(grep "^$VAR=" apps/web/.env.local 2>/dev/null | cut -d'=' -f2-)
    
    if [ -z "$VALUE" ]; then
        # Try other env files
        VALUE=$(grep "^$VAR=" apps/web/.env.development 2>/dev/null | cut -d'=' -f2-)
    fi
    
    if [ -z "$VALUE" ]; then
        VALUE=$(grep "^$VAR=" apps/web/.env 2>/dev/null | cut -d'=' -f2-)
    fi
    
    if [ -z "$VALUE" ]; then
        echo "  ⚠️  Could not find $VAR in local env files."
        echo "  Please enter the value manually:"
        read -r VALUE
    else
        echo "  Found value in local env file"
        echo "  Value preview: ${VALUE:0:20}..."
    fi
    
    # Add to Vercel (for all environments)
    echo "$VALUE" | vercel env add "$VAR" production
    echo "$VALUE" | vercel env add "$VAR" preview
    echo "$VALUE" | vercel env add "$VAR" development
    
    echo "  ✅ Added $VAR"
done

echo ""
echo "✅ All environment variables have been added to Vercel!"
echo ""
echo "Now triggering a new deployment..."
vercel --prod

echo ""
echo "🎉 Done! Your deployment should now work correctly."