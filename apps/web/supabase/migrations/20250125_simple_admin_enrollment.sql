-- Simple admin enrollment that bypasses JWT complexity
-- Just checks if the current user is the super admin by email

-- Create a simple function to check if current user is the super admin
CREATE OR REPLACE FUNCTION public.is_evergreen_admin() 
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    user_email text;
BEGIN
    -- Get the current user's email
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = auth.uid();
    
    -- Check if it's the super admin email
    RETURN user_email = 'support@everygreencomply.com';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_evergreen_admin() TO authenticated;

-- Create a simplified admin enrollment function
CREATE OR REPLACE FUNCTION public.simple_admin_enroll(
    p_user_email text,
    p_course_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_enrollment_id uuid;
    v_user_id uuid;
    v_course_exists boolean;
    v_already_enrolled boolean;
BEGIN
    -- First check if the caller is the super admin
    IF NOT public.is_evergreen_admin() THEN
        RAISE EXCEPTION 'Access denied: Only support@everygreencomply.com can enroll users';
    END IF;
    
    -- Find the user by email
    SELECT primary_owner_user_id INTO v_user_id
    FROM public.accounts
    WHERE email = p_user_email
    AND is_personal_account = true;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_email;
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
        WHERE user_id = v_user_id
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
        v_user_id,
        p_course_id,
        0
    ) RETURNING id INTO v_enrollment_id;
    
    RETURN v_enrollment_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.simple_admin_enroll(text, uuid) TO authenticated;

-- Update the course_enrollments RLS policy
DROP POLICY IF EXISTS "course_enrollments_insert" ON public.course_enrollments;

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
    -- Allow the evergreen admin to enroll anyone
    public.is_evergreen_admin()
);