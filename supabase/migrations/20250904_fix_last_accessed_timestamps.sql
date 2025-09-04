-- Fix corrupted last_accessed timestamps
-- All timestamps were set to the same value, breaking progress restoration
-- This resets them to use updated_at values which should be more accurate

UPDATE lesson_progress
SET last_accessed = updated_at
WHERE last_accessed = '2025-08-31 04:37:24.617781+00'
   OR last_accessed IS NULL;

-- Add a trigger to automatically update last_accessed when a lesson is accessed
CREATE OR REPLACE FUNCTION update_lesson_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if the status is changing or if explicitly requested
    IF NEW.status != OLD.status OR NEW.last_accessed != OLD.last_accessed THEN
        NEW.last_accessed = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_lesson_progress_last_accessed') THEN
        CREATE TRIGGER update_lesson_progress_last_accessed
        BEFORE UPDATE ON lesson_progress
        FOR EACH ROW
        EXECUTE FUNCTION update_lesson_last_accessed();
    END IF;
END;
$$;