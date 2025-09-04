#!/usr/bin/env node

/**
 * Test script to verify course progress tracking fixes
 * Run this after applying migrations to verify the fixes work correctly
 */

const { createClient } = require('@supabase/supabase-js');

// Get these from your .env.local file
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';
const TEST_USER_EMAIL = 'test@example.com'; // Change to a test user email
const TEST_USER_PASSWORD = 'test123456'; // Change to test user password

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTests() {
  console.log('🧪 Testing Course Progress Fixes...\n');

  try {
    // 1. Sign in as test user
    console.log('1️⃣ Signing in as test user...');
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });

    if (authError) {
      console.error('❌ Auth failed:', authError.message);
      return;
    }
    console.log('✅ Signed in as:', user.email);

    // 2. Get user's enrolled courses
    console.log('\n2️⃣ Fetching enrolled courses...');
    const { data: enrollments, error: enrollError } = await supabase
      .from('course_enrollments')
      .select(`
        id,
        course_id,
        progress_percentage,
        courses!inner (
          title
        )
      `)
      .eq('user_id', user.id);

    if (enrollError) {
      console.error('❌ Failed to fetch enrollments:', enrollError.message);
      return;
    }

    if (!enrollments || enrollments.length === 0) {
      console.log('⚠️ No course enrollments found for this user');
      return;
    }

    console.log(`✅ Found ${enrollments.length} enrolled courses`);
    
    const testCourse = enrollments[0];
    console.log(`   Testing with: "${testCourse.courses.title}"`);
    console.log(`   Current progress: ${testCourse.progress_percentage}%`);

    // 3. Test language-specific progress
    console.log('\n3️⃣ Testing language-specific progress tracking...');
    
    // Get lessons for English
    const { data: enLessons, error: enError } = await supabase
      .from('lessons')
      .select(`
        id,
        title,
        course_modules!inner (
          course_id,
          language
        )
      `)
      .eq('course_modules.course_id', testCourse.course_id)
      .eq('course_modules.language', 'en')
      .limit(1);

    if (enLessons && enLessons.length > 0) {
      console.log(`   Found English lesson: "${enLessons[0].title}"`);
      
      // Check progress for English
      const { data: enProgress } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('lesson_id', enLessons[0].id)
        .eq('language', 'en')
        .single();
      
      console.log(`   English progress:`, enProgress ? enProgress.status : 'Not started');
    }

    // Get lessons for Spanish
    const { data: esLessons } = await supabase
      .from('lessons')
      .select(`
        id,
        title,
        course_modules!inner (
          course_id,
          language
        )
      `)
      .eq('course_modules.course_id', testCourse.course_id)
      .eq('course_modules.language', 'es')
      .limit(1);

    if (esLessons && esLessons.length > 0) {
      console.log(`   Found Spanish lesson: "${esLessons[0].title}"`);
      
      // Check progress for Spanish
      const { data: esProgress } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('lesson_id', esLessons[0].id)
        .eq('language', 'es')
        .single();
      
      console.log(`   Spanish progress:`, esProgress ? esProgress.status : 'Not started');
    }

    // 4. Test last_accessed timestamps
    console.log('\n4️⃣ Checking last_accessed timestamps...');
    const { data: recentProgress, error: progressError } = await supabase
      .from('lesson_progress')
      .select('lesson_id, last_accessed, updated_at, language')
      .eq('user_id', user.id)
      .order('last_accessed', { ascending: false })
      .limit(5);

    if (recentProgress && recentProgress.length > 0) {
      console.log('   Recent lesson accesses:');
      recentProgress.forEach((p, i) => {
        console.log(`   ${i + 1}. Language: ${p.language}, Last accessed: ${p.last_accessed || p.updated_at}`);
      });
      
      // Check if timestamps are unique (not all the same)
      const uniqueTimestamps = new Set(recentProgress.map(p => p.last_accessed)).size;
      if (uniqueTimestamps === 1 && recentProgress.length > 1) {
        console.log('   ⚠️ WARNING: All last_accessed timestamps are the same! Migration may be needed.');
      } else {
        console.log('   ✅ Timestamps are properly distributed');
      }
    }

    // 5. Test the RPC function
    console.log('\n5️⃣ Testing update_course_progress RPC function...');
    if (enLessons && enLessons.length > 0) {
      const { error: rpcError } = await supabase.rpc('update_course_progress', {
        p_user_id: user.id,
        p_lesson_id: enLessons[0].id,
        p_language: 'en'
      });

      if (rpcError) {
        console.error('   ❌ RPC function failed:', rpcError.message);
        console.log('   ℹ️ Make sure the migration has been applied to add language parameter');
      } else {
        console.log('   ✅ RPC function executed successfully with language parameter');
      }
    }

    console.log('\n✨ Test complete! If you see any errors above, the migrations may need to be applied.');
    console.log('Run: npx supabase db push to apply the migrations');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
console.log('=====================================');
console.log('Course Progress Fix Verification Test');
console.log('=====================================\n');

if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
  console.error('⚠️ Please update the SUPABASE_URL and SUPABASE_ANON_KEY in this script');
  console.error('You can find these values in your .env.local file');
  process.exit(1);
}

runTests().then(() => {
  console.log('\n=====================================');
  process.exit(0);
});