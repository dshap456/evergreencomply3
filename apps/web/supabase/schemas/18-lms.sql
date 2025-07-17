/*
 * -------------------------------------------------------
 * Section: Learning Management System (LMS)
 * Database schema for courses, lessons, modules, and progress tracking
 * Integrates with existing multi-tenant account architecture
 * -------------------------------------------------------
 */

-- LMS Enums
CREATE TYPE public.content_type AS ENUM('video', 'text', 'quiz', 'asset');
CREATE TYPE public.lesson_status AS ENUM('not_started', 'in_progress', 'completed');

-- Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE,
    price DECIMAL(10,2) DEFAULT 0.00,
    is_published BOOLEAN DEFAULT false,
    sequential_completion BOOLEAN DEFAULT true,
    passing_score INTEGER DEFAULT 80 CHECK (passing_score >= 0 AND passing_score <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Course Modules Table  
CREATE TABLE IF NOT EXISTS public.course_modules (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, order_index)
);

-- Lessons Table
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type public.content_type NOT NULL DEFAULT 'video',
    video_url TEXT,
    asset_url TEXT,
    content TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_final_quiz BOOLEAN DEFAULT false,
    passing_score INTEGER DEFAULT 80 CHECK (passing_score >= 0 AND passing_score <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(module_id, order_index)
);

-- Quiz Questions Table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'multiple_choice',
    options JSONB, -- Array of answer options for multiple choice
    correct_answer TEXT NOT NULL,
    points INTEGER DEFAULT 1,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lesson_id, order_index)
);

-- Course Enrollments Table
CREATE TABLE IF NOT EXISTS public.course_enrollments (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    final_score DECIMAL(5,2),
    UNIQUE(user_id, course_id)
);

-- Lesson Progress Table
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    status public.lesson_status DEFAULT 'not_started',
    completed_at TIMESTAMPTZ,
    time_spent INTEGER DEFAULT 0, -- seconds
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- Quiz Attempts Table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    answers JSONB NOT NULL, -- Store question_id -> answer mappings
    score DECIMAL(5,2) NOT NULL,
    total_points INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course Completions Table (for tracking completion certificates/records)
CREATE TABLE IF NOT EXISTS public.course_completions (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    student_email VARCHAR(320) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    final_quiz_score DECIMAL(5,2),
    final_quiz_passed BOOLEAN DEFAULT false,
    completion_percentage INTEGER DEFAULT 100,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    certificate_url TEXT,
    UNIQUE(user_id, course_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_account_id ON public.courses(account_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(is_published);
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON public.course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON public.lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_lesson_id ON public.quiz_questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON public.lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_lesson ON public.quiz_attempts(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_completions_user_id ON public.course_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_course_completions_course_id ON public.course_completions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_completions_completed_at ON public.course_completions(completed_at);

-- Enable RLS on all LMS tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Courses
CREATE POLICY "courses_read" ON public.courses FOR SELECT
    TO authenticated USING (
        -- Course owners (account members) can read
        public.has_role_on_account(account_id) OR
        -- Enrolled users can read published courses
        (is_published AND EXISTS (
            SELECT 1 FROM public.course_enrollments 
            WHERE course_id = courses.id AND user_id = auth.uid()
        ))
    );

CREATE POLICY "courses_manage" ON public.courses FOR ALL
    TO authenticated USING (
        public.has_permission(auth.uid(), account_id, 'settings.manage'::public.app_permissions)
    );

-- RLS Policies for Course Modules
CREATE POLICY "course_modules_read" ON public.course_modules FOR SELECT
    TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_modules.course_id 
            AND (
                public.has_role_on_account(c.account_id) OR
                (c.is_published AND EXISTS (
                    SELECT 1 FROM public.course_enrollments 
                    WHERE course_id = c.id AND user_id = auth.uid()
                ))
            )
        )
    );

CREATE POLICY "course_modules_manage" ON public.course_modules FOR ALL
    TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_modules.course_id 
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
    );

-- RLS Policies for Lessons
CREATE POLICY "lessons_read" ON public.lessons FOR SELECT
    TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.course_modules cm
            JOIN public.courses c ON c.id = cm.course_id
            WHERE cm.id = lessons.module_id 
            AND (
                public.has_role_on_account(c.account_id) OR
                (c.is_published AND EXISTS (
                    SELECT 1 FROM public.course_enrollments 
                    WHERE course_id = c.id AND user_id = auth.uid()
                ))
            )
        )
    );

CREATE POLICY "lessons_manage" ON public.lessons FOR ALL
    TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.course_modules cm
            JOIN public.courses c ON c.id = cm.course_id
            WHERE cm.id = lessons.module_id 
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
    );

-- RLS Policies for Quiz Questions
CREATE POLICY "quiz_questions_read" ON public.quiz_questions FOR SELECT
    TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE l.id = quiz_questions.lesson_id 
            AND (
                public.has_role_on_account(c.account_id) OR
                (c.is_published AND EXISTS (
                    SELECT 1 FROM public.course_enrollments 
                    WHERE course_id = c.id AND user_id = auth.uid()
                ))
            )
        )
    );

CREATE POLICY "quiz_questions_manage" ON public.quiz_questions FOR ALL
    TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE l.id = quiz_questions.lesson_id 
            AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
        )
    );

-- RLS Policies for Course Enrollments
CREATE POLICY "course_enrollments_read" ON public.course_enrollments FOR SELECT
    TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_enrollments.course_id 
            AND public.has_role_on_account(c.account_id)
        )
    );

CREATE POLICY "course_enrollments_insert" ON public.course_enrollments FOR INSERT
    TO authenticated WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_enrollments.course_id 
            AND c.is_published = true
        )
    );

CREATE POLICY "course_enrollments_update" ON public.course_enrollments FOR UPDATE
    TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_enrollments.course_id 
            AND public.has_role_on_account(c.account_id)
        )
    );

-- RLS Policies for Lesson Progress
CREATE POLICY "lesson_progress_manage" ON public.lesson_progress FOR ALL
    TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE l.id = lesson_progress.lesson_id 
            AND public.has_role_on_account(c.account_id)
        )
    );

-- RLS Policies for Quiz Attempts
CREATE POLICY "quiz_attempts_manage" ON public.quiz_attempts FOR ALL
    TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.course_modules cm ON cm.id = l.module_id
            JOIN public.courses c ON c.id = cm.course_id
            WHERE l.id = quiz_attempts.lesson_id 
            AND public.has_role_on_account(c.account_id)
        )
    );

-- RLS Policies for Course Completions
CREATE POLICY "course_completions_read" ON public.course_completions FOR SELECT
    TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_completions.course_id 
            AND public.has_role_on_account(c.account_id)
        )
    );

CREATE POLICY "course_completions_insert" ON public.course_completions FOR INSERT
    TO authenticated WITH CHECK (
        user_id = auth.uid()
    );

CREATE POLICY "course_completions_update" ON public.course_completions FOR UPDATE
    TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_completions.course_id 
            AND public.has_role_on_account(c.account_id)
        )
    );

-- Functions for LMS operations

-- Function to check if a lesson is accessible (sequential completion logic)
CREATE OR REPLACE FUNCTION public.is_lesson_accessible(
    p_user_id UUID,
    p_lesson_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_course_id UUID;
    v_sequential_completion BOOLEAN;
    v_lesson_order INTEGER;
    v_module_id UUID;
    v_previous_lessons_completed BOOLEAN := true;
BEGIN
    -- Get course and lesson info
    SELECT 
        c.id,
        c.sequential_completion,
        l.order_index,
        l.module_id
    INTO 
        v_course_id,
        v_sequential_completion,
        v_lesson_order,
        v_module_id
    FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.module_id
    JOIN public.courses c ON c.id = cm.course_id
    WHERE l.id = p_lesson_id;
    
    -- If not sequential completion, all lessons are accessible
    IF NOT v_sequential_completion THEN
        RETURN true;
    END IF;
    
    -- Check if user is enrolled
    IF NOT EXISTS (
        SELECT 1 FROM public.course_enrollments 
        WHERE user_id = p_user_id AND course_id = v_course_id
    ) THEN
        RETURN false;
    END IF;
    
    -- Check if all previous lessons in the same module are completed
    SELECT INTO v_previous_lessons_completed
        NOT EXISTS (
            SELECT 1 FROM public.lessons l
            LEFT JOIN public.lesson_progress lp ON (
                lp.lesson_id = l.id AND lp.user_id = p_user_id
            )
            WHERE l.module_id = v_module_id
            AND l.order_index < v_lesson_order
            AND (lp.status IS NULL OR lp.status != 'completed')
        );
    
    RETURN v_previous_lessons_completed;
END;
$$;

-- Function to calculate course progress
CREATE OR REPLACE FUNCTION public.calculate_course_progress(
    p_user_id UUID,
    p_course_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_total_lessons INTEGER;
    v_completed_lessons INTEGER;
    v_progress INTEGER;
BEGIN
    -- Count total lessons in course
    SELECT COUNT(*) INTO v_total_lessons
    FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.module_id
    WHERE cm.course_id = p_course_id;
    
    -- Count completed lessons
    SELECT COUNT(*) INTO v_completed_lessons
    FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.module_id
    JOIN public.lesson_progress lp ON lp.lesson_id = l.id
    WHERE cm.course_id = p_course_id
    AND lp.user_id = p_user_id
    AND lp.status = 'completed';
    
    -- Calculate percentage
    IF v_total_lessons = 0 THEN
        v_progress := 0;
    ELSE
        v_progress := ROUND((v_completed_lessons::DECIMAL / v_total_lessons::DECIMAL) * 100);
    END IF;
    
    -- Update enrollment progress
    UPDATE public.course_enrollments
    SET progress_percentage = v_progress,
        updated_at = NOW()
    WHERE user_id = p_user_id AND course_id = p_course_id;
    
    RETURN v_progress;
END;
$$;

-- Function to get the best quiz attempt
CREATE OR REPLACE FUNCTION public.get_best_quiz_attempt(
    p_user_id UUID,
    p_lesson_id UUID
) RETURNS public.quiz_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_attempt public.quiz_attempts;
BEGIN
    SELECT * INTO v_attempt
    FROM public.quiz_attempts
    WHERE user_id = p_user_id AND lesson_id = p_lesson_id
    ORDER BY score DESC, created_at DESC
    LIMIT 1;
    
    RETURN v_attempt;
END;
$$;

-- Function to complete a course and create completion record
CREATE OR REPLACE FUNCTION public.complete_course(
    p_user_id UUID,
    p_course_id UUID
) RETURNS public.course_completions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_enrollment public.course_enrollments;
    v_course public.courses;
    v_user_profile RECORD;
    v_final_quiz_lesson UUID;
    v_final_quiz_attempt public.quiz_attempts;
    v_completion public.course_completions;
    v_progress INTEGER;
BEGIN
    -- Get enrollment info
    SELECT * INTO v_enrollment
    FROM public.course_enrollments
    WHERE user_id = p_user_id AND course_id = p_course_id;
    
    IF v_enrollment IS NULL THEN
        RAISE EXCEPTION 'User is not enrolled in this course';
    END IF;
    
    -- Get course info
    SELECT * INTO v_course
    FROM public.courses
    WHERE id = p_course_id;
    
    -- Get user profile info
    SELECT 
        COALESCE(u.raw_user_meta_data->>'name', u.email) as name,
        u.email
    INTO v_user_profile
    FROM auth.users u
    WHERE u.id = p_user_id;
    
    -- Calculate current progress
    v_progress := public.calculate_course_progress(p_user_id, p_course_id);
    
    -- Only complete if progress is 100%
    IF v_progress < 100 THEN
        RAISE EXCEPTION 'Course not fully completed. Progress: %', v_progress;
    END IF;
    
    -- Find final quiz lesson
    SELECT l.id INTO v_final_quiz_lesson
    FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.module_id
    WHERE cm.course_id = p_course_id 
    AND l.is_final_quiz = true
    ORDER BY cm.order_index DESC, l.order_index DESC
    LIMIT 1;
    
    -- Get final quiz attempt if exists
    IF v_final_quiz_lesson IS NOT NULL THEN
        v_final_quiz_attempt := public.get_best_quiz_attempt(p_user_id, v_final_quiz_lesson);
    END IF;
    
    -- Create or update completion record
    INSERT INTO public.course_completions (
        user_id,
        course_id,
        enrollment_id,
        student_name,
        student_email,
        course_name,
        final_quiz_score,
        final_quiz_passed,
        completion_percentage,
        completed_at
    ) VALUES (
        p_user_id,
        p_course_id,
        v_enrollment.id,
        v_user_profile.name,
        v_user_profile.email,
        v_course.title,
        COALESCE(v_final_quiz_attempt.score, NULL),
        COALESCE(v_final_quiz_attempt.passed, false),
        v_progress,
        NOW()
    )
    ON CONFLICT (user_id, course_id) 
    DO UPDATE SET
        final_quiz_score = EXCLUDED.final_quiz_score,
        final_quiz_passed = EXCLUDED.final_quiz_passed,
        completion_percentage = EXCLUDED.completion_percentage,
        completed_at = EXCLUDED.completed_at
    RETURNING * INTO v_completion;
    
    -- Update enrollment as completed
    UPDATE public.course_enrollments
    SET 
        completed_at = NOW(),
        final_score = COALESCE(v_final_quiz_attempt.score, NULL),
        progress_percentage = v_progress
    WHERE id = v_enrollment.id;
    
    RETURN v_completion;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.is_lesson_accessible(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_course_progress(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_best_quiz_attempt(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_course(UUID, UUID) TO authenticated;

-- Note: LMS permissions will be added separately as the enum modification
-- needs to be done in a separate transaction

-- Storage bucket for course content
INSERT INTO storage.buckets (id, name, PUBLIC)
VALUES ('course-content', 'course-content', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for course content storage
CREATE POLICY course_content_access ON storage.objects FOR ALL
USING (
    bucket_id = 'course-content'
    AND (
        -- Course creators can manage their content
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE (
                split_part(name, '/', 1) = c.account_id::text
                AND public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
            )
        )
        OR
        -- Enrolled students can read content
        EXISTS (
            SELECT 1 FROM public.courses c
            JOIN public.course_enrollments ce ON ce.course_id = c.id
            WHERE (
                split_part(name, '/', 1) = c.account_id::text
                AND ce.user_id = auth.uid()
                AND c.is_published = true
            )
        )
    )
);