# Fix Instructions for Course Invitation Bug

## Problem
The course seat management feature is failing with a 500 error because the required database tables (`course_invitations` and `course_seats`) don't exist.

## Solution Steps

1. **Start Supabase** (if not already running):
   ```bash
   pnpm supabase:web:start
   ```

2. **Run the database migrations**:
   ```bash
   pnpm supabase:web:reset
   ```
   
   This will:
   - Reset the database
   - Run all migrations including `20250128_add_course_seat_management.sql`
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