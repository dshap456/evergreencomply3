-- Fix the team_course_enrollments view to properly join accounts table
-- The issue: was joining users.id = accounts.id, but should be accounts.primary_owner_user_id = users.id

CREATE OR REPLACE VIEW public.team_course_enrollments AS
SELECT 
    ce.id,
    ce.user_id,
    ce.course_id,
    ce.account_id,
    ce.enrolled_at,
    ce.completed_at,
    ce.progress_percentage,
    ce.final_score,
    u.email as user_email,
    COALESCE(acc.name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as user_name,
    c.title as course_title,
    CASE 
        WHEN ce.invited_by IS NOT NULL THEN 'invited'
        ELSE 'self_enrolled'
    END as enrollment_type,
    inv.email as inviter_email
FROM public.course_enrollments ce
JOIN auth.users u ON ce.user_id = u.id
LEFT JOIN public.accounts acc ON u.id = acc.primary_owner_user_id AND acc.is_personal_account = true
JOIN public.courses c ON ce.course_id = c.id
LEFT JOIN auth.users inv ON ce.invited_by = inv.id
WHERE ce.account_id IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON public.team_course_enrollments TO authenticated;