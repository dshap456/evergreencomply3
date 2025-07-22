const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client for debugging
const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Create admin client to bypass RLS for debugging
const adminClient = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function debugCourseUpdate() {
  console.log('🔍 Debug: Testing course update permissions...');

  try {
    // 1. Check if we can connect to the database using admin client
    const { data: courses, error: coursesError } = await adminClient
      .from('courses')
      .select('id, title, account_id, is_published')
      .limit(1);

    if (coursesError) {
      console.error('❌ Cannot connect to courses table:', coursesError);
      return;
    }

    console.log('✅ Connected to database. Found courses:', courses?.length || 0);

    if (!courses || courses.length === 0) {
      console.log('ℹ️ No courses found to test with');
      return;
    }

    const testCourse = courses[0];
    console.log('📝 Testing with course:', testCourse);

    // 2. Check role permissions table
    const { data: permissions, error: permError } = await adminClient
      .from('role_permissions')
      .select('role, permission');

    if (permError) {
      console.error('❌ Cannot read role_permissions:', permError);
    } else {
      console.log('📋 Current role permissions:', permissions);
    }

    // 3. Check if the test account exists and has proper memberships
    const { data: memberships, error: memberError } = await adminClient
      .from('accounts_memberships')
      .select('user_id, account_id, account_role')
      .eq('account_id', testCourse.account_id);

    if (memberError) {
      console.error('❌ Cannot read memberships:', memberError);
    } else {
      console.log('👥 Account memberships for course account:', memberships);
    }

    // 4. Test the has_permission function directly
    if (memberships && memberships.length > 0) {
      const testUser = memberships[0].user_id;
      console.log(`🧪 Testing has_permission for user ${testUser}...`);

      const { data: hasPermission, error: hasPermError } = await adminClient
        .rpc('has_permission', {
          user_id: testUser,
          account_id: testCourse.account_id,
          permission_name: 'settings.manage'
        });

      if (hasPermError) {
        console.error('❌ has_permission function error:', hasPermError);
      } else {
        console.log('🔐 has_permission result:', hasPermission);
      }
    }

  } catch (error) {
    console.error('💥 Debug script error:', error);
  }
}

debugCourseUpdate();