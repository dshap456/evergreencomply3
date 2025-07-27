import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET() {
  try {
    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user } } = await client.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Get user's account
    const { data: account } = await client
      .from('accounts')
      .select('id')
      .eq('primary_owner_user_id', user.id)
      .single();
    
    if (!account) {
      return NextResponse.json({ error: 'No account found' }, { status: 400 });
    }
    
    // Create a test course
    const { data: course, error } = await client
      .from('courses')
      .insert({
        account_id: account.id,
        title: 'Test Course - ' + new Date().toISOString(),
        description: 'This is a test course created to verify the system is working',
        status: 'published',
        sequential_completion: false,
        passing_score: 80,
        created_by: user.id,
        updated_by: user.id
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ 
        error: error.message,
        details: error
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      course,
      message: 'Test course created successfully!'
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack
    }, { status: 500 });
  }
}