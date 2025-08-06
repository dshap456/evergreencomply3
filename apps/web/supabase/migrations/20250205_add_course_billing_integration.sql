-- Add billing integration to courses
-- This migration links courses to billing products and handles purchase-based access

-- 1. Add billing_product_id to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS billing_product_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS requires_purchase BOOLEAN GENERATED ALWAYS AS (price > 0) STORED;

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_courses_billing_product_id ON public.courses(billing_product_id);

-- 2. Function to check if user has access to a paid course
CREATE OR REPLACE FUNCTION public.has_course_access(
    p_user_id UUID,
    p_course_id UUID
) RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_course RECORD;
    v_user_account_id UUID;
    v_has_enrollment BOOLEAN;
    v_has_seat BOOLEAN;
    v_has_order BOOLEAN;
BEGIN
    -- Get course details
    SELECT id, price, billing_product_id, requires_purchase 
    INTO v_course
    FROM public.courses
    WHERE id = p_course_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- If course is free, allow access
    IF NOT v_course.requires_purchase THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user is already enrolled
    SELECT EXISTS(
        SELECT 1 FROM public.course_enrollments
        WHERE user_id = p_user_id AND course_id = p_course_id
    ) INTO v_has_enrollment;
    
    IF v_has_enrollment THEN
        RETURN TRUE;
    END IF;
    
    -- Get user's personal account ID
    SELECT id INTO v_user_account_id
    FROM public.accounts
    WHERE id = p_user_id AND is_personal_account = true;
    
    -- Check if user has a direct purchase (individual)
    IF v_course.billing_product_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 
            FROM public.orders o
            JOIN public.order_items oi ON o.id = oi.order_id
            WHERE o.account_id = v_user_account_id
            AND o.status = 'succeeded'
            AND oi.product_id = v_course.billing_product_id
        ) INTO v_has_order;
        
        IF v_has_order THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    -- Check if user has access through team seats
    SELECT EXISTS(
        SELECT 1 
        FROM public.course_seats cs
        JOIN public.accounts_memberships am ON cs.account_id = am.account_id
        WHERE am.user_id = p_user_id
        AND cs.course_id = p_course_id
        AND public.get_available_course_seats(cs.account_id, cs.course_id) > 0
    ) INTO v_has_seat;
    
    RETURN v_has_seat;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to process course purchase and grant access
CREATE OR REPLACE FUNCTION public.process_course_purchase(
    p_order_id TEXT,
    p_account_id UUID,
    p_product_id TEXT,
    p_quantity INTEGER DEFAULT 1
) RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_course RECORD;
    v_is_team_account BOOLEAN;
    v_result JSONB;
BEGIN
    -- Find course by billing product ID
    SELECT id, title, price
    INTO v_course
    FROM public.courses
    WHERE billing_product_id = p_product_id;
    
    IF NOT FOUND THEN
        -- Not a course product, return success without processing
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Product is not a course'
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
            p_account_id, -- Using account_id as created_by for webhook context
            p_account_id
        )
        ON CONFLICT (account_id, course_id) DO UPDATE
        SET total_seats = course_seats.total_seats + EXCLUDED.total_seats,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by;
        
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
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.has_course_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_course_purchase(TEXT, UUID, TEXT, INTEGER) TO service_role;

-- 4. Update existing course data with billing product IDs
-- This maps the courses to their corresponding Stripe product IDs
UPDATE public.courses 
SET billing_product_id = 'dot-hazmat'
WHERE sku = 'DOT-HAZMAT-001' OR LOWER(title) LIKE '%dot%hazmat%';

UPDATE public.courses 
SET billing_product_id = 'advanced-hazmat'
WHERE sku = 'ADV-HAZMAT-001' OR LOWER(title) LIKE '%advanced%hazmat%';

UPDATE public.courses 
SET billing_product_id = 'epa-rcra'
WHERE sku = 'EPA-RCRA-001' OR LOWER(title) LIKE '%epa%rcra%';