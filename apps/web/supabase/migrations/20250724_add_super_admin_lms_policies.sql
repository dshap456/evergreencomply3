-- Add Super Admin permissive policies for LMS tables
-- This allows super admins to access all courses and related LMS data

-- Allow Super Admins to access all courses
CREATE POLICY "super_admins_access_courses"
    ON public.courses
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (public.is_super_admin());

-- Allow Super Admins to access all course modules
CREATE POLICY "super_admins_access_course_modules"
    ON public.course_modules
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (public.is_super_admin());

-- Allow Super Admins to access all lessons
CREATE POLICY "super_admins_access_lessons"
    ON public.lessons
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (public.is_super_admin());

-- Allow Super Admins to access all quiz questions
CREATE POLICY "super_admins_access_quiz_questions"
    ON public.quiz_questions
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (public.is_super_admin());

-- Allow Super Admins to access all course enrollments
CREATE POLICY "super_admins_access_course_enrollments"
    ON public.course_enrollments
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (public.is_super_admin());

-- Allow Super Admins to access all lesson progress
CREATE POLICY "super_admins_access_lesson_progress"
    ON public.lesson_progress
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (public.is_super_admin());

-- Allow Super Admins to access all quiz attempts
CREATE POLICY "super_admins_access_quiz_attempts"
    ON public.quiz_attempts
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (public.is_super_admin());

-- Allow Super Admins to access all course completions
CREATE POLICY "super_admins_access_course_completions"
    ON public.course_completions
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (public.is_super_admin());