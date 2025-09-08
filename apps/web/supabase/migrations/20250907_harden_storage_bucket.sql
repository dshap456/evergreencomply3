-- Ensure legacy course-content bucket is private if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'course-content'
  ) THEN
    UPDATE storage.buckets
    SET public = false
    WHERE id = 'course-content';
  END IF;
END $$;

