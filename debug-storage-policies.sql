-- Debug: Check all storage policies that might reference courses
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';

-- Also check if there are any other policies that might be causing issues
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE qual LIKE '%courses%' OR with_check LIKE '%courses%';