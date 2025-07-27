-- Emergency rollback script to restore is_published column
-- Only run this if absolutely necessary!

-- 1. First add back the is_published column
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- 2. Populate it based on status
UPDATE public.courses 
SET is_published = CASE 
    WHEN status = 'published' THEN true
    ELSE false
END
WHERE status IS NOT NULL;

-- 3. Make it NOT NULL
ALTER TABLE public.courses 
ALTER COLUMN is_published SET NOT NULL;

-- 4. Drop the status column (commented out for safety - uncomment if needed)
-- ALTER TABLE public.courses DROP COLUMN status;

-- 5. Drop the enum type (commented out for safety - uncomment if needed)
-- DROP TYPE IF EXISTS public.course_status;

-- 6. Recreate the old index
CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(is_published);
DROP INDEX IF EXISTS idx_courses_status;

-- 7. You'll need to manually recreate the RLS policies that reference is_published
-- Check the pg_policies output from the diagnostic script to see what needs to be recreated