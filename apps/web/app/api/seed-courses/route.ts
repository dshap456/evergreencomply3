import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET() {
  const supabase = getSupabaseServerAdminClient();
  
  try {
    // First, get the first account to use as the owner of public courses
    const { data: accounts, error: accountError } = await supabase
      .from('accounts')
      .select('id, name')
      .limit(1);
      
    if (accountError || !accounts || accounts.length === 0) {
      return NextResponse.json({ 
        error: 'No accounts found. Please create an account first.',
        accountError 
      }, { status: 400 });
    }
    
    const accountId = accounts[0].id;
    console.log('Using account:', accounts[0]);
    
    // Define the courses that match our frontend
    const coursesToCreate = [
      {
        account_id: accountId,
        title: 'DOT HAZMAT General Awareness Training',
        slug: 'dot-hazmat',
        sku: 'DOT-HAZMAT-001',
        description: 'Essential training for employees involved in handling or shipping hazardous materials.',
        price: 79.00,
        is_published: true,
        sequential_completion: true,
        passing_score: 80
      },
      {
        account_id: accountId,
        title: 'Advanced HAZMAT Training',
        slug: 'advanced-hazmat',
        sku: 'ADV-HAZMAT-001',
        description: 'Comprehensive advanced training for hazardous materials handling and compliance.',
        price: 129.00,
        is_published: true,
        sequential_completion: true,
        passing_score: 85
      },
      {
        account_id: accountId,
        title: 'EPA RCRA Training',
        slug: 'epa-rcra',
        sku: 'EPA-RCRA-001',
        description: 'Complete EPA RCRA compliance training for waste management professionals.',
        price: 99.00,
        is_published: true,
        sequential_completion: true,
        passing_score: 80
      }
    ];
    
    // Insert courses (upsert to avoid duplicates)
    const results = [];
    for (const course of coursesToCreate) {
      const { data, error } = await supabase
        .from('courses')
        .upsert(course, { 
          onConflict: 'slug',
          ignoreDuplicates: false 
        })
        .select();
        
      results.push({ course: course.title, data, error });
    }
    
    // Get all courses to verify
    const { data: allCourses } = await supabase
      .from('courses')
      .select('*')
      .order('title');
    
    return NextResponse.json({
      message: 'Course seeding complete',
      accountUsed: accounts[0],
      results,
      allCoursesAfterSeeding: allCourses
    });
    
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}