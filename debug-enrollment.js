const { createClient } = require('@supabase/supabase-js');

// Create admin client for debugging
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

async function debugEnrollment() {
  console.log('🔍 Debug: Checking enrollment system...');

  try {
    // 1. Check if test users exist
    console.log('\n📧 Checking test users...');
    const { data: users, error: usersError } = await adminClient
      .from('accounts')
      .select('id, email, name, is_personal_account')
      .eq('is_personal_account', true);

    if (usersError) {
      console.error('❌ Users query error:', usersError);
    } else {
      console.log('👥 Found users:', users?.map(u => ({ email: u.email, name: u.name })));
    }

    // 2. Check if course_enrollments table exists and its structure
    console.log('\n📋 Checking course_enrollments table...');
    const { data: enrollments, error: enrollError } = await adminClient
      .from('course_enrollments')
      .select('*')
      .limit(1);

    if (enrollError) {
      console.error('❌ Enrollments table error:', enrollError);
      
      // Try alternative table name
      console.log('🔄 Trying course_progress table...');
      const { data: progress, error: progressError } = await adminClient
        .from('course_progress')
        .select('*')
        .limit(1);
        
      if (progressError) {
        console.error('❌ Course_progress table error:', progressError);
      } else {
        console.log('✅ course_progress table exists with structure:', Object.keys(progress?.[0] || {}));
      }
    } else {
      console.log('✅ course_enrollments table exists with structure:', Object.keys(enrollments?.[0] || {}));
    }

    // 3. Check courses
    console.log('\n📚 Checking courses...');
    const { data: courses, error: coursesError } = await adminClient
      .from('courses')
      .select('id, title, is_published')
      .eq('is_published', true);

    if (coursesError) {
      console.error('❌ Courses error:', coursesError);
    } else {
      console.log('📖 Published courses:', courses?.map(c => ({ title: c.title, id: c.id })));
    }

    // 4. Try to find learner@test.com specifically
    console.log('\n🔍 Looking for learner@test.com...');
    const { data: testUser, error: testUserError } = await adminClient.auth.admin.getUserByEmail('learner@test.com');
    
    if (testUserError) {
      console.error('❌ Test user not found:', testUserError);
      console.log('💡 You need to either:');
      console.log('   1. Apply the LMS test users seed file');
      console.log('   2. Create a new user account for testing');
    } else {
      console.log('✅ Test user found:', testUser.user?.email);
    }

  } catch (error) {
    console.error('💥 Debug script error:', error);
  }
}

debugEnrollment();