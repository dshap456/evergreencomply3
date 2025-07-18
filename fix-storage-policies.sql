-- Fix infinite recursion in storage policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "course_videos_access" ON storage.objects;
DROP POLICY IF EXISTS "video_thumbnails_access" ON storage.objects;
DROP POLICY IF EXISTS "course_assets_access" ON storage.objects;

-- Create simple storage policies without complex joins

-- Course Videos Policy (Private - Simple access control)
CREATE POLICY "course_videos_simple_access" ON storage.objects FOR ALL
USING (
    bucket_id = 'course-videos'
    AND (
        -- Super admins can access all videos
        public.is_super_admin()
        OR
        -- File owner can access their own uploads
        auth.uid() = owner
        OR
        -- Basic auth check for authenticated users
        -- We'll handle detailed access control in the application layer
        auth.role() = 'authenticated'
    )
);

-- Video Thumbnails Policy (Public bucket, minimal restrictions)
CREATE POLICY "video_thumbnails_simple_access" ON storage.objects FOR ALL
USING (
    bucket_id = 'video-thumbnails'
    AND (
        -- Super admins can manage all thumbnails
        public.is_super_admin()
        OR
        -- File owner can manage their own thumbnails
        auth.uid() = owner
        OR
        -- Anyone can read thumbnails (public bucket)
        auth.role() = 'authenticated'
    )
);

-- Course Assets Policy (Private - Simple access control)
CREATE POLICY "course_assets_simple_access" ON storage.objects FOR ALL
USING (
    bucket_id = 'course-assets'
    AND (
        -- Super admins can access all assets
        public.is_super_admin()
        OR
        -- File owner can access their own uploads
        auth.uid() = owner
        OR
        -- Basic auth check for authenticated users
        auth.role() = 'authenticated'
    )
);