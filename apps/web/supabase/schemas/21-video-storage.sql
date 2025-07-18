/*
 * -------------------------------------------------------
 * Section: Video Storage and Streaming
 * Storage buckets and policies for LMS video content
 * Secure video serving with access controls
 * -------------------------------------------------------
 */

-- Video Content Storage Bucket (private)
INSERT INTO storage.buckets (id, name, PUBLIC, file_size_limit, allowed_mime_types)
VALUES (
    'course-videos', 
    'course-videos', 
    false,  -- Private bucket for security
    524288000, -- 500MB max file size
    ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Video Thumbnails Bucket (public for performance)
INSERT INTO storage.buckets (id, name, PUBLIC, file_size_limit, allowed_mime_types)
VALUES (
    'video-thumbnails', 
    'video-thumbnails', 
    true, -- Public for CDN caching
    5242880, -- 5MB max file size  
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Course Assets Bucket (documents, PDFs, etc.)
INSERT INTO storage.buckets (id, name, PUBLIC, file_size_limit, allowed_mime_types)
VALUES (
    'course-assets', 
    'course-assets', 
    false, -- Private bucket
    52428800, -- 50MB max file size
    ARRAY[
        'application/pdf', 
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Video Metadata Table (for better video management)
CREATE TABLE IF NOT EXISTS public.video_metadata (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    language_code public.language_code NOT NULL DEFAULT 'en',
    storage_path TEXT NOT NULL, -- Path in Supabase Storage
    original_filename VARCHAR(255),
    file_size BIGINT, -- Size in bytes
    duration INTEGER, -- Duration in seconds
    width INTEGER, -- Video width in pixels
    height INTEGER, -- Video height in pixels
    format VARCHAR(50), -- Video format (mp4, webm, etc.)
    quality VARCHAR(50), -- Quality setting (720p, 1080p, etc.)
    thumbnail_path TEXT, -- Path to thumbnail image
    processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, ready, error
    processing_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(lesson_id, language_code, quality)
);

-- Video Processing Queue (for background video processing)
CREATE TABLE IF NOT EXISTS public.video_processing_queue (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    video_metadata_id UUID NOT NULL REFERENCES public.video_metadata(id) ON DELETE CASCADE,
    processing_type VARCHAR(50) NOT NULL, -- transcode, thumbnail, compress
    status VARCHAR(50) DEFAULT 'queued', -- queued, processing, completed, failed
    priority INTEGER DEFAULT 5, -- 1 = highest, 10 = lowest
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video Access Logs (for analytics and security)
CREATE TABLE IF NOT EXISTS public.video_access_logs (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id),
    video_metadata_id UUID REFERENCES public.video_metadata(id),
    access_type VARCHAR(50) DEFAULT 'view', -- view, download, thumbnail
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    watched_duration INTEGER DEFAULT 0, -- Seconds watched in this session
    access_granted BOOLEAN DEFAULT true,
    denial_reason TEXT,
    accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_metadata_lesson_lang ON public.video_metadata(lesson_id, language_code);
CREATE INDEX IF NOT EXISTS idx_video_metadata_processing_status ON public.video_metadata(processing_status);
CREATE INDEX IF NOT EXISTS idx_video_processing_queue_status ON public.video_processing_queue(status, priority);
CREATE INDEX IF NOT EXISTS idx_video_access_logs_user_lesson ON public.video_access_logs(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_video_access_logs_accessed_at ON public.video_access_logs(accessed_at);

-- Enable RLS
ALTER TABLE public.video_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Video Metadata
CREATE POLICY "video_metadata_read" ON public.video_metadata FOR SELECT
    TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE l.id = video_metadata.lesson_id 
            AND (
                -- Course managers can see all metadata
                public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
                OR
                -- Enrolled students can see metadata for published courses
                (c.is_published AND EXISTS (
                    SELECT 1 FROM public.course_enrollments 
                    WHERE course_id = c.id AND user_id = auth.uid()
                ))
            )
        )
    );

CREATE POLICY "video_metadata_manage" ON public.video_metadata FOR ALL
    TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE l.id = video_metadata.lesson_id 
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
    );

-- RLS Policies for Video Processing Queue  
CREATE POLICY "video_processing_queue_manage" ON public.video_processing_queue FOR ALL
    TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.video_metadata vm
            JOIN public.lessons l ON l.id = vm.lesson_id
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE vm.id = video_processing_queue.video_metadata_id
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
    );

-- RLS Policies for Video Access Logs
CREATE POLICY "video_access_logs_read" ON public.video_access_logs FOR SELECT
    TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE l.id = video_access_logs.lesson_id 
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
    );

CREATE POLICY "video_access_logs_insert" ON public.video_access_logs FOR INSERT
    TO authenticated WITH CHECK (
        user_id = auth.uid()
    );

-- Storage Policies for Video Buckets

-- Course Videos Policy (Private - Access control based on enrollment)
CREATE POLICY "course_videos_access" ON storage.objects FOR ALL
USING (
    bucket_id = 'course-videos'
    AND (
        -- Course managers can manage their videos
        EXISTS (
            SELECT 1 FROM public.video_metadata vm
            JOIN public.lessons l ON l.id = vm.lesson_id
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE vm.storage_path = name
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
        OR
        -- Enrolled students can read videos from published courses they're enrolled in
        EXISTS (
            SELECT 1 FROM public.video_metadata vm
            JOIN public.lessons l ON l.id = vm.lesson_id
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            JOIN public.course_enrollments ce ON ce.course_id = c.id
            WHERE vm.storage_path = name
            AND ce.user_id = auth.uid()
            AND c.is_published = true
            -- Additional check: lesson must be accessible (sequential completion)
            AND public.is_lesson_accessible(auth.uid(), l.id)
        )
    )
);

-- Video Thumbnails Policy (Public bucket, but controlled by RLS logic)
CREATE POLICY "video_thumbnails_access" ON storage.objects FOR ALL
USING (
    bucket_id = 'video-thumbnails'
    AND (
        -- Course managers can manage thumbnails
        EXISTS (
            SELECT 1 FROM public.video_metadata vm
            JOIN public.lessons l ON l.id = vm.lesson_id
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE vm.thumbnail_path = name
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
        OR
        -- Anyone can read thumbnails for published courses (for previews)
        EXISTS (
            SELECT 1 FROM public.video_metadata vm
            JOIN public.lessons l ON l.id = vm.lesson_id
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE vm.thumbnail_path = name
            AND c.is_published = true
        )
    )
);

-- Course Assets Policy  
CREATE POLICY "course_assets_access" ON storage.objects FOR ALL
USING (
    bucket_id = 'course-assets'
    AND (
        -- Course managers can manage assets
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE l.asset_url LIKE '%' || name || '%'
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
        OR
        -- Enrolled students can access assets for lessons they have access to
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            JOIN public.course_enrollments ce ON ce.course_id = c.id
            WHERE l.asset_url LIKE '%' || name || '%'
            AND ce.user_id = auth.uid()
            AND c.is_published = true
            AND public.is_lesson_accessible(auth.uid(), l.id)
        )
    )
);

-- Functions for Video Management

-- Function to generate secure video URL with time-limited access
CREATE OR REPLACE FUNCTION public.get_secure_video_url(
    p_lesson_id UUID,
    p_language_code public.language_code DEFAULT 'en',
    p_quality VARCHAR DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_video_metadata public.video_metadata;
    v_storage_path TEXT;
    v_access_granted BOOLEAN := false;
BEGIN
    -- Check if user can access this lesson
    IF NOT public.is_lesson_accessible(auth.uid(), p_lesson_id) THEN
        -- Log denied access
        INSERT INTO public.video_access_logs (
            user_id, lesson_id, access_type, access_granted, denial_reason
        ) VALUES (
            auth.uid(), p_lesson_id, 'view', false, 'Lesson not accessible'
        );
        
        RETURN NULL;
    END IF;
    
    -- Get video metadata
    SELECT * INTO v_video_metadata
    FROM public.video_metadata
    WHERE lesson_id = p_lesson_id 
    AND language_code = p_language_code
    AND (p_quality IS NULL OR quality = p_quality)
    AND processing_status = 'ready'
    ORDER BY 
        CASE 
            WHEN quality = '1080p' THEN 1
            WHEN quality = '720p' THEN 2
            WHEN quality = '480p' THEN 3
            ELSE 4
        END
    LIMIT 1;
    
    IF v_video_metadata IS NULL THEN
        -- Log video not found
        INSERT INTO public.video_access_logs (
            user_id, lesson_id, access_type, access_granted, denial_reason
        ) VALUES (
            auth.uid(), p_lesson_id, 'view', false, 'Video not found or not ready'
        );
        
        RETURN NULL;
    END IF;
    
    -- Log successful access
    INSERT INTO public.video_access_logs (
        user_id, lesson_id, video_metadata_id, access_type, access_granted
    ) VALUES (
        auth.uid(), p_lesson_id, v_video_metadata.id, 'view', true
    );
    
    -- Return the storage path (frontend will use this to get signed URL)
    RETURN v_video_metadata.storage_path;
END;
$$;

-- Function to upload video metadata
CREATE OR REPLACE FUNCTION public.create_video_metadata(
    p_lesson_id UUID,
    p_language_code public.language_code,
    p_storage_path TEXT,
    p_original_filename VARCHAR,
    p_file_size BIGINT,
    p_duration INTEGER DEFAULT NULL,
    p_quality VARCHAR DEFAULT '720p'
) RETURNS public.video_metadata
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_video_metadata public.video_metadata;
BEGIN
    -- Insert video metadata
    INSERT INTO public.video_metadata (
        lesson_id,
        language_code,
        storage_path,
        original_filename,
        file_size,
        duration,
        quality,
        processing_status,
        created_by
    ) VALUES (
        p_lesson_id,
        p_language_code,
        p_storage_path,
        p_original_filename,
        p_file_size,
        p_duration,
        p_quality,
        'pending',
        auth.uid()
    )
    RETURNING * INTO v_video_metadata;
    
    -- Queue for processing
    INSERT INTO public.video_processing_queue (
        video_metadata_id,
        processing_type,
        priority
    ) VALUES (
        v_video_metadata.id,
        'thumbnail',
        3
    );
    
    RETURN v_video_metadata;
END;
$$;

-- Function to update video processing status
CREATE OR REPLACE FUNCTION public.update_video_processing_status(
    p_video_metadata_id UUID,
    p_status VARCHAR,
    p_duration INTEGER DEFAULT NULL,
    p_width INTEGER DEFAULT NULL,
    p_height INTEGER DEFAULT NULL,
    p_thumbnail_path TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
) RETURNS public.video_metadata
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_video_metadata public.video_metadata;
BEGIN
    UPDATE public.video_metadata
    SET 
        processing_status = p_status,
        duration = COALESCE(p_duration, duration),
        width = COALESCE(p_width, width),
        height = COALESCE(p_height, height),
        thumbnail_path = COALESCE(p_thumbnail_path, thumbnail_path),
        processing_error = p_error_message,
        updated_at = NOW()
    WHERE id = p_video_metadata_id
    RETURNING * INTO v_video_metadata;
    
    -- Update processing queue
    UPDATE public.video_processing_queue
    SET 
        status = CASE 
            WHEN p_status = 'ready' THEN 'completed'
            WHEN p_status = 'error' THEN 'failed'
            ELSE status
        END,
        completed_at = CASE 
            WHEN p_status IN ('ready', 'error') THEN NOW()
            ELSE completed_at
        END,
        error_message = p_error_message
    WHERE video_metadata_id = p_video_metadata_id;
    
    RETURN v_video_metadata;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_secure_video_url(UUID, public.language_code, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_video_metadata(UUID, public.language_code, TEXT, VARCHAR, BIGINT, INTEGER, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_video_processing_status(UUID, VARCHAR, INTEGER, INTEGER, INTEGER, TEXT, TEXT) TO authenticated;

-- Create view for video management dashboard
CREATE OR REPLACE VIEW public.video_management_dashboard AS
SELECT 
    vm.id as video_id,
    l.id as lesson_id,
    l.title as lesson_title,
    cm.title as module_title,
    c.title as course_title,
    c.account_id,
    vm.language_code,
    vm.original_filename,
    vm.file_size,
    vm.duration,
    vm.quality,
    vm.processing_status,
    vm.created_at,
    vm.updated_at,
    vpq.status as queue_status,
    vpq.attempts as processing_attempts,
    vpq.error_message as processing_error
FROM public.video_metadata vm
JOIN public.lessons l ON l.id = vm.lesson_id
JOIN public.course_modules cm ON cm.id = l.module_id
JOIN public.courses c ON c.id = cm.course_id
LEFT JOIN public.video_processing_queue vpq ON vpq.video_metadata_id = vm.id;

-- Video analytics view
CREATE OR REPLACE VIEW public.video_analytics AS
SELECT 
    l.id as lesson_id,
    l.title as lesson_title,
    c.id as course_id,
    c.title as course_title,
    c.account_id,
    COUNT(DISTINCT val.user_id) as unique_viewers,
    COUNT(val.id) as total_views,
    AVG(val.watched_duration) as avg_watch_duration,
    SUM(val.watched_duration) as total_watch_time,
    MAX(val.accessed_at) as last_accessed
FROM public.video_access_logs val
JOIN public.lessons l ON l.id = val.lesson_id
JOIN public.course_modules cm ON cm.id = l.module_id
JOIN public.courses c ON c.id = cm.course_id
WHERE val.access_granted = true
AND val.access_type = 'view'
GROUP BY l.id, l.title, c.id, c.title, c.account_id;