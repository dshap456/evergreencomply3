-- Fix admin enrollment by creating a dedicated function that doesn't require AAL2
-- This function validates admin status but allows enrollment without MFA verification

-- Create a function to check if user is a super admin without MFA requirement
CREATE OR REPLACE FUNCTION public.is_super_admin_without_mfa() 
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    is_super_admin boolean;
BEGIN
    -- Check if user has super-admin role in app_metadata
    SELECT (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'super-admin' INTO is_super_admin;
    
    RETURN COALESCE(is_super_admin, false);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_super_admin_without_mfa() TO authenticated;

-- Create a dedicated admin enrollment function
CREATE OR REPLACE FUNCTION public.admin_enroll_user(
    p_user_id uuid,
    p_course_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_enrollment_id uuid;
    v_is_admin boolean;
    v_course_exists boolean;
    v_already_enrolled boolean;
BEGIN
    -- First check if the caller is a super admin
    SELECT public.is_super_admin_without_mfa() INTO v_is_admin;
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied: Only super admins can enroll users';
    END IF;
    
    -- Verify course exists and is published
    SELECT EXISTS(
        SELECT 1 FROM public.courses 
        WHERE id = p_course_id 
        AND is_published = true
    ) INTO v_course_exists;
    
    IF NOT v_course_exists THEN
        RAISE EXCEPTION 'Course not found or not published';
    END IF;
    
    -- Check if already enrolled
    SELECT EXISTS(
        SELECT 1 FROM public.course_enrollments
        WHERE user_id = p_user_id
        AND course_id = p_course_id
    ) INTO v_already_enrolled;
    
    IF v_already_enrolled THEN
        RAISE EXCEPTION 'User already enrolled in this course';
    END IF;
    
    -- Create enrollment
    INSERT INTO public.course_enrollments (
        user_id,
        course_id,
        progress_percentage
    ) VALUES (
        p_user_id,
        p_course_id,
        0
    ) RETURNING id INTO v_enrollment_id;
    
    RETURN v_enrollment_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.admin_enroll_user(uuid, uuid) TO authenticated;

-- Update the course_enrollments RLS policy to allow this function
-- Drop the existing insert policy
DROP POLICY IF EXISTS "course_enrollments_insert" ON public.course_enrollments;

-- Create new insert policy that allows both regular enrollment and admin enrollment
CREATE POLICY "course_enrollments_insert" ON public.course_enrollments
FOR INSERT TO authenticated
WITH CHECK (
    -- Allow users to enroll themselves in published courses
    (
        user_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM public.courses
            WHERE id = course_id
            AND is_published = true
        )
    )
    OR
    -- Allow super admins to enroll anyone (with or without MFA)
    public.is_super_admin_without_mfa()
);

-- Add comment explaining the function
COMMENT ON FUNCTION public.admin_enroll_user(uuid, uuid) IS 'Allows super admins to enroll users in courses without requiring MFA verification';
COMMENT ON FUNCTION public.is_super_admin_without_mfa() IS 'Checks if user is a super admin without requiring MFA authentication level';