-- CRITICAL FIX: The course_seats table columns don't match what the function expects
-- This is why team purchases aren't creating seats!

-- First, check if the missing columns exist (they shouldn't)
DO $$ 
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'course_seats' AND column_name = 'seats_purchased') THEN
        ALTER TABLE course_seats ADD COLUMN seats_purchased INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'course_seats' AND column_name = 'seats_used') THEN
        ALTER TABLE course_seats ADD COLUMN seats_used INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'course_seats' AND column_name = 'purchase_type') THEN
        ALTER TABLE course_seats ADD COLUMN purchase_type TEXT DEFAULT 'paid';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'course_seats' AND column_name = 'payment_id') THEN
        ALTER TABLE course_seats ADD COLUMN payment_id TEXT;
    END IF;
END $$;

-- Migrate existing data from total_seats to seats_purchased
UPDATE course_seats 
SET seats_purchased = total_seats 
WHERE seats_purchased IS NULL OR seats_purchased = 0;

-- Now the existing function should work!
-- But let's also create a better version that handles both column sets
CREATE OR REPLACE FUNCTION public.process_course_purchase_by_slug(
    p_course_slug text,
    p_account_id uuid,
    p_payment_id text,
    p_quantity integer DEFAULT 1,
    p_customer_name text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    course_record record;
    account_record record;
    seat_record record;
    enrollment_record record;
    result json;
    is_team_purchase boolean;
BEGIN
    -- Find the course by slug
    SELECT * INTO course_record
    FROM courses
    WHERE slug = p_course_slug
    LIMIT 1;

    IF course_record IS NULL THEN
        RAISE EXCEPTION 'Course not found with slug: %', p_course_slug;
    END IF;

    -- Check if this is a team account
    SELECT * INTO account_record
    FROM accounts
    WHERE id = p_account_id;

    IF account_record IS NULL THEN
        RAISE EXCEPTION 'Account not found: %', p_account_id;
    END IF;

    is_team_purchase := NOT account_record.is_personal_account;

    -- Handle course seats (for both team and personal purchases now)
    -- Use the new columns structure
    INSERT INTO course_seats (
        course_id,
        account_id,
        seats_purchased,
        seats_used,
        total_seats,  -- Keep both for compatibility
        purchase_type,
        payment_id,
        created_at,
        updated_at
    )
    VALUES (
        course_record.id,
        p_account_id,
        p_quantity,
        0,
        p_quantity,  -- Set total_seats same as seats_purchased
        'paid',
        p_payment_id,
        NOW(),
        NOW()
    )
    ON CONFLICT (course_id, account_id) DO UPDATE
    SET
        seats_purchased = course_seats.seats_purchased + p_quantity,
        total_seats = course_seats.total_seats + p_quantity,
        payment_id = p_payment_id,
        updated_at = NOW()
    RETURNING * INTO seat_record;

    -- For individual purchases (personal account + 1 seat), also create enrollment
    IF account_record.is_personal_account AND p_quantity = 1 THEN
        -- Check if enrollment already exists
        SELECT * INTO enrollment_record
        FROM course_enrollments
        WHERE user_id = p_account_id  -- For personal accounts, account_id = user_id
        AND course_id = course_record.id;

        -- Create enrollment if it doesn't exist
        IF enrollment_record IS NULL THEN
            INSERT INTO course_enrollments (
                user_id,
                course_id,
                account_id,
                enrolled_at,
                customer_name
            )
            VALUES (
                p_account_id,  -- For personal accounts, this is the user ID
                course_record.id,
                p_account_id,  -- Same as user_id for personal accounts
                NOW(),
                p_customer_name
            )
            ON CONFLICT (user_id, course_id) DO NOTHING
            RETURNING * INTO enrollment_record;
        END IF;
    END IF;

    -- Build result
    result := json_build_object(
        'success', true,
        'type', CASE WHEN is_team_purchase THEN 'team_purchase' ELSE 'individual_purchase' END,
        'course_id', course_record.id,
        'course_title', course_record.title,
        'seats_purchased', seat_record.seats_purchased,
        'total_seats', seat_record.total_seats,
        'seats_used', seat_record.seats_used,
        'enrolled', (enrollment_record IS NOT NULL),
        'account_type', CASE WHEN account_record.is_personal_account THEN 'personal' ELSE 'team' END
    );

    RETURN result;
END;
$function$;