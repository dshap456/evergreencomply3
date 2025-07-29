#!/bin/bash

# Script to fix the course invitation bug by running migrations

echo "🚀 Starting migration process to fix course invitations..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Navigate to the project root
cd "$SCRIPT_DIR"

# Navigate to the web app directory
cd apps/web

# Step 1: Check if Supabase is running
echo "1️⃣ Checking Supabase status..."
if npx supabase status; then
    echo "✅ Supabase is already running"
else
    echo "⚠️  Supabase is not running. Starting Supabase..."
    echo "   This might take a few minutes if Docker images need to be downloaded..."
    npx supabase start
    
    if [ $? -eq 0 ]; then
        echo "✅ Supabase started successfully"
    else
        echo "❌ Failed to start Supabase. Please ensure Docker is running and try again."
        exit 1
    fi
fi

echo ""
echo "2️⃣ Running database migrations..."
echo "   This will create the course_invitations and course_seats tables..."

# Run migrations without resetting (preserves data)
npx supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully"
else
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi

echo ""
echo "3️⃣ Regenerating TypeScript types..."

# Go back to root directory for pnpm commands
cd ../..

# Regenerate types
pnpm supabase:web:typegen

if [ $? -eq 0 ]; then
    echo "✅ TypeScript types regenerated successfully"
else
    echo "⚠️  Type generation had issues, but continuing..."
fi

echo ""
echo "✨ Migration process complete!"
echo ""
echo "Next steps:"
echo "1. Restart your development server: pnpm dev"
echo "2. Try the course invitation feature again"
echo ""
echo "The following tables should now exist:"
echo "- course_invitations"
echo "- course_seats"