-- Fix the course purchase stored procedure to be idempotent
-- This prevents duplicate processing when webhooks fire multiple times

CREATE OR REPLACE FUNCTION process_course_purchase_by_slug(
    p_course_slug TEXT,
    p_account_id UUID,
    p_payment_id TEXT,
    p_quantity INT DEFAULT 1,
    p_customer_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    course_record record;
    seat_record record;
    enrollment_record record;
    existing_payment record;
    result json;
BEGIN
    -- CRITICAL: Check if this payment has already been processed
    -- This makes the function idempotent
    SELECT * INTO existing_payment
    FROM course_seats
    WHERE payment_id = p_payment_id
    LIMIT 1;
    
    IF existing_payment IS NOT NULL THEN
        -- Payment already processed, return success without doing anything
        RAISE NOTICE 'Payment % already processed for course seats', p_payment_id;
        
        result := json_build_object(
            'success', true,
            'message', 'Payment already processed',
            'course_id', existing_payment.course_id,
            'seats_purchased', existing_payment.seats_purchased,
            'duplicate_prevented', true
        );
        
        RETURN result;
    END IF;

    -- Find the course by slug
    SELECT * INTO course_record
    FROM courses
    WHERE slug = p_course_slug
    LIMIT 1;

    IF course_record IS NULL THEN
        RAISE EXCEPTION 'Course not found with slug: %', p_course_slug;
    END IF;

    -- Create a NEW seat purchase for this account and course
    -- Since we already checked for duplicate payment_id above, this is safe
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
    RETURNING * INTO seat_record;

    -- Check if enrollment exists for individual purchases
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
            enrolled_at,
            customer_name
        )
        VALUES (
            p_account_id,
            course_record.id,
            p_account_id,
            NOW(),
            p_customer_name
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
        'enrolled', (enrollment_record IS NOT NULL),
        'payment_id', p_payment_id
    );

    RAISE NOTICE 'Successfully processed payment % for % seats of course %', 
                 p_payment_id, p_quantity, course_record.title;

    RETURN result;
END;
$$;