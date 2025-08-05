-- Add slug field to courses table for URL-friendly identifiers
-- This creates a permanent link between frontend URLs and database courses

-- 1. Add the slug column
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

-- 2. Create unique constraint for slug
-- This ensures no duplicate URLs
ALTER TABLE public.courses
ADD CONSTRAINT courses_slug_unique UNIQUE (slug);

-- 3. Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);

-- 4. Add comment to document the purpose
COMMENT ON COLUMN public.courses.slug IS 'URL-friendly identifier for the course. Used in frontend URLs like /courses/dot-hazmat-general';

-- 5. Update existing courses with slugs based on their titles
-- These match the current frontend URLs
UPDATE public.courses 
SET slug = 'dot-hazmat' 
WHERE status = 'published' 
  AND (title ILIKE '%DOT%' AND title ILIKE '%HAZMAT%' AND (title ILIKE '%General%' OR title ILIKE '%3%'))
  AND slug IS NULL;

UPDATE public.courses 
SET slug = 'advanced-hazmat' 
WHERE status = 'published' 
  AND title ILIKE '%Advanced%' 
  AND title ILIKE '%HAZMAT%'
  AND slug IS NULL;

UPDATE public.courses 
SET slug = 'epa-rcra' 
WHERE status = 'published' 
  AND title ILIKE '%EPA%' 
  AND title ILIKE '%RCRA%'
  AND slug IS NULL;

-- 6. Create function to generate slug from title
CREATE OR REPLACE FUNCTION public.generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          title,
          '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special characters
        ),
        '\s+', '-', 'g'  -- Replace spaces with hyphens
      ),
      '-+', '-', 'g'  -- Replace multiple hyphens with single
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Add trigger to auto-generate slug if not provided
CREATE OR REPLACE FUNCTION public.auto_generate_course_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Only generate if slug is not provided
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- Generate base slug from title
    base_slug := public.generate_slug(NEW.title);
    final_slug := base_slug;
    
    -- Check for duplicates and append number if needed
    WHILE EXISTS (SELECT 1 FROM public.courses WHERE slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for new courses
CREATE TRIGGER generate_course_slug_on_insert
BEFORE INSERT ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_course_slug();

-- 9. Create trigger for updates (only if title changes)
CREATE TRIGGER generate_course_slug_on_update
BEFORE UPDATE ON public.courses
FOR EACH ROW
WHEN (NEW.title != OLD.title AND (NEW.slug IS NULL OR NEW.slug = OLD.slug))
EXECUTE FUNCTION public.auto_generate_course_slug();

-- 10. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.generate_slug(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auto_generate_course_slug() TO authenticated, service_role;