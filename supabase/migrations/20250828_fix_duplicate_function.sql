-- Fix duplicate stored procedure issue
-- Drop the old version that returns JSONB and has 4 parameters
DROP FUNCTION IF EXISTS public.process_course_purchase_by_slug(text, uuid, text, integer);

-- Keep only the newer version with 5 parameters that returns JSON
-- This version includes customer_name parameter