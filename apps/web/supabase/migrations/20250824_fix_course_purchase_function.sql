-- Fix the process_course_purchase_by_slug function
-- The created_by and updated_by fields should be NULL for webhook purchases
-- since we don't have the user context, only the account ID

CREATE OR REPLACE FUNCTION public.process_course_purchase_by_slug(
    p_course_slug TEXT,
    p_account_id UUID,
    p_payment_id TEXT,
    p_quantity INTEGER DEFAULT 1
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_course RECORD;
    v_is_team_account BOOLEAN;
    v_result JSONB;
BEGIN
    -- Find course by slug
    SELECT id, title, price
    INTO v_course
    FROM public.courses
    WHERE slug = p_course_slug;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format('Course not found with slug: %s', p_course_slug)
        );
    END IF;
    
    -- Check if this is a team account
    SELECT NOT is_personal_account INTO v_is_team_account
    FROM public.accounts
    WHERE id = p_account_id;
    
    IF v_is_team_account THEN
        -- For team accounts, create or update course seats
        INSERT INTO public.course_seats (
            account_id,
            course_id,
            total_seats,
            created_by,
            updated_by
        ) VALUES (
            p_account_id,
            v_course.id,
            p_quantity,
            NULL,  -- No user context from webhook
            NULL   -- No user context from webhook
        )
        ON CONFLICT (account_id, course_id) DO UPDATE
        SET total_seats = course_seats.total_seats + EXCLUDED.total_seats,
            updated_at = NOW();
        
        v_result := jsonb_build_object(
            'success', true,
            'type', 'team_seats',
            'course_id', v_course.id,
            'course_title', v_course.title,
            'seats_added', p_quantity,
            'message', format('%s seats added for %s', p_quantity, v_course.title)
        );
    ELSE
        -- For individual accounts, create enrollment directly
        INSERT INTO public.course_enrollments (
            user_id,
            course_id,
            enrolled_at,
            progress_percentage
        ) VALUES (
            p_account_id, -- For personal accounts, account_id = user_id
            v_course.id,
            NOW(),
            0
        )
        ON CONFLICT (user_id, course_id) DO NOTHING;
        
        v_result := jsonb_build_object(
            'success', true,
            'type', 'individual_enrollment',
            'course_id', v_course.id,
            'course_title', v_course.title,
            'message', format('Enrolled in %s', v_course.title)
        );
    END IF;
    
    -- Log the purchase
    RAISE LOG 'Course purchase processed: % for account % (payment: %)', 
              v_course.title, p_account_id, p_payment_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.process_course_purchase_by_slug(TEXT, UUID, TEXT, INTEGER) TO service_role;