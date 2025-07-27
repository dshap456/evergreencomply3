-- Diagnostic script to check course status migration

-- 1. Check current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'courses' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if status column exists and has data
SELECT 
    COUNT(*) as total_courses,
    COUNT(status) as courses_with_status,
    COUNT(CASE WHEN status = 'published' THEN 1 END) as published_courses,
    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_courses,
    COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_courses
FROM courses;

-- 3. Sample a few courses
SELECT id, title, status, created_at 
FROM courses 
LIMIT 5;

-- 4. Check if enum type exists
SELECT 
    n.nspname as schema,
    t.typname as type_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname = 'course_status';

-- 5. Check RLS policies on courses table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'courses'
ORDER BY policyname;