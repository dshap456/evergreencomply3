-- Create test LMS data for video upload testing
-- This script creates a test course, module, and lessons using your existing account

-- First, let's find your personal account ID
DO $$
DECLARE
    v_account_id UUID;
BEGIN
    -- Get the personal account for the current user
    SELECT id INTO v_account_id
    FROM public.accounts
    WHERE primary_owner_user_id = auth.uid()
    AND is_personal_account = true
    LIMIT 1;

    -- If no personal account found, try to get any account the user has access to
    IF v_account_id IS NULL THEN
        SELECT account_id INTO v_account_id
        FROM public.accounts_memberships
        WHERE user_id = auth.uid()
        LIMIT 1;
    END IF;

    -- If we found an account, create the test data
    IF v_account_id IS NOT NULL THEN
        -- Create a test course
        INSERT INTO public.courses (
            id,
            account_id,
            title,
            description,
            is_published,
            created_by
        ) VALUES (
            'f47ac10b-58cc-4372-a567-0e02b2c3d485', -- This matches the mock course UUID in lesson-editor.tsx
            v_account_id, -- Use the real account ID
            'Test Course for Video Upload',
            'This is a test course for testing video upload functionality',
            true,
            auth.uid()
        )
        ON CONFLICT (id) DO UPDATE SET
            account_id = v_account_id; -- Update the account_id if the course already exists

        -- Create a test module
        INSERT INTO public.course_modules (
            id,
            course_id,
            title,
            description,
            order_index,
            created_by
        ) VALUES (
            'f47ac10b-58cc-4372-a567-0e02b2c3d479', -- This matches the mock module UUID
            'f47ac10b-58cc-4372-a567-0e02b2c3d485',
            'Getting Started',
            'Introduction to the fundamentals',
            1,
            auth.uid()
        )
        ON CONFLICT (id) DO NOTHING;

        -- Create test lessons that match the mock UUIDs in course-editor.tsx
        INSERT INTO public.lessons (
            id,
            module_id,
            title,
            description,
            content_type,
            order_index,
            is_final_quiz,
            created_by
        ) VALUES 
        (
            'f47ac10b-58cc-4372-a567-0e02b2c3d480', -- First lesson UUID from mock data
            'f47ac10b-58cc-4372-a567-0e02b2c3d479',
            'Welcome to the Course',
            'Course overview and objectives',
            'video',
            1,
            false,
            auth.uid()
        ),
        (
            'f47ac10b-58cc-4372-a567-0e02b2c3d481', -- Second lesson UUID from mock data
            'f47ac10b-58cc-4372-a567-0e02b2c3d479',
            'Setting Up Your Environment',
            'Install necessary tools and software',
            'text',
            2,
            false,
            auth.uid()
        )
        ON CONFLICT (id) DO NOTHING;

        -- Create a second module
        INSERT INTO public.course_modules (
            id,
            course_id,
            title,
            description,
            order_index,
            created_by
        ) VALUES (
            'f47ac10b-58cc-4372-a567-0e02b2c3d482', -- Second module UUID from mock data
            'f47ac10b-58cc-4372-a567-0e02b2c3d485',
            'Core Concepts',
            'Learn the essential concepts',
            2,
            auth.uid()
        )
        ON CONFLICT (id) DO NOTHING;

        -- Create lessons for the second module
        INSERT INTO public.lessons (
            id,
            module_id,
            title,
            description,
            content_type,
            order_index,
            is_final_quiz,
            created_by
        ) VALUES 
        (
            'f47ac10b-58cc-4372-a567-0e02b2c3d483', -- Third lesson UUID from mock data
            'f47ac10b-58cc-4372-a567-0e02b2c3d482',
            'Understanding the Basics',
            'Fundamental concepts explained',
            'video',
            1,
            false,
            auth.uid()
        ),
        (
            'f47ac10b-58cc-4372-a567-0e02b2c3d484', -- Fourth lesson UUID from mock data
            'f47ac10b-58cc-4372-a567-0e02b2c3d482',
            'Knowledge Check',
            'Test your understanding',
            'quiz',
            2,
            false,
            auth.uid()
        )
        ON CONFLICT (id) DO NOTHING;

        RAISE NOTICE 'Test data created successfully for account ID: %', v_account_id;
    ELSE
        RAISE EXCEPTION 'No account found for the current user';
    END IF;
END $$;

-- Verify the data was created
SELECT 
    c.title as course_title,
    c.account_id,
    cm.title as module_title,
    l.id as lesson_id,
    l.title as lesson_title,
    l.content_type
FROM public.lessons l
JOIN public.course_modules cm ON cm.id = l.module_id
JOIN public.courses c ON c.id = cm.course_id
WHERE c.id = 'f47ac10b-58cc-4372-a567-0e02b2c3d485'
ORDER BY cm.order_index, l.order_index;