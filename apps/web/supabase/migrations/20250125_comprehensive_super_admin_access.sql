/*
 * Migration: Comprehensive Super Admin Access
 * 
 * This migration adds super admin access to all critical system tables.
 * This ensures super admins can manage all aspects of the system through
 * regular client + RLS policies instead of requiring admin client workarounds.
 * 
 * Tables covered:
 * - Core system tables (billing, notifications, roles, config)
 * - Video/media tables
 * - LMS tables (already covered in previous migration)
 * - Storage buckets
 */

-- =========================================
-- BILLING CUSTOMERS TABLE
-- =========================================
-- Drop existing policies
DROP POLICY IF EXISTS "billing_customers_read" ON public.billing_customers;
DROP POLICY IF EXISTS "billing_customers_manage" ON public.billing_customers;

-- New policies with super admin access
CREATE POLICY "billing_customers_read" ON public.billing_customers FOR SELECT
    TO authenticated USING (
        -- Super admins can read all billing customers
        public.is_super_admin() OR
        -- Account members can read their own billing info
        public.has_role_on_account(account_id)
    );

CREATE POLICY "billing_customers_manage" ON public.billing_customers FOR ALL
    TO authenticated USING (
        -- Super admins can manage all billing customers
        public.is_super_admin() OR
        -- Account owners can manage their billing info
        public.is_account_owner(account_id)
    );

-- =========================================
-- NOTIFICATIONS TABLE
-- =========================================
-- Drop existing policies
DROP POLICY IF EXISTS "notifications_read" ON public.notifications;
DROP POLICY IF EXISTS "notifications_manage" ON public.notifications;

-- New policies with super admin access
CREATE POLICY "notifications_read" ON public.notifications FOR SELECT
    TO authenticated USING (
        -- Super admins can read all notifications
        public.is_super_admin() OR
        -- Users can read their own notifications
        (
            -- Personal notifications
            (account_id IS NULL AND user_id = auth.uid()) OR
            -- Account notifications for members
            (account_id IS NOT NULL AND public.has_role_on_account(account_id))
        )
    );

CREATE POLICY "notifications_manage" ON public.notifications FOR ALL
    TO authenticated USING (
        -- Super admins can manage all notifications
        public.is_super_admin() OR
        -- System can create notifications (via service role)
        auth.uid() IS NULL
    );

-- =========================================
-- ROLES TABLE
-- =========================================
-- Drop existing policy
DROP POLICY IF EXISTS "roles_read" ON public.roles;

-- Add super admin manage policy
CREATE POLICY "roles_read" ON public.roles FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "roles_manage" ON public.roles FOR ALL
    TO authenticated USING (
        -- Only super admins can manage roles
        public.is_super_admin()
    );

-- =========================================
-- CONFIG TABLE
-- =========================================
-- Drop existing policies
DROP POLICY IF EXISTS "enable_read_access_for_authenticated_users" ON public.config;

-- New policies with super admin access
CREATE POLICY "config_read" ON public.config FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "config_manage" ON public.config FOR ALL
    TO authenticated USING (
        -- Only super admins can manage config
        public.is_super_admin()
    );

-- =========================================
-- NONCES TABLE (One-time tokens)
-- =========================================
-- Create policies for nonces table (currently has RLS but no policies)
CREATE POLICY "nonces_read" ON public.nonces FOR SELECT
    TO authenticated USING (
        -- Super admins can read all nonces
        public.is_super_admin() OR
        -- Users can read their own nonces
        user_id = auth.uid()
    );

CREATE POLICY "nonces_insert" ON public.nonces FOR INSERT
    TO authenticated WITH CHECK (
        -- Users can create their own nonces
        user_id = auth.uid()
    );

CREATE POLICY "nonces_update" ON public.nonces FOR UPDATE
    TO authenticated USING (
        -- Users can update their own nonces
        user_id = auth.uid()
    );

CREATE POLICY "nonces_delete" ON public.nonces FOR DELETE
    TO authenticated USING (
        -- Super admins can delete any nonce
        public.is_super_admin() OR
        -- Users can delete their own nonces
        user_id = auth.uid()
    );

-- =========================================
-- VIDEO METADATA TABLE
-- =========================================
-- Drop existing policies
DROP POLICY IF EXISTS "video_metadata_read" ON public.video_metadata;
DROP POLICY IF EXISTS "video_metadata_manage" ON public.video_metadata;

-- New policies with super admin access
CREATE POLICY "video_metadata_read" ON public.video_metadata FOR SELECT
    TO authenticated USING (
        -- Super admins can read all video metadata
        public.is_super_admin() OR
        -- Course creators can read their video metadata
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE l.video_url LIKE '%' || video_metadata.video_id || '%'
            AND public.has_role_on_account(c.account_id)
        ) OR
        -- Enrolled users can read video metadata for their courses
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            JOIN public.course_enrollments ce ON ce.course_id = c.id
            WHERE l.video_url LIKE '%' || video_metadata.video_id || '%'
            AND ce.user_id = auth.uid()
            AND c.is_published = true
        )
    );

CREATE POLICY "video_metadata_manage" ON public.video_metadata FOR ALL
    TO authenticated USING (
        -- Super admins can manage all video metadata
        public.is_super_admin()
    );

-- =========================================
-- VIDEO PROCESSING QUEUE TABLE
-- =========================================
-- Drop existing policies if any
DROP POLICY IF EXISTS "video_processing_queue_read" ON public.video_processing_queue;
DROP POLICY IF EXISTS "video_processing_queue_manage" ON public.video_processing_queue;

-- New policies with super admin access
CREATE POLICY "video_processing_queue_read" ON public.video_processing_queue FOR SELECT
    TO authenticated USING (
        -- Super admins can read all processing queue items
        public.is_super_admin() OR
        -- Course creators can read their video processing status
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE l.id = video_processing_queue.lesson_id
            AND public.has_role_on_account(c.account_id)
        )
    );

CREATE POLICY "video_processing_queue_manage" ON public.video_processing_queue FOR ALL
    TO authenticated USING (
        -- Super admins can manage all processing queue items
        public.is_super_admin()
    );

-- =========================================
-- VIDEO ACCESS LOGS TABLE
-- =========================================
-- Drop existing policies if any
DROP POLICY IF EXISTS "video_access_logs_read" ON public.video_access_logs;
DROP POLICY IF EXISTS "video_access_logs_insert" ON public.video_access_logs;

-- New policies with super admin access
CREATE POLICY "video_access_logs_read" ON public.video_access_logs FOR SELECT
    TO authenticated USING (
        -- Super admins can read all access logs
        public.is_super_admin() OR
        -- Users can read their own access logs
        user_id = auth.uid()
    );

CREATE POLICY "video_access_logs_insert" ON public.video_access_logs FOR INSERT
    TO authenticated WITH CHECK (
        -- Users can log their own access
        user_id = auth.uid()
    );

CREATE POLICY "video_access_logs_manage" ON public.video_access_logs FOR ALL
    TO authenticated USING (
        -- Only super admins can update/delete logs
        public.is_super_admin()
    );

-- =========================================
-- COURSE VERSIONS TABLE
-- =========================================
-- Drop existing policies if any
DROP POLICY IF EXISTS "course_versions_read" ON public.course_versions;
DROP POLICY IF EXISTS "course_versions_manage" ON public.course_versions;

-- New policies with super admin access
CREATE POLICY "course_versions_read" ON public.course_versions FOR SELECT
    TO authenticated USING (
        -- Super admins can read all versions
        public.is_super_admin() OR
        -- Course managers can read their course versions
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_versions.course_id
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
    );

CREATE POLICY "course_versions_manage" ON public.course_versions FOR ALL
    TO authenticated USING (
        -- Super admins can manage all versions
        public.is_super_admin() OR
        -- Course managers can manage their course versions
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_versions.course_id
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
    );

-- =========================================
-- COURSE PURCHASES TABLE
-- =========================================
-- Drop existing policies if any
DROP POLICY IF EXISTS "course_purchases_read" ON public.course_purchases;
DROP POLICY IF EXISTS "course_purchases_insert" ON public.course_purchases;

-- New policies with super admin access
CREATE POLICY "course_purchases_read" ON public.course_purchases FOR SELECT
    TO authenticated USING (
        -- Super admins can read all purchases
        public.is_super_admin() OR
        -- Users can read their own purchases
        user_id = auth.uid() OR
        -- Account members can read purchases for their courses
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_purchases.course_id
            AND public.has_role_on_account(c.account_id)
        )
    );

CREATE POLICY "course_purchases_insert" ON public.course_purchases FOR INSERT
    TO authenticated WITH CHECK (
        -- Users can create their own purchases
        user_id = auth.uid()
    );

CREATE POLICY "course_purchases_manage" ON public.course_purchases FOR ALL
    TO authenticated USING (
        -- Super admins can manage all purchases
        public.is_super_admin()
    );

-- =========================================
-- COURSE LICENSES TABLE
-- =========================================
-- Drop existing policies if any
DROP POLICY IF EXISTS "course_licenses_read" ON public.course_licenses;
DROP POLICY IF EXISTS "course_licenses_manage" ON public.course_licenses;

-- New policies with super admin access
CREATE POLICY "course_licenses_read" ON public.course_licenses FOR SELECT
    TO authenticated USING (
        -- Super admins can read all licenses
        public.is_super_admin() OR
        -- Account members can read their licenses
        public.has_role_on_account(account_id) OR
        -- Users can read licenses assigned to them
        assigned_to = auth.uid()
    );

CREATE POLICY "course_licenses_manage" ON public.course_licenses FOR ALL
    TO authenticated USING (
        -- Super admins can manage all licenses
        public.is_super_admin() OR
        -- Account members with permission can manage licenses
        public.has_permission(auth.uid(), account_id, 'settings.manage'::public.app_permissions)
    );

-- =========================================
-- VIDEO PROGRESS TABLE
-- =========================================
-- Drop existing policies if any
DROP POLICY IF EXISTS "video_progress_manage" ON public.video_progress;

-- New policies with super admin access
CREATE POLICY "video_progress_manage" ON public.video_progress FOR ALL
    TO authenticated USING (
        -- Super admins can manage all progress
        public.is_super_admin() OR
        -- Users can manage their own progress
        user_id = auth.uid() OR
        -- Course managers can view progress
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE l.id = video_progress.lesson_id
            AND public.has_role_on_account(c.account_id)
        )
    );

-- =========================================
-- STORAGE BUCKETS
-- =========================================
-- Update storage policies for course-videos bucket
DROP POLICY IF EXISTS "course_videos_access" ON storage.objects;

CREATE POLICY "course_videos_access" ON storage.objects FOR ALL
USING (
    bucket_id = 'course-videos'
    AND (
        -- Super admins can access all videos
        public.is_super_admin() OR
        -- Course creators can manage their videos
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE split_part(name, '/', 1) = c.account_id::text
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        ) OR
        -- Enrolled students can read videos
        EXISTS (
            SELECT 1 FROM public.courses c
            JOIN public.course_enrollments ce ON ce.course_id = c.id
            WHERE split_part(name, '/', 1) = c.account_id::text
            AND ce.user_id = auth.uid()
            AND c.is_published = true
        )
    )
);

-- Update storage policies for video-thumbnails bucket
DROP POLICY IF EXISTS "video_thumbnails_access" ON storage.objects;

CREATE POLICY "video_thumbnails_access" ON storage.objects FOR ALL
USING (
    bucket_id = 'video-thumbnails'
    AND (
        -- Super admins can access all thumbnails
        public.is_super_admin() OR
        -- Anyone can read thumbnails (they're public)
        true
    )
)
WITH CHECK (
    bucket_id = 'video-thumbnails'
    AND (
        -- Super admins can upload thumbnails
        public.is_super_admin() OR
        -- Course creators can upload thumbnails
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE split_part(name, '/', 1) = c.account_id::text
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
    )
);

-- Update storage policies for course-assets bucket
DROP POLICY IF EXISTS "course_assets_access" ON storage.objects;

CREATE POLICY "course_assets_access" ON storage.objects FOR ALL
USING (
    bucket_id = 'course-assets'
    AND (
        -- Super admins can access all assets
        public.is_super_admin() OR
        -- Course creators can manage their assets
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE split_part(name, '/', 1) = c.account_id::text
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        ) OR
        -- Enrolled students can read assets
        EXISTS (
            SELECT 1 FROM public.courses c
            JOIN public.course_enrollments ce ON ce.course_id = c.id
            WHERE split_part(name, '/', 1) = c.account_id::text
            AND ce.user_id = auth.uid()
            AND c.is_published = true
        )
    )
);

-- Add comment explaining the comprehensive super admin access
COMMENT ON SCHEMA public IS 'All critical system tables now have unified RLS-based authorization with super admin access. This eliminates the need for parallel authorization systems and prevents interdependency bugs.';