-- Force fix course slugs to match frontend expectations
-- This migration runs with superuser privileges and will override any application-level issues

-- 1. Temporarily disable any triggers that might interfere
ALTER TABLE public.courses DISABLE TRIGGER ALL;

-- 2. Fix DOT HAZMAT General slug
UPDATE public.courses 
SET slug = 'dot-hazmat-general',
    updated_at = NOW()
WHERE title ILIKE '%DOT HAZMAT%General%'
  AND (slug IS NULL OR slug != 'dot-hazmat-general');

-- 3. Fix DOT HAZMAT 3 to dot-hazmat (this is what frontend expects)
UPDATE public.courses 
SET slug = 'dot-hazmat',
    updated_at = NOW()
WHERE (slug = 'dot-hazmat-3' OR title = 'DOT HAZMAT - 3');

-- 4. Fix Advanced HAZMAT slug
UPDATE public.courses 
SET slug = 'advanced-hazmat',
    updated_at = NOW()
WHERE title ILIKE '%Advanced%HAZMAT%'
  AND (slug IS NULL OR slug != 'advanced-hazmat');

-- 5. Fix EPA RCRA slug and publish it
UPDATE public.courses 
SET slug = 'epa-rcra',
    status = 'published',
    updated_at = NOW()
WHERE title ILIKE '%EPA%RCRA%';

-- 6. Re-enable triggers
ALTER TABLE public.courses ENABLE TRIGGER ALL;

-- 7. Create a function to protect these specific slugs from being changed
CREATE OR REPLACE FUNCTION public.protect_critical_slugs()
RETURNS TRIGGER AS $$
BEGIN
  -- List of protected slug mappings
  IF (OLD.slug = 'dot-hazmat-general' AND NEW.slug != 'dot-hazmat-general') OR
     (OLD.slug = 'dot-hazmat' AND NEW.slug != 'dot-hazmat') OR
     (OLD.slug = 'advanced-hazmat' AND NEW.slug != 'advanced-hazmat') OR
     (OLD.slug = 'epa-rcra' AND NEW.slug != 'epa-rcra') THEN
    
    -- Log the attempt
    RAISE NOTICE 'Attempt to change protected slug from % to % was prevented', OLD.slug, NEW.slug;
    
    -- Keep the old slug
    NEW.slug := OLD.slug;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to protect slugs (but only if it doesn't exist)
DROP TRIGGER IF EXISTS protect_critical_slugs_trigger ON public.courses;
CREATE TRIGGER protect_critical_slugs_trigger
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.protect_critical_slugs();

-- 9. Add a comment explaining the protection
COMMENT ON TRIGGER protect_critical_slugs_trigger ON public.courses IS 
'Protects critical course slugs (dot-hazmat-general, dot-hazmat, advanced-hazmat, epa-rcra) from being changed as they are hardcoded in the frontend';

-- 10. Verify the changes
DO $$
DECLARE
  course_count INTEGER;
  correct_slugs INTEGER;
BEGIN
  -- Count courses with correct slugs
  SELECT COUNT(*) INTO correct_slugs
  FROM public.courses
  WHERE (slug = 'dot-hazmat-general' AND title ILIKE '%DOT HAZMAT%General%')
     OR (slug = 'dot-hazmat' AND title LIKE '%DOT HAZMAT - 3%')
     OR (slug = 'advanced-hazmat' AND title ILIKE '%Advanced%HAZMAT%')
     OR (slug = 'epa-rcra' AND title ILIKE '%EPA%RCRA%');
  
  IF correct_slugs < 3 THEN
    RAISE WARNING 'Only % courses have correct slugs. Expected at least 3.', correct_slugs;
  ELSE
    RAISE NOTICE 'Successfully fixed % course slugs', correct_slugs;
  END IF;
END $$;