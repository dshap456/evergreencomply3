/*
 * Migration: Fix LMS Super Admin Access
 * 
 * This migration updates all LMS-related RLS policies to include super admin access.
 * This fixes the issue where super admins cannot manage courses/quizzes through the regular client.
 * 
 * The goal is to unify authorization through RLS policies instead of using parallel
 * authorization systems (regular client + admin client).
 */

-- Drop existing policies to recreate them with super admin access
DROP POLICY IF EXISTS "courses_read" ON public.courses;
DROP POLICY IF EXISTS "courses_manage" ON public.courses;
DROP POLICY IF EXISTS "course_modules_read" ON public.course_modules;
DROP POLICY IF EXISTS "course_modules_manage" ON public.course_modules;
DROP POLICY IF EXISTS "lessons_read" ON public.lessons;
DROP POLICY IF EXISTS "lessons_manage" ON public.lessons;
DROP POLICY IF EXISTS "quiz_questions_read" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_manage" ON public.quiz_questions;
DROP POLICY IF EXISTS "course_enrollments_read" ON public.course_enrollments;
DROP POLICY IF EXISTS "course_enrollments_insert" ON public.course_enrollments;
DROP POLICY IF EXISTS "course_enrollments_update" ON public.course_enrollments;
DROP POLICY IF EXISTS "course_enrollments_delete" ON public.course_enrollments;
DROP POLICY IF EXISTS "lesson_progress_manage" ON public.lesson_progress;
DROP POLICY IF EXISTS "quiz_attempts_manage" ON public.quiz_attempts;
DROP POLICY IF EXISTS "course_completions_read" ON public.course_completions;
DROP POLICY IF EXISTS "course_completions_insert" ON public.course_completions;
DROP POLICY IF EXISTS "course_completions_update" ON public.course_completions;

-- COURSES TABLE POLICIES
-- Read policy: Super admins, account members, or anyone for published courses
CREATE POLICY "courses_read" ON public.courses FOR SELECT
    TO authenticated USING (
        -- Super admins can read all courses
        public.is_super_admin() OR
        -- Course owners (account members) can read
        public.has_role_on_account(account_id) OR
        -- Published courses are readable by all authenticated users
        is_published
    );

-- Manage policy: Super admins or account members with settings.manage permission
CREATE POLICY "courses_manage" ON public.courses FOR ALL
    TO authenticated USING (
        -- Super admins can manage all courses
        public.is_super_admin() OR
        -- Account members with permission can manage
        public.has_permission(auth.uid(), account_id, 'settings.manage'::public.app_permissions)
    );

-- COURSE MODULES TABLE POLICIES
-- Read policy: Super admins, account members, or enrolled users
CREATE POLICY "course_modules_read" ON public.course_modules FOR SELECT
    TO authenticated USING (
        -- Super admins can read all modules
        public.is_super_admin() OR
        -- Standard access check
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_modules.course_id 
            AND (
                public.has_role_on_account(c.account_id) OR
                (c.is_published AND EXISTS (
                    SELECT 1 FROM public.course_enrollments 
                    WHERE course_id = c.id AND user_id = auth.uid()
                ))
            )
        )
    );

-- Manage policy: Super admins or account members with permission
CREATE POLICY "course_modules_manage" ON public.course_modules FOR ALL
    TO authenticated USING (
        -- Super admins can manage all modules
        public.is_super_admin() OR
        -- Account members with permission
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_modules.course_id 
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
    );

-- LESSONS TABLE POLICIES
-- Read policy: Super admins, account members, or enrolled users
CREATE POLICY "lessons_read" ON public.lessons FOR SELECT
    TO authenticated USING (
        -- Super admins can read all lessons
        public.is_super_admin() OR
        -- Standard access check
        EXISTS (
            SELECT 1 FROM public.course_modules cm
            JOIN public.courses c ON c.id = cm.course_id
            WHERE cm.id = lessons.module_id 
            AND (
                public.has_role_on_account(c.account_id) OR
                (c.is_published AND EXISTS (
                    SELECT 1 FROM public.course_enrollments 
                    WHERE course_id = c.id AND user_id = auth.uid()
                ))
            )
        )
    );

-- Manage policy: Super admins or account members with permission
CREATE POLICY "lessons_manage" ON public.lessons FOR ALL
    TO authenticated USING (
        -- Super admins can manage all lessons
        public.is_super_admin() OR
        -- Account members with permission
        EXISTS (
            SELECT 1 FROM public.course_modules cm
            JOIN public.courses c ON c.id = cm.course_id
            WHERE cm.id = lessons.module_id 
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
    );

-- QUIZ QUESTIONS TABLE POLICIES
-- Read policy: Super admins, account members, or enrolled users
CREATE POLICY "quiz_questions_read" ON public.quiz_questions FOR SELECT
    TO authenticated USING (
        -- Super admins can read all quiz questions
        public.is_super_admin() OR
        -- Standard access check
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE l.id = quiz_questions.lesson_id 
            AND (
                public.has_role_on_account(c.account_id) OR
                (c.is_published AND EXISTS (
                    SELECT 1 FROM public.course_enrollments 
                    WHERE course_id = c.id AND user_id = auth.uid()
                ))
            )
        )
    );

-- Manage policy: Super admins or account members with permission
CREATE POLICY "quiz_questions_manage" ON public.quiz_questions FOR ALL
    TO authenticated USING (
        -- Super admins can manage all quiz questions
        public.is_super_admin() OR
        -- Account members with permission
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE l.id = quiz_questions.lesson_id 
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
    );

-- COURSE ENROLLMENTS TABLE POLICIES
-- Read policy: Super admins, the enrolled user, or account members
CREATE POLICY "course_enrollments_read" ON public.course_enrollments FOR SELECT
    TO authenticated USING (
        -- Super admins can read all enrollments
        public.is_super_admin() OR
        -- Users can read their own enrollments
        user_id = auth.uid() OR
        -- Account members can read enrollments for their courses
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_enrollments.course_id 
            AND public.has_role_on_account(c.account_id)
        )
    );

-- Insert policy: Super admins can enroll anyone, users can self-enroll in published courses
CREATE POLICY "course_enrollments_insert" ON public.course_enrollments FOR INSERT
    TO authenticated WITH CHECK (
        -- Super admins can enroll any user in any course
        public.is_super_admin() OR
        -- Users can self-enroll in published courses
        (
            user_id = auth.uid() AND
            EXISTS (
                SELECT 1 FROM public.courses c 
                WHERE c.id = course_enrollments.course_id 
                AND c.is_published = true
            )
        )
    );

-- Update policy: Super admins, the enrolled user, or account members
CREATE POLICY "course_enrollments_update" ON public.course_enrollments FOR UPDATE
    TO authenticated USING (
        -- Super admins can update any enrollment
        public.is_super_admin() OR
        -- Users can update their own enrollments
        user_id = auth.uid() OR
        -- Account members can update enrollments for their courses
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_enrollments.course_id 
            AND public.has_role_on_account(c.account_id)
        )
    );

-- Delete policy: Super admins or account members with permission
CREATE POLICY "course_enrollments_delete" ON public.course_enrollments FOR DELETE
    TO authenticated USING (
        -- Super admins can delete any enrollment
        public.is_super_admin() OR
        -- Account members with permission can delete enrollments
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_enrollments.course_id 
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
    );

-- LESSON PROGRESS TABLE POLICIES
-- Manage policy: Super admins, the user, or account members
CREATE POLICY "lesson_progress_manage" ON public.lesson_progress FOR ALL
    TO authenticated USING (
        -- Super admins can manage all progress
        public.is_super_admin() OR
        -- Users can manage their own progress
        user_id = auth.uid() OR
        -- Account members can manage progress for their courses
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE l.id = lesson_progress.lesson_id 
            AND public.has_role_on_account(c.account_id)
        )
    );

-- QUIZ ATTEMPTS TABLE POLICIES
-- Manage policy: Super admins, the user, or account members
CREATE POLICY "quiz_attempts_manage" ON public.quiz_attempts FOR ALL
    TO authenticated USING (
        -- Super admins can manage all quiz attempts
        public.is_super_admin() OR
        -- Users can manage their own attempts
        user_id = auth.uid() OR
        -- Account members can manage attempts for their courses
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE l.id = quiz_attempts.lesson_id 
            AND public.has_role_on_account(c.account_id)
        )
    );

-- COURSE COMPLETIONS TABLE POLICIES
-- Read policy: Super admins, the user, or account members
CREATE POLICY "course_completions_read" ON public.course_completions FOR SELECT
    TO authenticated USING (
        -- Super admins can read all completions
        public.is_super_admin() OR
        -- Users can read their own completions
        user_id = auth.uid() OR
        -- Account members can read completions for their courses
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_completions.course_id 
            AND public.has_role_on_account(c.account_id)
        )
    );

-- Insert policy: Super admins or users completing their own courses
CREATE POLICY "course_completions_insert" ON public.course_completions FOR INSERT
    TO authenticated WITH CHECK (
        -- Super admins can insert any completion
        public.is_super_admin() OR
        -- Users can insert their own completions
        user_id = auth.uid()
    );

-- Update policy: Super admins, the user, or account members
CREATE POLICY "course_completions_update" ON public.course_completions FOR UPDATE
    TO authenticated USING (
        -- Super admins can update any completion
        public.is_super_admin() OR
        -- Users can update their own completions
        user_id = auth.uid() OR
        -- Account members can update completions for their courses
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_completions.course_id 
            AND public.has_role_on_account(c.account_id)
        )
    );

-- Update storage policy for course content to include super admin access
DROP POLICY IF EXISTS course_content_access ON storage.objects;

CREATE POLICY course_content_access ON storage.objects FOR ALL
USING (
    bucket_id = 'course-content'
    AND (
        -- Super admins can access all content
        public.is_super_admin() OR
        -- Course creators can manage their content
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE (
                split_part(name, '/', 1) = c.account_id::text
                AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
            )
        )
        OR
        -- Enrolled students can read content
        EXISTS (
            SELECT 1 FROM public.courses c
            JOIN public.course_enrollments ce ON ce.course_id = c.id
            WHERE (
                split_part(name, '/', 1) = c.account_id::text
                AND ce.user_id = auth.uid()
                AND c.is_published = true
            )
        )
    )
);

-- Add comment explaining the new authorization approach
COMMENT ON SCHEMA public IS 'LMS tables now use unified RLS-based authorization. Super admins have full access through is_super_admin() checks in all policies. This eliminates the need for parallel authorization systems.';