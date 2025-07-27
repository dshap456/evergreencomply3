-- Add status column to courses table to properly handle draft, published, and archived states
-- This replaces the boolean is_published with a proper enum

-- Create the enum type for course status
CREATE TYPE public.course_status AS ENUM ('draft', 'published', 'archived');

-- Add the new status column (temporarily nullable)
ALTER TABLE public.courses 
ADD COLUMN status public.course_status;

-- Migrate existing data: is_published true -> published, false -> draft
UPDATE public.courses 
SET status = CASE 
    WHEN is_published = true THEN 'published'::public.course_status
    ELSE 'draft'::public.course_status
END;

-- Make status column NOT NULL after data migration
ALTER TABLE public.courses 
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN status SET DEFAULT 'draft'::public.course_status;

-- Drop the old is_published column
ALTER TABLE public.courses 
DROP COLUMN is_published;

-- Update the index to use the new status column
DROP INDEX IF EXISTS idx_courses_published;
CREATE INDEX idx_courses_status ON public.courses(status);

-- Add comment
COMMENT ON COLUMN public.courses.status IS 'Course publication status: draft, published, or archived';