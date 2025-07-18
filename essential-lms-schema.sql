-- Essential LMS Schema for Admin Interface
-- This creates the minimum tables needed for the LMS admin to work

-- LMS Enums
CREATE TYPE IF NOT EXISTS public.content_type AS ENUM('video', 'text', 'quiz', 'asset');
CREATE TYPE IF NOT EXISTS public.lesson_status AS ENUM('not_started', 'in_progress', 'completed');

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
    duration_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(module_id, order_index)
);

-- Enable RLS on all tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for super admin access
CREATE POLICY "Super admins can manage all courses" ON public.courses
    FOR ALL USING (
        (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'super-admin'
    );

CREATE POLICY "Super admins can manage all modules" ON public.course_modules
    FOR ALL USING (
        (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'super-admin'
    );

CREATE POLICY "Super admins can manage all lessons" ON public.lessons
    FOR ALL USING (
        (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'super-admin'
    );

-- Grant permissions
GRANT ALL ON public.courses TO authenticated, service_role;
GRANT ALL ON public.course_modules TO authenticated, service_role;
GRANT ALL ON public.lessons TO authenticated, service_role;