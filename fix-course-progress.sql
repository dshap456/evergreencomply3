-- Fix for course progress not being saved when navigating away
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Add current_lesson_id to course_enrollments to reliably track course position
ALTER TABLE course_enrollments 
ADD COLUMN IF NOT EXISTS current_lesson_id UUID REFERENCES lessons(id),
ADD COLUMN IF NOT EXISTS current_lesson_language language_code DEFAULT 'en';

-- Step 2: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_course_enrollments_current_lesson 
ON course_enrollments(user_id, course_id, current_lesson_id);

-- Step 3: Add documentation
COMMENT ON COLUMN course_enrollments.current_lesson_id IS 'Tracks the current/last accessed lesson in this course for quick restoration';
COMMENT ON COLUMN course_enrollments.current_lesson_language IS 'The language version of the lesson being tracked';

-- Step 4: Migrate existing data (optional - populate from last accessed lessons)
UPDATE course_enrollments ce
SET current_lesson_id = (
    SELECT lp.lesson_id
    FROM lesson_progress lp
    INNER JOIN lessons l ON lp.lesson_id = l.id
    INNER JOIN course_modules cm ON l.module_id = cm.id
    WHERE lp.user_id = ce.user_id
    AND cm.course_id = ce.course_id
    AND lp.language = 'en'
    ORDER BY lp.last_accessed DESC NULLS LAST, lp.updated_at DESC
    LIMIT 1
),
current_lesson_language = 'en'
WHERE current_lesson_id IS NULL
AND EXISTS (
    SELECT 1
    FROM lesson_progress lp
    INNER JOIN lessons l ON lp.lesson_id = l.id
    INNER JOIN course_modules cm ON l.module_id = cm.id
    WHERE lp.user_id = ce.user_id
    AND cm.course_id = ce.course_id
);

-- Verify the changes
SELECT 
    ce.id,
    ce.user_id,
    ce.course_id,
    ce.current_lesson_id,
    ce.current_lesson_language,
    c.title as course_title,
    l.title as current_lesson_title
FROM course_enrollments ce
LEFT JOIN courses c ON ce.course_id = c.id
LEFT JOIN lessons l ON ce.current_lesson_id = l.id
LIMIT 10;