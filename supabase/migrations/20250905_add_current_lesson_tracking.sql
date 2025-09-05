-- Add current_lesson_id to course_enrollments to reliably track course position
ALTER TABLE course_enrollments 
ADD COLUMN IF NOT EXISTS current_lesson_id UUID REFERENCES lessons(id),
ADD COLUMN IF NOT EXISTS current_lesson_language language_code DEFAULT 'en';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_course_enrollments_current_lesson 
ON course_enrollments(user_id, course_id, current_lesson_id);

-- Add comment for documentation
COMMENT ON COLUMN course_enrollments.current_lesson_id IS 'Tracks the current/last accessed lesson in this course for quick restoration';
COMMENT ON COLUMN course_enrollments.current_lesson_language IS 'The language version of the lesson being tracked';