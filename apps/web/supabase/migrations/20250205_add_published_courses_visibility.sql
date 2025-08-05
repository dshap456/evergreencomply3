-- Add RLS policy to allow all authenticated users to view published courses
-- This is needed for the seat management feature where teams can see all available courses

-- Add a policy that allows all authenticated users to see published courses
CREATE POLICY "courses_published_read_all" ON public.courses
    FOR SELECT TO authenticated
    USING (
        status = 'published'
    );

-- Add comment to document this change
COMMENT ON POLICY "courses_published_read_all" ON public.courses IS 
    'Allows all authenticated users to view published courses for browsing and seat management purposes';