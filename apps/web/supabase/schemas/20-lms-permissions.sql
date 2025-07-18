/*
 * -------------------------------------------------------
 * Section: LMS Permissions and Roles
 * Extends the existing permission system for LMS functionality
 * Adds LMS-specific permissions and role assignments
 * -------------------------------------------------------
 */

-- Add LMS permissions to the app_permissions enum
-- Note: This requires dropping and recreating the enum in production
-- In development, this can be done directly

-- First, let's add the new permission values
-- This would typically be done in a separate migration for safety

-- For now, we'll create helper functions to check LMS permissions
-- until the enum can be safely updated

-- LMS Role Management Functions

-- Function to check if user can manage courses
CREATE OR REPLACE FUNCTION public.can_manage_courses(
    p_user_id UUID,
    p_account_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
BEGIN
    -- Super admins can manage all courses
    IF public.is_super_admin() THEN
        RETURN true;
    END IF;
    
    -- Account owners and members with settings.manage can manage courses
    RETURN public.has_permission(p_user_id, p_account_id, 'settings.manage'::public.app_permissions);
END;
$$;

-- Function to check if user can assign courses (Team Manager role)
CREATE OR REPLACE FUNCTION public.can_assign_courses(
    p_user_id UUID,
    p_account_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
BEGIN
    -- Super admins can assign courses
    IF public.is_super_admin() THEN
        RETURN true;
    END IF;
    
    -- Users who have purchased courses in this account can assign them
    RETURN EXISTS (
        SELECT 1 FROM public.course_purchases cp
        WHERE cp.account_id = p_account_id 
        AND cp.purchaser_user_id = p_user_id
    ) OR public.has_role_on_account(p_account_id);
END;
$$;

-- Function to check if user can view course reports
CREATE OR REPLACE FUNCTION public.can_view_course_reports(
    p_user_id UUID,
    p_account_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
BEGIN
    -- Super admins can view all reports
    IF public.is_super_admin() THEN
        RETURN true;
    END IF;
    
    -- Team managers (course purchasers) can view reports for their courses
    RETURN EXISTS (
        SELECT 1 FROM public.course_purchases cp
        WHERE cp.account_id = p_account_id 
        AND cp.purchaser_user_id = p_user_id
    ) OR public.has_role_on_account(p_account_id);
END;
$$;

-- Function to determine user's LMS role in an account
CREATE OR REPLACE FUNCTION public.get_user_lms_role(
    p_user_id UUID,
    p_account_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_role TEXT := 'learner';
    v_has_purchases BOOLEAN := false;
    v_purchase_count INTEGER := 0;
BEGIN
    -- Super admin always gets super_admin role
    IF public.is_super_admin() THEN
        RETURN 'super_admin';
    END IF;
    
    -- Check if user has made purchases in this account
    SELECT 
        COUNT(*) > 0,
        SUM(quantity)
    INTO v_has_purchases, v_purchase_count
    FROM public.course_purchases cp
    WHERE cp.account_id = p_account_id 
    AND cp.purchaser_user_id = p_user_id;
    
    -- Determine role based on purchase behavior
    IF v_has_purchases THEN
        IF v_purchase_count >= 2 THEN
            v_role := 'team_manager';
        ELSE
            -- Single purchase could still be team manager if they want
            -- Check if they've been assigned team manager role
            IF EXISTS (
                SELECT 1 FROM public.accounts_memberships am
                WHERE am.user_id = p_user_id 
                AND am.account_id = p_account_id
                AND am.account_role IN (
                    SELECT name FROM public.roles 
                    WHERE hierarchy_level <= 2 -- Owner or Admin level
                )
            ) THEN
                v_role := 'team_manager';
            ELSE
                v_role := 'learner';
            END IF;
        END IF;
    ELSE
        -- No purchases, check if they're assigned any courses
        IF EXISTS (
            SELECT 1 FROM public.course_licenses cl
            WHERE cl.assigned_user_id = p_user_id
            AND EXISTS (
                SELECT 1 FROM public.course_purchases cp
                WHERE cp.id = cl.purchase_id
                AND cp.account_id = p_account_id
            )
        ) THEN
            v_role := 'learner';
        END IF;
    END IF;
    
    RETURN v_role;
END;
$$;

-- Function to upgrade user to team manager
CREATE OR REPLACE FUNCTION public.upgrade_to_team_manager(
    p_user_id UUID,
    p_account_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_success BOOLEAN := false;
BEGIN
    -- Verify user has access to this account
    IF NOT (
        public.has_role_on_account(p_account_id) OR
        EXISTS (
            SELECT 1 FROM public.course_enrollments ce
            JOIN public.courses c ON c.id = ce.course_id
            WHERE c.account_id = p_account_id
            AND ce.user_id = p_user_id
        )
    ) THEN
        RETURN false;
    END IF;
    
    -- For now, we'll use the existing role system
    -- In a future version, this could create a specific team_manager role
    -- For now, just ensure they have appropriate access to manage assignments
    
    -- This is a placeholder - the actual implementation would depend on
    -- how you want to handle the role upgrade in your permission system
    v_success := true;
    
    RETURN v_success;
END;
$$;

-- Function to check course purchase eligibility for automatic role assignment
CREATE OR REPLACE FUNCTION public.assign_role_on_purchase(
    p_user_id UUID,
    p_account_id UUID,
    p_quantity INTEGER
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_assigned_role TEXT;
BEGIN
    -- Automatic role assignment based on purchase quantity
    IF p_quantity >= 2 THEN
        v_assigned_role := 'team_manager';
        
        -- Could add logic here to update user's role in the account
        -- For now, the role is determined dynamically by get_user_lms_role
        
    ELSE
        v_assigned_role := 'learner';
    END IF;
    
    RETURN v_assigned_role;
END;
$$;

-- Function to get user's effective permissions in LMS context
CREATE OR REPLACE FUNCTION public.get_lms_permissions(
    p_user_id UUID,
    p_account_id UUID
) RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_role TEXT;
    v_permissions TEXT[] := ARRAY[]::TEXT[];
BEGIN
    v_role := public.get_user_lms_role(p_user_id, p_account_id);
    
    CASE v_role
        WHEN 'super_admin' THEN
            v_permissions := ARRAY[
                'courses.manage',
                'courses.assign', 
                'courses.report',
                'courses.purchase',
                'users.manage',
                'system.admin'
            ];
        WHEN 'team_manager' THEN
            v_permissions := ARRAY[
                'courses.assign',
                'courses.report', 
                'courses.purchase'
            ];
        WHEN 'learner' THEN
            v_permissions := ARRAY[
                'courses.learn'
            ];
    END CASE;
    
    RETURN v_permissions;
END;
$$;

-- Grant execute permissions on LMS role functions
GRANT EXECUTE ON FUNCTION public.can_manage_courses(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_assign_courses(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_course_reports(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_lms_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upgrade_to_team_manager(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_role_on_purchase(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lms_permissions(UUID, UUID) TO authenticated;

-- Views for easier access to LMS data

-- View: User's LMS Dashboard Data
CREATE OR REPLACE VIEW public.user_lms_dashboard AS
SELECT 
    u.id as user_id,
    u.email,
    a.id as account_id,
    a.name as account_name,
    public.get_user_lms_role(u.id, a.id) as lms_role,
    (
        SELECT COUNT(*) 
        FROM public.course_enrollments ce 
        JOIN public.courses c ON c.id = ce.course_id
        WHERE ce.user_id = u.id 
        AND c.account_id = a.id
    ) as enrolled_courses_count,
    (
        SELECT COUNT(*) 
        FROM public.course_enrollments ce 
        JOIN public.courses c ON c.id = ce.course_id
        WHERE ce.user_id = u.id 
        AND c.account_id = a.id
        AND ce.completed_at IS NOT NULL
    ) as completed_courses_count,
    (
        SELECT COUNT(*)
        FROM public.course_purchases cp
        WHERE cp.purchaser_user_id = u.id
        AND cp.account_id = a.id
    ) as purchases_made,
    (
        SELECT COALESCE(SUM(quantity), 0)
        FROM public.course_purchases cp
        WHERE cp.purchaser_user_id = u.id
        AND cp.account_id = a.id
    ) as total_licenses_purchased
FROM auth.users u
CROSS JOIN public.accounts a
WHERE EXISTS (
    -- User has some relationship to this account
    SELECT 1 FROM public.course_enrollments ce
    JOIN public.courses c ON c.id = ce.course_id
    WHERE ce.user_id = u.id AND c.account_id = a.id
) OR EXISTS (
    SELECT 1 FROM public.course_purchases cp
    WHERE cp.purchaser_user_id = u.id AND cp.account_id = a.id
) OR public.has_role_on_account(a.id);

-- View: Team Manager Report Data
CREATE OR REPLACE VIEW public.team_manager_report AS
SELECT 
    cp.id as purchase_id,
    cp.account_id,
    cp.purchaser_user_id,
    c.title as course_name,
    c.sku as course_sku,
    cl.id as license_id,
    cl.status as license_status,
    au.email as assigned_user_email,
    COALESCE(au.raw_user_meta_data->>'name', au.email) as assigned_user_name,
    ce.enrolled_at,
    ce.completed_at,
    ce.progress_percentage,
    cc.final_quiz_score,
    cc.final_quiz_passed,
    cl.assigned_at
FROM public.course_purchases cp
JOIN public.courses c ON c.id = cp.course_id
JOIN public.course_licenses cl ON cl.purchase_id = cp.id
LEFT JOIN auth.users au ON au.id = cl.assigned_user_id
LEFT JOIN public.course_enrollments ce ON (
    ce.user_id = cl.assigned_user_id 
    AND ce.course_id = cp.course_id
)
LEFT JOIN public.course_completions cc ON (
    cc.user_id = cl.assigned_user_id 
    AND cc.course_id = cp.course_id
);

-- View: Super Admin Report Data
CREATE OR REPLACE VIEW public.super_admin_report AS
SELECT 
    a.id as account_id,
    a.name as account_name,
    c.id as course_id,
    c.title as course_name,
    c.sku as course_sku,
    cc.user_id,
    cc.student_name,
    cc.student_email,
    cc.final_quiz_score,
    cc.final_quiz_passed,
    cc.completed_at,
    cc.completion_percentage,
    cp.purchased_at,
    cp.purchaser_user_id,
    pu.email as purchaser_email
FROM public.course_completions cc
JOIN public.courses c ON c.id = cc.course_id
JOIN public.accounts a ON a.id = c.account_id
LEFT JOIN public.course_enrollments ce ON (
    ce.user_id = cc.user_id 
    AND ce.course_id = cc.course_id
)
LEFT JOIN public.course_licenses cl ON cl.id = ce.license_id
LEFT JOIN public.course_purchases cp ON cp.id = cl.purchase_id
LEFT JOIN auth.users pu ON pu.id = cp.purchaser_user_id;

-- RLS policies for views
CREATE POLICY "user_lms_dashboard_access" ON public.user_lms_dashboard FOR SELECT
    TO authenticated USING (
        user_id = auth.uid() OR
        public.has_role_on_account(account_id) OR
        public.is_super_admin()
    );

-- Note: The views will inherit RLS from their underlying tables automatically
-- Additional view-specific policies can be added if needed

-- Create helper function to initialize course purchase with licenses
CREATE OR REPLACE FUNCTION public.create_course_purchase_with_licenses(
    p_account_id UUID,
    p_purchaser_user_id UUID,
    p_course_id UUID,
    p_quantity INTEGER,
    p_unit_price DECIMAL,
    p_stripe_payment_intent_id VARCHAR DEFAULT NULL
) RETURNS public.course_purchases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_purchase public.course_purchases;
    v_current_version public.course_versions;
    i INTEGER;
BEGIN
    -- Get current course version
    v_current_version := public.get_current_course_version(p_course_id);
    
    -- Create purchase record
    INSERT INTO public.course_purchases (
        account_id,
        purchaser_user_id,
        course_id,
        stripe_payment_intent_id,
        purchase_type,
        quantity,
        unit_price,
        total_amount
    ) VALUES (
        p_account_id,
        p_purchaser_user_id,
        p_course_id,
        p_stripe_payment_intent_id,
        CASE WHEN p_quantity > 1 THEN 'bulk'::public.purchase_type ELSE 'individual'::public.purchase_type END,
        p_quantity,
        p_unit_price,
        p_unit_price * p_quantity
    ) RETURNING * INTO v_purchase;
    
    -- Create individual licenses
    FOR i IN 1..p_quantity LOOP
        INSERT INTO public.course_licenses (
            purchase_id,
            course_id,
            course_version_id,
            status
        ) VALUES (
            v_purchase.id,
            p_course_id,
            v_current_version.id,
            'available'
        );
    END LOOP;
    
    -- Assign role based on purchase quantity
    PERFORM public.assign_role_on_purchase(
        p_purchaser_user_id, 
        p_account_id, 
        p_quantity
    );
    
    RETURN v_purchase;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_course_purchase_with_licenses(UUID, UUID, UUID, INTEGER, DECIMAL, VARCHAR) TO authenticated;