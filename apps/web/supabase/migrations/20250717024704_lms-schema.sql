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