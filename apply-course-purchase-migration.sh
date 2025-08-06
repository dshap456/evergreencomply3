#!/bin/bash

# Apply Course Purchase Integration Migration
# This script applies the database migration for course purchase integration

echo "🚀 Applying Course Purchase Integration Migration..."

# Stop Supabase if running
echo "Stopping Supabase..."
pnpm supabase:web:stop

# Start Supabase
echo "Starting Supabase..."
pnpm supabase:web:start

# Wait for Supabase to be ready
echo "Waiting for Supabase to be ready..."
sleep 10

# Reset database with new migration
echo "Resetting database with new migration..."
pnpm supabase:web:reset

# Generate TypeScript types
echo "Generating TypeScript types..."
pnpm supabase:web:typegen

echo "✅ Migration applied successfully!"
echo ""
echo "Next steps:"
echo "1. Update the billing configuration in apps/web/config/billing.config.ts"
echo "2. Ensure your Stripe webhook is configured in the Stripe dashboard"
echo "3. Test the purchase flow with both individual and team accounts"
echo ""
echo "For more information, see docs/COURSE_PURCHASE_INTEGRATION.md"