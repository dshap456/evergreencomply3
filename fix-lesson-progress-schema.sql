-- Fix lesson_progress table schema to match what the code expects
-- Run this migration to add missing columns

-- Add progress_percentage column to track lesson completion percentage
ALTER TABLE lesson_progress 
ADD COLUMN IF NOT EXISTS progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- Add quiz_score column to track quiz results
ALTER TABLE lesson_progress 
ADD COLUMN IF NOT EXISTS quiz_score integer CHECK (quiz_score >= 0 AND quiz_score <= 100);

-- Add last_accessed column to track when user last viewed a lesson (for position restoration)
ALTER TABLE lesson_progress 
ADD COLUMN IF NOT EXISTS last_accessed timestamp with time zone DEFAULT now();

-- Update existing rows to have meaningful values
UPDATE lesson_progress 
SET 
  progress_percentage = CASE 
    WHEN status = 'completed' THEN 100 
    WHEN status = 'in_progress' THEN 50 
    ELSE 0 
  END,
  last_accessed = COALESCE(updated_at, created_at, now())
WHERE progress_percentage IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lesson_progress_last_accessed 
ON lesson_progress(user_id, last_accessed DESC);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_status 
ON lesson_progress(user_id, lesson_id, status);

-- Update the updated_at trigger to also update last_accessed
CREATE OR REPLACE FUNCTION update_lesson_progress_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  -- Only update last_accessed if it's not being explicitly set
  IF NEW.last_accessed IS NOT DISTINCT FROM OLD.last_accessed THEN
    NEW.last_accessed = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS update_lesson_progress_timestamps_trigger ON lesson_progress;
CREATE TRIGGER update_lesson_progress_timestamps_trigger
BEFORE UPDATE ON lesson_progress
FOR EACH ROW
EXECUTE FUNCTION update_lesson_progress_timestamps();