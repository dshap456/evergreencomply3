-- Fix course slugs to match frontend URLs
-- This ensures the cart can properly identify courses

-- Update DOT HAZMAT General slug
UPDATE public.courses 
SET slug = 'dot-hazmat-general' 
WHERE slug = 'dot-hazmat' OR (
  billing_product_id = 'dot-hazmat' AND slug IS NULL
);

-- Update Advanced HAZMAT slug  
UPDATE public.courses 
SET slug = 'dot-hazmat-advanced' 
WHERE slug = 'advanced-hazmat' OR (
  billing_product_id = 'advanced-hazmat' AND slug IS NULL
);

-- Ensure EPA RCRA has correct slug (should already be correct)
UPDATE public.courses 
SET slug = 'epa-rcra' 
WHERE billing_product_id = 'epa-rcra' AND slug IS NULL;