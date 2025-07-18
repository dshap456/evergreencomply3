-- Fix the create_video_metadata function to handle updates when metadata already exists
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
    -- Try to insert, but on conflict update instead
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
    ON CONFLICT (lesson_id, language_code, quality) 
    DO UPDATE SET
        storage_path = EXCLUDED.storage_path,
        original_filename = EXCLUDED.original_filename,
        file_size = EXCLUDED.file_size,
        duration = COALESCE(EXCLUDED.duration, public.video_metadata.duration),
        processing_status = 'pending',
        updated_at = NOW()
    RETURNING * INTO v_video_metadata;
    
    -- Queue for processing (only if it's a new upload or re-upload)
    INSERT INTO public.video_processing_queue (
        video_metadata_id,
        processing_type,
        priority
    ) VALUES (
        v_video_metadata.id,
        'thumbnail',
        3
    )
    ON CONFLICT DO NOTHING;
    
    RETURN v_video_metadata;
END;
$$;