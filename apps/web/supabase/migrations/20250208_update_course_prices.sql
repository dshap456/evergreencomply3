-- Update course prices to match what's displayed on the frontend

-- DOT HAZMAT - 3 (shows as DOT HAZMAT): $79
UPDATE public.courses 
SET price = 79
WHERE title = 'DOT HAZMAT - 3' OR slug = 'dot-hazmat';

-- DOT HAZMAT - General Awareness: $79 (assuming same as regular DOT HAZMAT)
UPDATE public.courses 
SET price = 79
WHERE title ILIKE '%DOT HAZMAT%General%' OR slug = 'dot-hazmat-general';

-- Advanced HAZMAT / Advanced Awareness: $179
UPDATE public.courses 
SET price = 179
WHERE title ILIKE '%Advanced%HAZMAT%' OR title = 'Advanced Awareness' OR slug = 'advanced-hazmat';

-- EPA - RCRA: $129
UPDATE public.courses 
SET price = 129
WHERE title ILIKE '%EPA%RCRA%' OR slug = 'epa-rcra';

-- Log the updates
DO $$
BEGIN
    RAISE NOTICE 'Course prices updated:';
    RAISE NOTICE 'DOT HAZMAT courses: $79';
    RAISE NOTICE 'Advanced HAZMAT: $179';
    RAISE NOTICE 'EPA RCRA: $129';
END $$;