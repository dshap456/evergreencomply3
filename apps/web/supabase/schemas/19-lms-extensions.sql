/*
 * -------------------------------------------------------
 * Section: LMS Extensions
 * Additional schema to support:
 * - Course versioning with hot-swap capability
 * - Multi-language content support
 * - Purchase/license management
 * - Enhanced progress tracking
 * - Role-based access control for LMS
 * -------------------------------------------------------
 */

-- Additional LMS Enums
CREATE TYPE public.language_code AS ENUM('en', 'es');
CREATE TYPE public.license_status AS ENUM('available', 'assigned', 'completed', 'expired');
CREATE TYPE public.purchase_type AS ENUM('individual', 'bulk');

-- Course Versions Table (for versioning system)
CREATE TABLE IF NOT EXISTS public.course_versions (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    version_number VARCHAR(50) NOT NULL, -- e.g., "1.0", "1.1", "2.0"
    version_name VARCHAR(255), -- e.g., "Initial Release", "Updated Content"
    is_current BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(course_id, version_number)
);

-- Multi-language Content Table
CREATE TABLE IF NOT EXISTS public.course_content_translations (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    language_code public.language_code NOT NULL,
    title VARCHAR(255),
    description TEXT,
    content TEXT,
    video_url TEXT,
    asset_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lesson_id, language_code)
);

-- Quiz Question Translations
CREATE TABLE IF NOT EXISTS public.quiz_question_translations (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    language_code public.language_code NOT NULL,
    question TEXT NOT NULL,
    options JSONB, -- Translated answer options
    correct_answer TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(question_id, language_code)
);

-- Course Purchases Table (for bulk purchase management)
CREATE TABLE IF NOT EXISTS public.course_purchases (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    purchaser_user_id UUID NOT NULL REFERENCES auth.users(id),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255),
    purchase_type public.purchase_type NOT NULL DEFAULT 'individual',
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course Licenses Table (individual seats from bulk purchases)
CREATE TABLE IF NOT EXISTS public.course_licenses (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    purchase_id UUID NOT NULL REFERENCES public.course_purchases(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    course_version_id UUID REFERENCES public.course_versions(id),
    assigned_user_id UUID REFERENCES auth.users(id),
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ,
    status public.license_status DEFAULT 'available',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video Progress Tracking (enhanced)
CREATE TABLE IF NOT EXISTS public.video_progress (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    current_time INTEGER DEFAULT 0, -- seconds into video
    duration INTEGER DEFAULT 0, -- total video duration in seconds
    watched_percentage DECIMAL(5,2) DEFAULT 0.00,
    last_watched_at TIMESTAMPTZ DEFAULT NOW(),
    device_info JSONB, -- store device/browser info for cross-device sync
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- User Language Preferences per Course
CREATE TABLE IF NOT EXISTS public.user_course_language_preferences (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    language_code public.language_code NOT NULL DEFAULT 'en',
    selected_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- Enhanced Course Enrollments (track version and language)
ALTER TABLE public.course_enrollments 
ADD COLUMN IF NOT EXISTS course_version_id UUID REFERENCES public.course_versions(id),
ADD COLUMN IF NOT EXISTS language_preference public.language_code DEFAULT 'en',
ADD COLUMN IF NOT EXISTS license_id UUID REFERENCES public.course_licenses(id);

-- Enhanced Lesson Progress (track video progress)
ALTER TABLE public.lesson_progress
ADD COLUMN IF NOT EXISTS video_progress_id UUID REFERENCES public.video_progress(id),
ADD COLUMN IF NOT EXISTS last_video_position INTEGER DEFAULT 0;

-- Add LMS-specific permissions to the enum (this needs to be in a separate migration)
-- The following would need to be added to the app_permissions enum:
-- 'courses.manage', 'courses.assign', 'courses.report', 'courses.purchase'

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_versions_course_id ON public.course_versions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_versions_current ON public.course_versions(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_content_translations_lesson_lang ON public.course_content_translations(lesson_id, language_code);
CREATE INDEX IF NOT EXISTS idx_question_translations_question_lang ON public.quiz_question_translations(question_id, language_code);
CREATE INDEX IF NOT EXISTS idx_course_purchases_account ON public.course_purchases(account_id);
CREATE INDEX IF NOT EXISTS idx_course_purchases_purchaser ON public.course_purchases(purchaser_user_id);
CREATE INDEX IF NOT EXISTS idx_course_licenses_purchase ON public.course_licenses(purchase_id);
CREATE INDEX IF NOT EXISTS idx_course_licenses_assigned_user ON public.course_licenses(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_course_licenses_status ON public.course_licenses(status);
CREATE INDEX IF NOT EXISTS idx_video_progress_user_lesson ON public.video_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_language_prefs ON public.user_course_language_preferences(user_id, course_id);

-- Enable RLS on new tables
ALTER TABLE public.course_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_content_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_question_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_course_language_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Course Versions
CREATE POLICY "course_versions_read" ON public.course_versions FOR SELECT
    TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_versions.course_id 
            AND (
                public.has_role_on_account(c.account_id) OR
                (is_published AND EXISTS (
                    SELECT 1 FROM public.course_enrollments 
                    WHERE course_id = c.id AND user_id = auth.uid()
                ))
            )
        )
    );

CREATE POLICY "course_versions_manage" ON public.course_versions FOR ALL
    TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_versions.course_id 
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
    );

-- RLS Policies for Content Translations
CREATE POLICY "content_translations_read" ON public.course_content_translations FOR SELECT
    TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE l.id = course_content_translations.lesson_id 
            AND (
                public.has_role_on_account(c.account_id) OR
                (c.is_published AND EXISTS (
                    SELECT 1 FROM public.course_enrollments 
                    WHERE course_id = c.id AND user_id = auth.uid()
                ))
            )
        )
    );

CREATE POLICY "content_translations_manage" ON public.course_content_translations FOR ALL
    TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE l.id = course_content_translations.lesson_id 
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
    );

-- RLS Policies for Quiz Question Translations
CREATE POLICY "question_translations_read" ON public.quiz_question_translations FOR SELECT
    TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.quiz_questions qq
            JOIN public.lessons l ON l.id = qq.lesson_id
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE qq.id = quiz_question_translations.question_id 
            AND (
                public.has_role_on_account(c.account_id) OR
                (c.is_published AND EXISTS (
                    SELECT 1 FROM public.course_enrollments 
                    WHERE course_id = c.id AND user_id = auth.uid()
                ))
            )
        )
    );

CREATE POLICY "question_translations_manage" ON public.quiz_question_translations FOR ALL
    TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.quiz_questions qq
            JOIN public.lessons l ON l.id = qq.lesson_id
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE qq.id = quiz_question_translations.question_id 
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
    );

-- RLS Policies for Course Purchases
CREATE POLICY "course_purchases_read" ON public.course_purchases FOR SELECT
    TO authenticated USING (
        purchaser_user_id = auth.uid() OR
        public.has_role_on_account(account_id)
    );

CREATE POLICY "course_purchases_insert" ON public.course_purchases FOR INSERT
    TO authenticated WITH CHECK (
        purchaser_user_id = auth.uid() AND
        public.has_role_on_account(account_id)
    );

-- RLS Policies for Course Licenses
CREATE POLICY "course_licenses_read" ON public.course_licenses FOR SELECT
    TO authenticated USING (
        assigned_user_id = auth.uid() OR
        assigned_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.course_purchases cp 
            WHERE cp.id = course_licenses.purchase_id 
            AND (
                cp.purchaser_user_id = auth.uid() OR
                public.has_role_on_account(cp.account_id)
            )
        )
    );

CREATE POLICY "course_licenses_manage" ON public.course_licenses FOR ALL
    TO authenticated USING (
        assigned_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.course_purchases cp 
            WHERE cp.id = course_licenses.purchase_id 
            AND (
                cp.purchaser_user_id = auth.uid() OR
                public.has_role_on_account(cp.account_id)
            )
        )
    );

-- RLS Policies for Video Progress
CREATE POLICY "video_progress_manage" ON public.video_progress FOR ALL
    TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE l.id = video_progress.lesson_id 
            AND public.has_role_on_account(c.account_id)
        )
    );

-- RLS Policies for User Language Preferences
CREATE POLICY "language_preferences_manage" ON public.user_course_language_preferences FOR ALL
    TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = user_course_language_preferences.course_id 
            AND public.has_role_on_account(c.account_id)
        )
    );

-- Functions for LMS Extensions

-- Function to get current course version
CREATE OR REPLACE FUNCTION public.get_current_course_version(p_course_id UUID)
RETURNS public.course_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_version public.course_versions;
BEGIN
    SELECT * INTO v_version
    FROM public.course_versions
    WHERE course_id = p_course_id 
    AND is_current = true
    LIMIT 1;
    
    RETURN v_version;
END;
$$;

-- Function to assign course license to user
CREATE OR REPLACE FUNCTION public.assign_course_license(
    p_license_id UUID,
    p_user_email VARCHAR(320),
    p_assigned_by UUID
) RETURNS public.course_licenses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_license public.course_licenses;
    v_user_id UUID;
    v_course_version_id UUID;
BEGIN
    -- Get or create user by email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_user_email;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', p_user_email;
    END IF;
    
    -- Get current course version
    SELECT cv.id INTO v_course_version_id
    FROM public.course_licenses cl
    JOIN public.course_versions cv ON cv.course_id = cl.course_id
    WHERE cl.id = p_license_id AND cv.is_current = true;
    
    -- Update license assignment
    UPDATE public.course_licenses
    SET 
        assigned_user_id = v_user_id,
        assigned_by = p_assigned_by,
        assigned_at = NOW(),
        status = 'assigned',
        course_version_id = v_course_version_id
    WHERE id = p_license_id
    AND status = 'available'
    RETURNING * INTO v_license;
    
    IF v_license IS NULL THEN
        RAISE EXCEPTION 'License not available for assignment';
    END IF;
    
    -- Create course enrollment
    INSERT INTO public.course_enrollments (
        user_id,
        course_id,
        course_version_id,
        license_id,
        enrolled_at
    ) VALUES (
        v_user_id,
        v_license.course_id,
        v_license.course_version_id,
        v_license.id,
        NOW()
    ) ON CONFLICT (user_id, course_id) DO NOTHING;
    
    RETURN v_license;
END;
$$;

-- Function to update video progress with cross-device sync
CREATE OR REPLACE FUNCTION public.update_video_progress(
    p_user_id UUID,
    p_lesson_id UUID,
    p_current_time INTEGER,
    p_duration INTEGER,
    p_device_info JSONB DEFAULT NULL
) RETURNS public.video_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_progress public.video_progress;
    v_watched_percentage DECIMAL(5,2);
BEGIN
    -- Calculate watched percentage
    IF p_duration > 0 THEN
        v_watched_percentage := LEAST(100.00, (p_current_time::DECIMAL / p_duration::DECIMAL) * 100);
    ELSE
        v_watched_percentage := 0.00;
    END IF;
    
    -- Insert or update video progress
    INSERT INTO public.video_progress (
        user_id,
        lesson_id,
        current_time,
        duration,
        watched_percentage,
        device_info,
        last_watched_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_lesson_id,
        p_current_time,
        p_duration,
        v_watched_percentage,
        p_device_info,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, lesson_id) 
    DO UPDATE SET
        current_time = GREATEST(video_progress.current_time, EXCLUDED.current_time),
        duration = COALESCE(EXCLUDED.duration, video_progress.duration),
        watched_percentage = GREATEST(video_progress.watched_percentage, EXCLUDED.watched_percentage),
        device_info = COALESCE(EXCLUDED.device_info, video_progress.device_info),
        last_watched_at = EXCLUDED.last_watched_at,
        updated_at = EXCLUDED.updated_at
    RETURNING * INTO v_progress;
    
    -- Update lesson progress if video is substantially watched (>80%)
    IF v_progress.watched_percentage >= 80.0 THEN
        INSERT INTO public.lesson_progress (
            user_id,
            lesson_id,
            status,
            video_progress_id,
            last_video_position,
            updated_at
        ) VALUES (
            p_user_id,
            p_lesson_id,
            'completed',
            v_progress.id,
            p_current_time,
            NOW()
        )
        ON CONFLICT (user_id, lesson_id)
        DO UPDATE SET
            status = 'completed',
            video_progress_id = EXCLUDED.video_progress_id,
            last_video_position = EXCLUDED.last_video_position,
            updated_at = EXCLUDED.updated_at;
    END IF;
    
    RETURN v_progress;
END;
$$;

-- Function to get localized content
CREATE OR REPLACE FUNCTION public.get_localized_lesson_content(
    p_lesson_id UUID,
    p_language_code public.language_code DEFAULT 'en'
) RETURNS TABLE (
    lesson_id UUID,
    title VARCHAR(255),
    description TEXT,
    content TEXT,
    video_url TEXT,
    asset_url TEXT,
    language_code public.language_code
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as lesson_id,
        COALESCE(ct.title, l.title) as title,
        COALESCE(ct.description, l.description) as description,
        COALESCE(ct.content, l.content) as content,
        COALESCE(ct.video_url, l.video_url) as video_url,
        COALESCE(ct.asset_url, l.asset_url) as asset_url,
        p_language_code as language_code
    FROM public.lessons l
    LEFT JOIN public.course_content_translations ct ON (
        ct.lesson_id = l.id 
        AND ct.language_code = p_language_code
    )
    WHERE l.id = p_lesson_id;
END;
$$;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.get_current_course_version(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_course_license(UUID, VARCHAR, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_video_progress(UUID, UUID, INTEGER, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_localized_lesson_content(UUID, public.language_code) TO authenticated;

-- Storage policy for versioned content
CREATE POLICY versioned_course_content_access ON storage.objects FOR ALL
USING (
    bucket_id = 'course-content'
    AND (
        -- Course creators can manage their versioned content
        EXISTS (
            SELECT 1 FROM public.courses c
            JOIN public.course_versions cv ON cv.course_id = c.id
            WHERE (
                split_part(name, '/', 1) = c.account_id::text
                AND split_part(name, '/', 2) = cv.id::text
                AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
            )
        )
        OR
        -- Enrolled students can read content from their enrolled version
        EXISTS (
            SELECT 1 FROM public.courses c
            JOIN public.course_enrollments ce ON ce.course_id = c.id
            JOIN public.course_versions cv ON cv.id = ce.course_version_id
            WHERE (
                split_part(name, '/', 1) = c.account_id::text
                AND split_part(name, '/', 2) = cv.id::text
                AND ce.user_id = auth.uid()
                AND c.is_published = true
            )
        )
    )
);