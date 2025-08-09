-- Add slug column to courses table for URL-friendly course identifiers

-- Add the slug column
ALTER TABLE public.courses 
ADD COLUMN slug VARCHAR(255);

-- Create index for slug lookups
CREATE INDEX idx_courses_slug ON public.courses(slug);

-- Add comment
COMMENT ON COLUMN public.courses.slug IS 'URL-friendly identifier for the course';

-- Update RLS policies if needed to include slug in selections
-- (The existing policies should already work since they use SELECT *)