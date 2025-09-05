-- Add last_accessed column to lesson_progress if it doesn't exist
ALTER TABLE public.lesson_progress 
ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMPTZ;

-- Create or replace the update_video_progress function
CREATE OR REPLACE FUNCTION public.update_video_progress(
  p_user_id UUID,
  p_lesson_id UUID,
  p_current_time NUMERIC,
  p_duration NUMERIC,
  p_device_info JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_watched_percentage NUMERIC;
  v_status TEXT;
  v_language_code TEXT DEFAULT 'en';
BEGIN
  -- Calculate watched percentage
  IF p_duration > 0 THEN
    v_watched_percentage := (p_current_time / p_duration) * 100;
  ELSE
    v_watched_percentage := 0;
  END IF;

  -- Determine status based on watched percentage
  IF v_watched_percentage >= 80 THEN
    v_status := 'completed';
  ELSE
    v_status := 'in_progress';
  END IF;

  -- Upsert into video_progress table
  INSERT INTO public.video_progress (
    user_id,
    lesson_id,
    current_time,
    duration,
    watched_percentage,
    last_position,
    device_info,
    updated_at
  )
  VALUES (
    p_user_id,
    p_lesson_id,
    p_current_time,
    p_duration,
    v_watched_percentage,
    p_current_time,
    p_device_info,
    NOW()
  )
  ON CONFLICT (user_id, lesson_id) 
  DO UPDATE SET
    current_time = EXCLUDED.current_time,
    duration = EXCLUDED.duration,
    watched_percentage = EXCLUDED.watched_percentage,
    last_position = EXCLUDED.current_time,
    device_info = EXCLUDED.device_info,
    updated_at = NOW();

  -- Update lesson_progress table
  INSERT INTO public.lesson_progress (
    user_id,
    lesson_id,
    language,
    status,
    last_accessed,
    updated_at
  )
  VALUES (
    p_user_id,
    p_lesson_id,
    v_language_code,
    v_status,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, lesson_id, language)
  DO UPDATE SET
    status = CASE 
      WHEN lesson_progress.status = 'completed' THEN 'completed'
      ELSE v_status
    END,
    last_accessed = NOW(),
    updated_at = NOW();

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'watched_percentage', v_watched_percentage,
    'status', v_status
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_video_progress TO authenticated;

-- Add index on last_accessed for better query performance
CREATE INDEX IF NOT EXISTS idx_lesson_progress_last_accessed 
ON public.lesson_progress(user_id, language, last_accessed DESC NULLS LAST);