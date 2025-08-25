-- Migration: Add customer_name to course_enrollments for certificate generation
-- Date: 2025-08-25
-- Purpose: Store the name provided at enrollment time for certificates and reporting

-- Step 1: Add the column (allows NULL initially for safe migration)
ALTER TABLE course_enrollments 
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

-- Step 2: Create an index for faster lookups (since this will be displayed in reports)
CREATE INDEX IF NOT EXISTS idx_course_enrollments_customer_name 
ON course_enrollments(customer_name);

-- Step 3: Backfill existing enrollments with best available name
-- This is a best-effort approach that won't fail if data is missing
UPDATE course_enrollments ce
SET customer_name = COALESCE(
    -- First try: Get name from invitation if this was an invited enrollment
    (SELECT ci.invitee_name 
     FROM course_invitations ci 
     WHERE ci.course_id = ce.course_id 
     AND ci.accepted_by = ce.user_id  -- Fixed: use accepted_by instead of accepted_by_user_id
     AND ci.invitee_name IS NOT NULL
     LIMIT 1),
    
    -- Second try: Get name from user's personal account
    (SELECT a.name 
     FROM accounts a 
     WHERE a.id = ce.user_id
     AND a.is_personal_account = true
     AND a.name IS NOT NULL
     LIMIT 1),
    
    -- Third try: Get email from auth.users and extract username
    (SELECT SPLIT_PART(au.email, '@', 1)
     FROM auth.users au
     WHERE au.id = ce.user_id
     AND au.email IS NOT NULL
     LIMIT 1),
    
    -- Last resort: Honest default
    'Name Not Recorded'
)
WHERE customer_name IS NULL;

-- Step 4: Update the process_course_purchase_by_slug function to accept customer_name
CREATE OR REPLACE FUNCTION process_course_purchase_by_slug(
    p_course_slug text,
    p_account_id uuid,
    p_payment_id text,
    p_quantity integer DEFAULT 1,
    p_customer_name text DEFAULT NULL
) RETURNS json AS $$
DECLARE
    course_record record;
    seat_record record;
    enrollment_record record;
    result json;
BEGIN
    -- Find the course by slug
    SELECT * INTO course_record
    FROM courses
    WHERE slug = p_course_slug
    LIMIT 1;
    
    IF course_record IS NULL THEN
        RAISE EXCEPTION 'Course not found with slug: %', p_course_slug;
    END IF;
    
    -- Find or create a seat purchase for this account and course
    INSERT INTO course_seats (
        course_id,
        account_id,
        seats_purchased,
        seats_used,
        purchase_type,
        payment_id
    )
    VALUES (
        course_record.id,
        p_account_id,
        p_quantity,
        0,
        'paid',
        p_payment_id
    )
    ON CONFLICT (course_id, account_id) DO UPDATE
    SET 
        seats_purchased = course_seats.seats_purchased + p_quantity,
        updated_at = NOW()
    RETURNING * INTO seat_record;
    
    -- Check if enrollment exists
    SELECT * INTO enrollment_record
    FROM course_enrollments
    WHERE user_id = p_account_id
    AND course_id = course_record.id;
    
    -- If no enrollment exists and this is a personal purchase (quantity = 1), create enrollment
    IF enrollment_record IS NULL AND p_quantity = 1 THEN
        INSERT INTO course_enrollments (
            user_id,
            course_id,
            account_id,
            enrollment_type,
            enrolled_at,
            customer_name  -- NEW: Store the customer name
        )
        VALUES (
            p_account_id,
            course_record.id,
            p_account_id,
            'purchased',
            NOW(),
            p_customer_name  -- NEW: Use the provided name
        )
        ON CONFLICT (user_id, course_id) DO NOTHING
        RETURNING * INTO enrollment_record;
    END IF;
    
    -- Build result
    result := json_build_object(
        'success', true,
        'course_id', course_record.id,
        'course_title', course_record.title,
        'seats_purchased', seat_record.seats_purchased,
        'seats_used', seat_record.seats_used,
        'enrolled', (enrollment_record IS NOT NULL)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update invitation acceptance to copy invitee_name to customer_name
-- This ensures invited users get their name from the invitation
CREATE OR REPLACE FUNCTION update_enrollment_name_from_invitation()
RETURNS TRIGGER AS $$
BEGIN
    -- When an invitation is accepted, update the enrollment with the invitee name
    IF NEW.accepted_at IS NOT NULL AND OLD.accepted_at IS NULL AND NEW.invitee_name IS NOT NULL THEN
        UPDATE course_enrollments
        SET customer_name = NEW.invitee_name
        WHERE user_id = NEW.accepted_by  -- Fixed: use accepted_by
        AND course_id = NEW.course_id
        AND (customer_name IS NULL OR customer_name = 'Name Not Recorded');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for invitation acceptance
DROP TRIGGER IF EXISTS update_enrollment_name_on_invitation_accept ON course_invitations;
CREATE TRIGGER update_enrollment_name_on_invitation_accept
AFTER UPDATE ON course_invitations
FOR EACH ROW
EXECUTE FUNCTION update_enrollment_name_from_invitation();

-- Step 6: Add a comment explaining the field
COMMENT ON COLUMN course_enrollments.customer_name IS 'The name provided at enrollment time, used for certificates and reporting. This is immutable enrollment metadata, not a user profile field.';

-- Verification: Check that the migration worked
DO $$
DECLARE
    total_enrollments integer;
    named_enrollments integer;
    unnamed_enrollments integer;
    backfill_percentage numeric;
BEGIN
    SELECT COUNT(*) INTO total_enrollments FROM course_enrollments;
    SELECT COUNT(*) INTO named_enrollments FROM course_enrollments WHERE customer_name IS NOT NULL AND customer_name != 'Name Not Recorded';
    SELECT COUNT(*) INTO unnamed_enrollments FROM course_enrollments WHERE customer_name = 'Name Not Recorded' OR customer_name IS NULL;
    
    IF total_enrollments > 0 THEN
        backfill_percentage := (named_enrollments::numeric / total_enrollments::numeric) * 100;
        RAISE NOTICE 'Migration complete:';
        RAISE NOTICE '  Total enrollments: %', total_enrollments;
        RAISE NOTICE '  With real names: % (%.1f%%)', named_enrollments, backfill_percentage;
        RAISE NOTICE '  Without names: %', unnamed_enrollments;
    ELSE
        RAISE NOTICE 'No enrollments found in the database';
    END IF;
END $$;

-- Let's also check what we got
SELECT 
    user_id,
    customer_name,
    enrollment_type,
    enrolled_at
FROM course_enrollments
ORDER BY enrolled_at DESC
LIMIT 10;