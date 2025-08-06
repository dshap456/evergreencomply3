-- Fix specific course slugs to match frontend expectations
-- This runs with superuser privileges during migration

-- 1. Fix Advanced HAZMAT slug
UPDATE public.courses 
SET slug = 'advanced-hazmat'
WHERE id = '5e6ae121-8f89-4786-95a6-1e823c21a22e'
  AND slug = 'dot-hazmat---advanced-awareness';

-- 2. Publish EPA RCRA course
UPDATE public.courses 
SET status = 'published'
WHERE slug = 'epa-rcra'
  AND status = 'draft';

-- 3. Ensure all expected courses are published with correct slugs
UPDATE public.courses
SET slug = CASE 
    WHEN title ILIKE '%Advanced%' AND title ILIKE '%HAZMAT%' THEN 'advanced-hazmat'
    WHEN title = 'EPA RCRA' THEN 'epa-rcra'
    ELSE slug
  END,
  status = 'published'
WHERE slug IN ('dot-hazmat---advanced-awareness', 'epa-rcra')
  OR (title IN ('DOT HAZMAT - Advanced Awareness', 'EPA RCRA') AND status = 'draft');

-- 4. Add a comment to help future debugging
COMMENT ON COLUMN public.courses.slug IS 'URL-friendly identifier. Note: Updates require settings.manage permission due to RLS policy.';