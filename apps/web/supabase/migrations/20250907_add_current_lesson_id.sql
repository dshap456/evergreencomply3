-- Add explicit resume point to enrollments
-- Adds current_lesson_id to public.course_enrollments if missing

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'course_enrollments'
      AND column_name  = 'current_lesson_id'
  ) THEN
    ALTER TABLE public.course_enrollments
      ADD COLUMN current_lesson_id UUID REFERENCES public.lessons(id);
  END IF;
END $$;

-- Helpful index for resume lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname  = 'idx_course_enrollments_current_lesson_id'
  ) THEN
    CREATE INDEX idx_course_enrollments_current_lesson_id
      ON public.course_enrollments (current_lesson_id);
  END IF;
END $$;

