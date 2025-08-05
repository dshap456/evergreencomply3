-- Script to verify course slugs after migration
-- Run this in Supabase SQL editor to check the results

-- 1. Show all published courses with their slugs
SELECT 
    id,
    title,
    slug,
    status,
    price,
    created_at
FROM public.courses
WHERE status = 'published'
ORDER BY created_at DESC;

-- 2. Show courses without slugs (should be none after migration)
SELECT 
    id,
    title,
    status
FROM public.courses
WHERE slug IS NULL OR slug = ''
ORDER BY created_at DESC;

-- 3. Show the slug mapping for verification
SELECT 
    title,
    slug,
    CASE 
        WHEN slug = 'dot-hazmat' THEN 'Maps to /courses/dot-hazmat'
        WHEN slug = 'advanced-hazmat' THEN 'Maps to /courses/advanced-hazmat'
        WHEN slug = 'epa-rcra' THEN 'Maps to /courses/epa-rcra'
        ELSE 'New course - will need frontend page'
    END as frontend_url
FROM public.courses
WHERE status = 'published'
ORDER BY slug;