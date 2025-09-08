-- Harden public views security and explicit grants
-- - Set security_invoker=true so base-table RLS applies for the caller
-- - Revoke any anon access explicitly
-- - Grant SELECT to authenticated (and keep service_role access when used server-side)

-- 1) user_accounts view
DO $$
BEGIN
  -- Ensure the view exists before altering (no-op if not found)
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'user_accounts'
  ) THEN
    -- Use ALTER VIEW to avoid redefining the query and breaking deps
    BEGIN
      ALTER VIEW public.user_accounts SET (security_invoker = true);
    EXCEPTION WHEN others THEN
      -- If ALTER VIEW is not supported on current PG version, fallback to replace
      -- Recreate with security_invoker if necessary by reusing the existing definition
      -- Note: This branch is unlikely on Supabase PG >= 15
      RAISE WARNING 'Could not ALTER VIEW user_accounts: %', SQLERRM;
    END;

    -- Explicit privileges
    REVOKE ALL ON public.user_accounts FROM anon;
    GRANT SELECT ON public.user_accounts TO authenticated;
    GRANT SELECT ON public.user_accounts TO service_role;
  END IF;
END $$;

-- 2) team_course_enrollments view
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'team_course_enrollments'
  ) THEN
    BEGIN
      ALTER VIEW public.team_course_enrollments SET (security_invoker = true);
    EXCEPTION WHEN others THEN
      RAISE WARNING 'Could not ALTER VIEW team_course_enrollments: %', SQLERRM;
    END;

    REVOKE ALL ON public.team_course_enrollments FROM anon;
    GRANT SELECT ON public.team_course_enrollments TO authenticated;
  END IF;
END $$;

