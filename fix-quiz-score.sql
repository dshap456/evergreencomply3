-- Fix the missing quiz score for evergreentester1@gmail.com
-- This script updates the enrollment and creates the completion record

-- Update the final_score in course_enrollments
UPDATE course_enrollments
SET final_score = 100
WHERE user_id = '353d3f85-bde9-4caa-9a5e-4d1b5f940ea4'
  AND course_id = '5e6ae121-8f89-4786-95a6-1e823c21a22e';

-- Create course_completions entry if it doesn't exist
INSERT INTO course_completions (
  id,
  user_id,
  course_id,
  enrollment_id,
  student_name,
  student_email,
  course_name,
  final_quiz_score,
  final_quiz_passed,
  completion_percentage,
  completed_at
)
SELECT 
  gen_random_uuid(),
  ce.user_id,
  ce.course_id,
  ce.id,
  COALESCE(a.name, a.email),
  a.email,
  c.title,
  100, -- The quiz score from quiz_attempts
  true,
  100,
  ce.completed_at
FROM course_enrollments ce
JOIN accounts a ON a.primary_owner_user_id = ce.user_id
JOIN courses c ON c.id = ce.course_id
WHERE ce.user_id = '353d3f85-bde9-4caa-9a5e-4d1b5f940ea4'
  AND ce.course_id = '5e6ae121-8f89-4786-95a6-1e823c21a22e'
  AND NOT EXISTS (
    SELECT 1 FROM course_completions cc 
    WHERE cc.user_id = ce.user_id 
    AND cc.course_id = ce.course_id
  );

-- Verify the fix
SELECT 
  ce.user_id,
  a.email,
  c.title as course_title,
  ce.progress_percentage,
  ce.completed_at,
  ce.final_score,
  cc.final_quiz_score,
  cc.final_quiz_passed
FROM course_enrollments ce
LEFT JOIN accounts a ON a.primary_owner_user_id = ce.user_id
LEFT JOIN courses c ON c.id = ce.course_id
LEFT JOIN course_completions cc ON cc.user_id = ce.user_id AND cc.course_id = ce.course_id
WHERE ce.user_id = '353d3f85-bde9-4caa-9a5e-4d1b5f940ea4'
  AND ce.course_id = '5e6ae121-8f89-4786-95a6-1e823c21a22e';