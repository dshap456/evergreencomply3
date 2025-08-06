-- Fix the slug protection trigger to only protect specific courses, not all courses

-- Drop the overly restrictive trigger
DROP TRIGGER IF EXISTS protect_critical_slugs_trigger ON public.courses;
DROP FUNCTION IF EXISTS public.protect_critical_slugs();

-- Create a smarter protection function that only protects the 4 critical courses
CREATE OR REPLACE FUNCTION public.protect_critical_slugs()
RETURNS TRIGGER AS $$
BEGIN
  -- Only protect these specific course/slug combinations
  IF (OLD.title ILIKE '%DOT HAZMAT%General%' AND OLD.slug = 'dot-hazmat-general' AND NEW.slug != 'dot-hazmat-general') THEN
    RAISE NOTICE 'Protected: DOT HAZMAT General must keep slug dot-hazmat-general';
    NEW.slug := OLD.slug;
  ELSIF (OLD.title = 'DOT HAZMAT - 3' AND OLD.slug = 'dot-hazmat' AND NEW.slug != 'dot-hazmat') THEN
    RAISE NOTICE 'Protected: DOT HAZMAT - 3 must keep slug dot-hazmat';
    NEW.slug := OLD.slug;
  ELSIF (OLD.title ILIKE '%Advanced%HAZMAT%' AND OLD.slug = 'advanced-hazmat' AND NEW.slug != 'advanced-hazmat') THEN
    RAISE NOTICE 'Protected: Advanced HAZMAT must keep slug advanced-hazmat';
    NEW.slug := OLD.slug;
  ELSIF (OLD.title ILIKE '%EPA%RCRA%' AND OLD.slug = 'epa-rcra' AND NEW.slug != 'epa-rcra') THEN
    RAISE NOTICE 'Protected: EPA RCRA must keep slug epa-rcra';
    NEW.slug := OLD.slug;
  END IF;
  
  -- Allow all other slug updates
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger with better logic
CREATE TRIGGER protect_critical_slugs_trigger
BEFORE UPDATE ON public.courses
FOR EACH ROW
WHEN (OLD.slug IS DISTINCT FROM NEW.slug)  -- Only run when slug is being changed
EXECUTE FUNCTION public.protect_critical_slugs();

-- Add comment
COMMENT ON FUNCTION public.protect_critical_slugs() IS 
'Protects only the 4 critical course slugs that the frontend expects. Other courses can be updated freely.';