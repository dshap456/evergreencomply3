-- URGENT: Run this SQL in your Supabase SQL Editor immediately!
-- This fixes the critical bug preventing team purchases from working

-- Step 1: Add missing columns to course_seats table
ALTER TABLE course_seats 
ADD COLUMN IF NOT EXISTS seats_purchased INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS seats_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS purchase_type TEXT DEFAULT 'paid',
ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- Step 2: Migrate existing data
UPDATE course_seats 
SET seats_purchased = total_seats 
WHERE seats_purchased IS NULL OR seats_purchased = 0;

-- Step 3: Verify the fix worked
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'course_seats'
ORDER BY ordinal_position;

-- You should now see:
-- id, account_id, course_id, total_seats, created_at, updated_at, 
-- created_by, updated_by, seats_purchased, seats_used, purchase_type, payment_id