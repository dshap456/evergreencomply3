-- Completely minimal storage policies to eliminate recursion
-- Drop ALL storage policies for these buckets
DROP POLICY IF EXISTS "course_videos_simple_access" ON storage.objects;
DROP POLICY IF EXISTS "video_thumbnails_simple_access" ON storage.objects;
DROP POLICY IF EXISTS "course_assets_simple_access" ON storage.objects;
DROP POLICY IF EXISTS "course_videos_access" ON storage.objects;
DROP POLICY IF EXISTS "video_thumbnails_access" ON storage.objects;
DROP POLICY IF EXISTS "course_assets_access" ON storage.objects;

-- Create extremely simple policies - just auth check
CREATE POLICY "course_videos_minimal" ON storage.objects FOR ALL
USING (
    bucket_id = 'course-videos'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "video_thumbnails_minimal" ON storage.objects FOR ALL
USING (
    bucket_id = 'video-thumbnails'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "course_assets_minimal" ON storage.objects FOR ALL
USING (
    bucket_id = 'course-assets'
    AND auth.role() = 'authenticated'
);