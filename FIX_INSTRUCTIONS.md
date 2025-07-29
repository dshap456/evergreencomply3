# Fix Instructions for Course Invitation Bug

## Problem Summary
The course seat management feature is failing with a 500 error when team owners try to invite users to courses.

### Root Causes Identified:
1. **Missing Database Tables**: The required tables (`course_invitations` and `course_seats`) don't exist in the database
2. **Wrong Server Action**: The UI was using a simplified action without proper validation (already fixed)

### Investigation Details:
- The migration file exists: `apps/web/supabase/migrations/20250128_add_course_seat_management.sql`
- TypeScript types don't include these tables, confirming migrations haven't been run
- The 500 error occurs because the code tries to query non-existent tables

## Solution Steps

1. **Start Supabase** (if not already running):
   ```bash
   pnpm supabase:web:start
   ```

2. **Run the database migrations**:
   
   **Option A - Reset database (if you don't have important data):**
   ```bash
   pnpm supabase:web:reset
   ```
   
   **Option B - Run migrations without reset (preserves data):**
   ```bash
   cd apps/web
   pnpm supabase db push
   ```
   
   Either option will:
   - Run all pending migrations including `20250128_add_course_seat_management.sql`
   - Create the missing `course_invitations` and `course_seats` tables

3. **Regenerate TypeScript types**:
   ```bash
   pnpm supabase:web:typegen
   ```

4. **Restart your development server**:
   ```bash
   pnpm dev
   ```

## What We Fixed in Code
We already fixed the code to use the correct server action (`inviteToCourseAction` instead of `inviteToCourseActionSimple`), which includes proper validation for:
- Seat availability checking
- Duplicate invitation prevention
- Proper error handling

## Verification
After running these commands, the seat management feature should work correctly. Team owners will be able to invite users to courses without errors.

## Important Note
If you're deploying to production, you'll need to run the migration on your production database as well.