-- Fix the process_course_purchase_by_slug function to handle team purchases correctly
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

    -- If this is a team account (not personal), handle seats
    IF account_record.is_personal_account = false THEN
        -- Create or update course seats for team
        INSERT INTO course_seats (
            course_id,
            account_id,
            total_seats,
            created_at,
            updated_at
        )
        VALUES (
            course_record.id,
            p_account_id,  -- This is the team account ID
            p_quantity,
            NOW(),
            NOW()
        )
        ON CONFLICT (course_id, account_id) DO UPDATE
        SET
            total_seats = course_seats.total_seats + p_quantity,
            updated_at = NOW()
        RETURNING * INTO seat_record;

        -- Build result for team purchase
        result := json_build_object(
            'success', true,
            'type', 'team_purchase',
            'course_id', course_record.id,
            'course_title', course_record.title,
            'total_seats', seat_record.total_seats,
            'seats_added', p_quantity,
            'team_account_id', p_account_id
        );

    ELSE
        -- For personal accounts, create enrollment
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

        -- Build result for individual purchase
        result := json_build_object(
            'success', true,
            'type', 'individual_enrollment',
            'course_id', course_record.id,
            'course_title', course_record.title,
            'enrolled', (enrollment_record IS NOT NULL),
            'user_id', p_account_id
        );
    END IF;

    RETURN result;
END;
$function$;