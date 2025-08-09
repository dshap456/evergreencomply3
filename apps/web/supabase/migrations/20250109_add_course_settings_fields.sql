-- Add additional settings fields to courses table

-- Add category column
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Add SEO description column  
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS seo_description TEXT;

-- Add estimated duration column
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS estimated_duration VARCHAR(100);

-- Add bulk price column
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS bulk_price DECIMAL(10,2);

-- Add certificate enabled column
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS certificate_enabled BOOLEAN DEFAULT true;

-- Add progress tracking enabled column
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS progress_tracking_enabled BOOLEAN DEFAULT true;

-- Add time limit days column
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS time_limit_days INTEGER;

-- Add comments
COMMENT ON COLUMN public.courses.category IS 'Course category for organization and filtering';
COMMENT ON COLUMN public.courses.seo_description IS 'SEO-optimized description for search engines';
COMMENT ON COLUMN public.courses.estimated_duration IS 'Estimated time to complete the course';
COMMENT ON COLUMN public.courses.bulk_price IS 'Special pricing for bulk licenses';
COMMENT ON COLUMN public.courses.certificate_enabled IS 'Whether to generate certificates on completion';
COMMENT ON COLUMN public.courses.progress_tracking_enabled IS 'Whether to track student progress';
COMMENT ON COLUMN public.courses.time_limit_days IS 'Maximum days allowed to complete the course';