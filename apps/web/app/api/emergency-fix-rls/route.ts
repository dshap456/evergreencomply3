import { NextResponse } from 'next/server';

export async function GET() {
  const emergencySQL = `
-- EMERGENCY FIX: Complete reset of courses RLS policies
-- Step 1: Disable RLS temporarily
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies (use CASCADE to force)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'courses'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.courses CASCADE', pol.policyname);
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Step 4: Create ONE simple policy for super admins first
CREATE POLICY "courses_super_admin_only" ON public.courses
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.accounts 
            WHERE accounts.id = courses.account_id 
            AND accounts.primary_owner_user_id = auth.uid()
        )
        OR
        public.is_super_admin()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM public.accounts 
            WHERE accounts.id = courses.account_id 
            AND accounts.primary_owner_user_id = auth.uid()
        )
        OR
        public.is_super_admin()
    );

-- Step 5: Verify the fix
SELECT 
    'Policies after fix:' as status,
    COUNT(*) as policy_count 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'courses';
`;

  return NextResponse.json({
    message: "Copy and run this EMERGENCY SQL in your Supabase SQL Editor",
    sql: emergencySQL,
    instructions: [
      "1. Go to Supabase SQL Editor",
      "2. Copy the entire SQL below",
      "3. Run it",
      "4. Then check if courses load"
    ]
  });
}